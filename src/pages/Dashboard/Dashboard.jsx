// BASIC
import React, { useState, useEffect } from 'react';
// API
import { subscribeWallets } from '../../api/wallets';
import { subscribeFixedExpenses } from '../../api/fixedExpenses';
import { subscribeFixedEntries } from '../../api/fixedEntries';
import { subscribeTransactions } from '../../api/transactions';
import { subscribeCardsShopping } from '../../api/cards';
// COMPONENTS
import FixedExpenses from '../../components/FixedExpenses/FixedExpenses';
import ChartExpensesCategory from '../../components/Charts/ChartExpensesCategory';
import ChartCreditLimit from '../../components/Charts/ChartCreditLimit';
import FixedEntries from '../../components/FixedEntries/FixedEntries';
import DashboardCard from '../../components/DashboardCard/DashboardCard';
// CSS
import './Dashboard.css';
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

const Dashboard = ({ onNavigate }) => {
  // Estados
  const [totalBalance, setTotalBalance] = useState(0); // Saldo total das carteiras
  const [isEntriesModalOpen, setIsEntriesModalOpen] = useState(false); // Modal de entradas fixas
  const [totalFixedEntries, setTotalFixedEntries] = useState(0); // Total de entradas fixas
  const [totalFixedExpenses, setTotalFixedExpenses] = useState(0); // Total de despesas fixas
  const [expenses, setExpenses] = useState([]); // Lista de despesas fixas
  const [paidExpenses, setPaidExpenses] = useState(new Set()); // Despesas pagas no mês

  // 1. Busca Saldo Total (Wallets)
  useEffect(() => {
    const unsubscribe = subscribeWallets((wallets) => {
      const total = wallets
        .filter(w => w.type !== 'vale_alimentacao')
        .reduce((acc, w) => acc + Number(w.currentBalance || 0), 0);
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
    const unsubscribe = subscribeFixedExpenses((data) => {
      const total = data.reduce((acc, item) => acc + Number(item.value || 0), 0);
      setTotalFixedExpenses(total);
      setExpenses(data);
    });
    return () => unsubscribe();
  }, []);

  // 4. Escuta transações em tempo real para detectar despesas pagas
  const [paidTransactions, setPaidTransactions] = useState([]);
  useEffect(() => {
    const unsubscribe = subscribeTransactions((transactions) => {
      setPaidTransactions(transactions);
    });
    return () => unsubscribe();
  }, []);

  // 5. Escuta compras no cartão em tempo real para detectar despesas pagas
  const [paidCardPurchases, setPaidCardPurchases] = useState([]);
  useEffect(() => {
    const unsubscribe = subscribeCardsShopping((purchases) => {
      setPaidCardPurchases(purchases);
    });
    return () => unsubscribe();
  }, []);

  // 6. Reconstrói o Set de despesas pagas sempre que transações ou compras mudam
  useEffect(() => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-CA').slice(0, 7);
    const paidNames = new Set();
    const fixedExpenseNames = new Set(expenses.map(e => cleanDescription(e.description)));

    // Verifica transações normais (pagamento via carteira ou pagamento de cartão)
    paidTransactions.forEach(t => {
      const cleanDesc = cleanDescription(t.description);
      if (!fixedExpenseNames.has(cleanDesc)) return;
      const tMonth = t.dateObj.toLocaleDateString('en-CA').slice(0, 7);
      if (tMonth === currentMonth) {
        paidNames.add(cleanDesc);
      }
    });

    // Verifica compras no cartão (pagamento via cartão de crédito)
    paidCardPurchases.forEach(p => {
      const cleanDesc = cleanDescription(p.description);
      if (!fixedExpenseNames.has(cleanDesc)) return;
      // Só considera paga se o status for 'pago' (independente do número de parcelas)
      if (p.status !== 'pago') return;
      const filterDate = p.dueDateObj || p.dateObj;
      const pMonth = filterDate.toLocaleDateString('en-CA').slice(0, 7);
      if (pMonth === currentMonth) {
        paidNames.add(cleanDesc);
      }
    });

    setPaidExpenses(paidNames);
  }, [paidTransactions, paidCardPurchases, expenses]);


  // Cálculo da Previsão (Sobra)
  const predictionValue = totalFixedEntries - totalFixedExpenses;

  // Cálculo da Previsão Mensal: Saldo - despesas fixas ainda não pagas no mês
  const unpaidTotal = expenses
    .filter(item => !paidExpenses.has(cleanDescription(item.description)))
    .reduce((acc, item) => acc + Number(item.value || 0), 0);
  const monthlyForecast = totalBalance - unpaidTotal;

  return (
    <div className='dashboard-container container'>

      <div className="dashboard-header header-container">
        <div className="header-left">
          <h1 className='page-title'>Visão Geral</h1>
          <p className='page-subtitle'>Bem-vindos ao My Finance</p>

          <button
            className="btn-view-entries btn"
            onClick={() => setIsEntriesModalOpen(true)}
          >
            Ver Entradas Fixas
          </button>
        </div>

        <div className="header-cards">
          <DashboardCard
            label="Previsão Mensal"
            value={monthlyForecast}
            variant="forecast"
            className={monthlyForecast >= 0 ? 'forecast-positive' : 'forecast-negative'}
          />

          <DashboardCard
            label="Previsão (Fixos)"
            value={predictionValue}
            variant="prediction"
            valueStyle={{ color: predictionValue >= 0 ? '#2e4761ff' : '#c0392b' }}
          />

          <DashboardCard
            label="Saldo Disponível"
            value={totalBalance}
            variant="balance"
          />
        </div>
      </div>

      <div className="dashboard-grid page-container">
        <FixedExpenses onNavigate={onNavigate} />
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