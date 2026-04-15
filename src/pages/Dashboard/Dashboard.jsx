// BASIC
import React, { useState, useEffect } from 'react';
// API
import { subscribeWallets } from '../../api/wallets';
import { subscribeFixedExpenses } from '../../api/fixedExpenses';
import { subscribeFixedEntries } from '../../api/fixedEntries';
// COMPONENTS
import FixedExpenses from '../../components/FixedExpenses/FixedExpenses';
import ChartExpensesCategory from '../../components/Charts/ChartExpensesCategory';
import ChartCreditLimit from '../../components/Charts/ChartCreditLimit';
import FixedEntries from '../../components/FixedEntries/FixedEntries';
// CSS
import './Dashboard.css';
import '../../shared.css';

const Dashboard = () => {
  // Estados
  const [totalBalance, setTotalBalance] = useState(0); // Saldo total das carteiras
  const [isEntriesModalOpen, setIsEntriesModalOpen] = useState(false); // Modal de entradas fixas
  const [totalFixedEntries, setTotalFixedEntries] = useState(0); // Total de entradas fixas
  const [totalFixedExpenses, setTotalFixedExpenses] = useState(0); // Total de despesas fixas

  // 1. Busca Saldo Total (Wallets)
  useEffect(() => {
    const unsubscribe = subscribeWallets((wallets) => {
      const total = wallets.reduce((acc, w) => acc + Number(w.currentBalance || 0), 0);
      setTotalBalance(total);
    });
    return () => unsubscribe();
  }, []);

  // 2. Busca Total de Entradas Fixas
  useEffect(() => {
    const unsubscribe = subscribeFixedEntries((entries) => {
      const total = entries.reduce((acc, item) => acc + Number(item.value || 0), 0);
      setTotalFixedEntries(total);
    });
    return () => unsubscribe();
  }, []);

  // 3. Busca Total de Despesas Fixas
  useEffect(() => {
    const unsubscribe = subscribeFixedExpenses((expenses) => {
      const total = expenses.reduce((acc, item) => acc + Number(item.value || 0), 0);
      setTotalFixedExpenses(total);
    });
    return () => unsubscribe();
  }, []);

  // Cálculo da Previsão (Sobra)
  const predictionValue = totalFixedEntries - totalFixedExpenses;

  return (
    <div className='dashboard-container container'>

      <div className="dashboard-header header-container">
        <div className="header-left">
          <h1 className='page-title'>Visão Geral</h1>
          <p className='page-subtitle'>Bem-vindos ao Couple Finance</p>

          <button
            className="btn-view-entries btn"
            onClick={() => setIsEntriesModalOpen(true)}
          >
            Ver Entradas Fixas
          </button>
        </div>

        <div className="header-cards">

          <div className="dashboard-card prediction-card">
            <span>Previsão (Fixos)</span>
            {/* Condicional: Se for negativo, fica vermelho, senão, fica azul */}
            <strong style={{ color: predictionValue >= 0 ? '#2e4761ff' : '#c0392b' }}>
              {predictionValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>

          <div className="dashboard-card balance-card">
            <span>Saldo Disponível</span>
            <strong>
              {totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>
        </div>
      </div>

      <div className="dashboard-grid page-container">
        <FixedExpenses />
        <ChartExpensesCategory />
        <ChartCreditLimit />
      </div>

      <FixedEntries
        isOpen={isEntriesModalOpen}
        onClose={() => setIsEntriesModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;