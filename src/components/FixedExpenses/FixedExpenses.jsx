import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import CurrencyInput from '../CurrencyInput/CurrencyInput';
import './FixedExpenses.css';
import FixedExpensePayModal from '../FixedExpensesPayModal/FixedExpensesPayModal'; // Importe o Modal

const FixedExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [newItem, setNewItem] = useState({ description: '', value: '' });

  // Estado para controlar o modal de pagamento
  const [payModalOpen, setPayModalOpen] = useState(false);

  // Estado para rastrear despesas já pagas no mês atual
  const [paidExpenses, setPaidExpenses] = useState(new Set());
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.FIXED_EXPENSES), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

      // Padrão do projeto: apenas UM where no Firestore, resto filtra no JS
      const q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where('type', '==', 'saida')
      );

      const snapshot = await getDocs(q);
      const paidNames = new Set();

      snapshot.docs.forEach(doc => {
        const t = doc.data();
        // Filtra por categoria 'Contas' no JS
        if (t.category !== 'Contas') return;

        // Filtra pelo mês atual no JS
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        const tMonth = tDate.toISOString().slice(0, 7);

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
      await addDoc(collection(db, COLLECTIONS.FIXED_EXPENSES), {
        description: newItem.description,
        value: Number(newItem.value)
      });
      setNewItem({ description: '', value: '' });
    } catch (error) {
      console.error("Erro ao adicionar:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.FIXED_EXPENSES, id));
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