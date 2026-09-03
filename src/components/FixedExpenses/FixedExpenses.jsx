// BASIC
import React, { useState, useEffect } from 'react';
// API
import { subscribeFixedExpenses, addFixedExpense, updateFixedExpense, removeFixedExpense } from '../../api/fixedExpenses';
import { fetchExpenseTransactions } from '../../api/transactions';
import { fetchCardsShopping } from '../../api/cards';
// COMPONENTS
import CurrencyInput from '../CurrencyInput/CurrencyInput';
import FixedExpensePayModal from '../FixedExpensesPayModal/FixedExpensesPayModal';
// CSS
import './FixedExpenses.css';
import '../../shared.css';

// Helper para normalizar e limpar as descrições (remove prefixos e sufixos de parcelas)
const cleanDescription = (desc) => {
  if (!desc) return '';
  return desc
    .replace(/^Pagamento Cartão:\s*/i, '') // Remove o prefixo de pagamento de cartão
    .replace(/\s*\(\d+\/\d+\)$/, '')       // Remove o sufixo de parcelas (ex: (1/12))
    .trim()
    .toLowerCase();
};

// Retorna o status de urgência com base no dia de vencimento e se já foi pago no mês
const getFixedExpenseStatus = (dueDay, isPaid) => {
  if (isPaid) return 'completed';
  if (!dueDay || isNaN(Number(dueDay))) return null;

  const today = new Date();
  const currentDay = today.getDate();
  const due = Number(dueDay);

  const diffDays = due - currentDay;

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'soon';
  return 'future';
};

const FixedExpenses = ({ onNavigate }) => {
  // Estado das despesas fixas
  const [expenses, setExpenses] = useState([]);
  // Estado do novo item
  const [newItem, setNewItem] = useState({ description: '', value: '', dueDay: '' });
  // Estado para controlar o modal de pagamento
  const [payModalOpen, setPayModalOpen] = useState(false);
  // Estado para rastrear despesas já pagas no mês atual
  const [paidExpenses, setPaidExpenses] = useState(new Set());
  // Estado para selecionar a despesa para pagamento
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Estados para edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDueDay, setEditDueDay] = useState('');

  // Busca as despesas fixas
  useEffect(() => {
    const unsubscribe = subscribeFixedExpenses((data) => {
      // Ordena o array antes de salvar no estado
      data.sort((a, b) => a.description.localeCompare(b.description));
      setExpenses(data);
    });

    return () => unsubscribe();
  }, []);

  // Busca transações do mês atual para verificar quais despesas já foram pagas
  useEffect(() => {
    const fetchPaidExpenses = async () => {
      const now = new Date();
      const currentMonth = now.toLocaleDateString('en-CA').slice(0, 7); // YYYY-MM

      const paidNames = new Set();
      const fixedExpenseNames = new Set(expenses.map(e => cleanDescription(e.description)));

      // 1. Verifica transações normais (pagamento via carteira ou pagamento de cartão)
      const transactions = await fetchExpenseTransactions();
      transactions.forEach(t => {
        const cleanDesc = cleanDescription(t.description);
        if (!fixedExpenseNames.has(cleanDesc)) return;
        const tMonth = t.dateObj.toLocaleDateString('en-CA').slice(0, 7);
        if (tMonth === currentMonth) {
          paidNames.add(cleanDesc);
        }
      });

      // 2. Verifica compras no cartão (pagamento via cartão de crédito)
      const cardPurchases = await fetchCardsShopping();
      cardPurchases.forEach(p => {
        const cleanDesc = cleanDescription(p.description);
        if (!fixedExpenseNames.has(cleanDesc)) return;
        // Só consideramos paga se o status da compra no cartão for 'pago'.
        if (p.status !== 'pago') return;
        const filterDate = p.dueDateObj || p.dateObj;
        const pMonth = filterDate.toLocaleDateString('en-CA').slice(0, 7);
        if (pMonth === currentMonth) {
          paidNames.add(cleanDesc);
        }
      });

      setPaidExpenses(paidNames);
    };

    fetchPaidExpenses();
  }, [payModalOpen, expenses]); // Re-busca quando o modal fecha (após pagar) ou despesas mudam


  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.description || !newItem.value) return;

    try {
      await addFixedExpense(newItem);
      setNewItem({ description: '', value: '', dueDay: '' });
    } catch (error) {
      console.error("Erro ao adicionar:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remover esta despesa fixa?")) {
      try {
        await removeFixedExpense(id);
      } catch (error) {
        console.error("Erro ao deletar:", error);
      }
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditDescription(item.description);
    setEditValue(Number(item.value) || '');
    setEditDueDay(item.dueDay ? String(item.dueDay) : '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem || !editDescription || editValue === '') return;

    try {
      await updateFixedExpense(editingItem.id, {
        description: editDescription,
        value: editValue,
        dueDay: editDueDay ? Number(editDueDay) : null
      });
      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Erro ao atualizar despesa fixa:", error);
      alert("Erro ao salvar alterações na despesa fixa.");
    }
  };

  const totalPredicted = expenses.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
  const totalPending = expenses
    .filter(item => !paidExpenses.has(cleanDescription(item.description)))
    .reduce((acc, item) => acc + (Number(item.value) || 0), 0);

  // Abre o modal para o item específico ou redireciona para Cartões
  const openPayModal = (item) => {
    // Se a despesa veio do cartão, redireciona para a página de Cartões
    if (item.source === 'card' && onNavigate) {
      onNavigate('cards', { cardFilter: item.sourceCardId });
      return;
    }
    // Senão, abre o modal de pagamento normal
    setSelectedExpense(item);
    setPayModalOpen(true);
  };

  return (
    <div className="fixed-card">
      <div className="fixed-header">
        <h3>Despesas Fixas</h3>
        <div className="fixed-header-badges">
          <div className={`pending-badge ${totalPending === 0 ? 'all-paid' : ''}`}>
            <small>Pendente</small>
            <strong>
              {totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>
          <div className="predicted-badge">
            <small>Custo de Vida</small>
            <strong>
              {totalPredicted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>
        </div>
      </div>

      <div className="fixed-list">
        {expenses.map(item => {
          const isPaid = paidExpenses.has(cleanDescription(item.description));
          const status = getFixedExpenseStatus(item.dueDay, isPaid);

          return (
            <div key={item.id} className={`fixed-item ${isPaid ? 'expense-paid' : ''}`}>
              <div className="fixed-info">
                {status && (
                  <span
                    className={`dot-status dot-${status}`}
                    title={
                      status === 'completed'
                        ? 'Despesa paga este mês'
                        : status === 'overdue'
                        ? `Vencida no dia ${item.dueDay}`
                        : status === 'soon'
                        ? `Vence em breve (dia ${item.dueDay})`
                        : `Vence no dia ${item.dueDay}`
                    }
                  />
                )}
                {item.source === 'card' && <span className="card-source-badge" title="Vinculada ao cartão">💳</span>}
                <span className="fixed-description-text">{item.description}</span>
                {item.dueDay && <small className="fixed-due-tag">Dia {item.dueDay}</small>}
              </div>

              <div className="fixed-item-right">
                <strong>
                  {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>

                {/* BOTÃO EDITAR */}
                <button
                  className="btn-edit-fixed"
                  onClick={() => openEditModal(item)}
                  title="Editar despesa fixa"
                >
                  ✎
                </button>

                {/* BOTÃO GERAR/PAGAR */}
                <button
                  className="btn-generate-expense"
                  onClick={() => openPayModal(item)}
                  title="Gerar despesa deste mês"
                >
                  ▶
                </button>

                <button onClick={() => handleDelete(item.id)} className="btn-remove-fixed" title="Excluir despesa">&times;</button>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleAdd} className="fixed-form">
        <input
          type="text"
          placeholder="Nova despesa"
          value={newItem.description}
          onChange={e => setNewItem({ ...newItem, description: e.target.value })}
        />
        <CurrencyInput
          value={newItem.value}
          onChange={e => setNewItem({ ...newItem, value: e.target.value })}
          placeholder="R$"
        />
        <input
          type="number"
          min="1"
          max="31"
          placeholder="Dia"
          value={newItem.dueDay}
          onChange={e => setNewItem({ ...newItem, dueDay: e.target.value })}
          className="fixed-day-input"
          title="Dia de vencimento (opcional)"
        />
        <button type="submit" title="Adicionar">+</button>
      </form>

      {/* MODAL DE PAGAMENTO */}
      <FixedExpensePayModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        expenseItem={selectedExpense}
      />

      {/* MODAL DE EDIÇÃO */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content edit-fixed-expense-modal">
            <div className="modal-header">
              <h3>Editar Despesa Fixa</h3>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSaveEdit} className="edit-fixed-expense-form">
              <div className="form-group">
                <label>Nome / Descrição</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Nome da despesa"
                  required
                />
              </div>

              <div className="form-group">
                <label>Valor (R$)</label>
                <CurrencyInput
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="R$ 0,00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Dia de Vencimento (Opcional)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={editDueDay}
                  onChange={e => setEditDueDay(e.target.value)}
                  placeholder="Ex: 15 (opcional)"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="save-btn">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedExpenses;