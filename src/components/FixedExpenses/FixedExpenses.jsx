// BASIC
import React, { useState, useEffect } from 'react';
// API
import { subscribeFixedExpenses, addFixedExpense, removeFixedExpense } from '../../api/fixedExpenses';
import { fetchExpenseTransactions } from '../../api/transactions';
// COMPONENTS
import CurrencyInput from '../CurrencyInput/CurrencyInput';
import FixedExpensePayModal from '../FixedExpensesPayModal/FixedExpensesPayModal';
// CSS
import './FixedExpenses.css';
import '../../shared.css';

const FixedExpenses = () => {
  // Estado das despesas fixas
  const [expenses, setExpenses] = useState([]);
  // Estado do novo item
  const [newItem, setNewItem] = useState({ description: '', value: '' });
  // Estado para controlar o modal de pagamento
  const [payModalOpen, setPayModalOpen] = useState(false);
  // Estado para rastrear despesas já pagas no mês atual
  const [paidExpenses, setPaidExpenses] = useState(new Set());
  // Estado para selecionar a despesa
  const [selectedExpense, setSelectedExpense] = useState(null);

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
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

      const transactions = await fetchExpenseTransactions();
      const paidNames = new Set();

      transactions.forEach(t => {
        // Filtra por categoria 'Contas' no JS
        if (t.category !== 'Contas') return;

        // Filtra pelo mês atual no JS
        const tMonth = t.dateObj.toISOString().slice(0, 7);

        if (tMonth === currentMonth) {
          paidNames.add(t.description);
        }
      });

      setPaidExpenses(paidNames);
    };

    fetchPaidExpenses();
  }, [payModalOpen]); // Re-busca quando o modal fecha (após pagar)

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.description || !newItem.value) return;

    try {
      await addFixedExpense(newItem);
      setNewItem({ description: '', value: '' });
    } catch (error) {
      console.error("Erro ao adicionar:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await removeFixedExpense(id);
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  const totalPredicted = expenses.reduce((acc, item) => acc + (item.value || 0), 0);

  // Abre o modal para o item específico
  const openPayModal = (item) => {
    setSelectedExpense(item);
    setPayModalOpen(true);
  };

  return (
    <div className="fixed-card">
      <div className="fixed-header">
        <h3>Despesas Fixas</h3>
        <div className="predicted-badge">
          <small>Previsão Mensal</small>
          <strong>
            {totalPredicted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </strong>
        </div>
      </div>

      <div className="fixed-list">
        {expenses.map(item => {
          const isPaid = paidExpenses.has(item.description);
          return (
            <div key={item.id} className={`fixed-item ${isPaid ? 'expense-paid' : ''}`}>
              <div className="fixed-info">
                <span>{item.description}</span>
              </div>

              <div className="fixed-item-right">
                <strong>
                  {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>

                {/* BOTÃO GERAR/PAGAR */}
                <button
                  className="btn-generate-expense"
                  onClick={() => openPayModal(item)}
                  title="Gerar despesa deste mês"
                >
                  ▶
                </button>

                <button onClick={() => handleDelete(item.id)} className="btn-remove-fixed">&times;</button>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleAdd} className="fixed-form">
        <input
          type="text"
          placeholder="Nova despesa (ex: Internet)"
          value={newItem.description}
          onChange={e => setNewItem({ ...newItem, description: e.target.value })}
        />
        <CurrencyInput
          value={newItem.value}
          onChange={e => setNewItem({ ...newItem, value: e.target.value })}
          placeholder="R$"
        />
        <button type="submit">+</button>
      </form>

      {/* RENDERIZA O MODAL */}
      <FixedExpensePayModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        expenseItem={selectedExpense}
      />
    </div>
  );
};

export default FixedExpenses;