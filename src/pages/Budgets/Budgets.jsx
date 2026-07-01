import React, { useState, useEffect } from 'react';
import { fetchWallets } from '../../api/wallets';
import { fetchCards, fetchCardsShopping } from '../../api/cards';
import { fetchExpenseTransactions } from '../../api/transactions';
import { fetchBudgetsByMonth, saveBudgetLimit } from '../../api/budgets';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CurrencyInput from '../../components/CurrencyInput/CurrencyInput';
import './Budgets.css';
import '../../shared.css';

import { CATEGORIES, TRANSACTION_TYPES } from '../../utils/constants';

const getMonthKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (monthKey) => {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${monthNames[Number(month) - 1]} / ${year}`;
};

const Budgets = () => {
  const changeMonth = (direction) => {
    if (!currentMonth) return;
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    setCurrentMonth(getMonthKey(date));
  };

  const [loading, setLoading] = useState(true);

  // Filtros
  const [currentMonth, setCurrentMonth] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7)); // YYYY-MM
  const [selectedSource, setSelectedSource] = useState('all'); // 'all', walletID, ou cardID

  // Dados
  const [sources, setSources] = useState({ wallets: [], cards: [] });
  const [budgetLimits, setBudgetLimits] = useState({});
  const [spendingData, setSpendingData] = useState([]);

  // Modal de Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newLimit, setNewLimit] = useState('');

  // 1. Carrega as Fontes
  useEffect(() => {
    const fetchSources = async () => {
      const walletsData = await fetchWallets();
      const cardsData = await fetchCards();
      setSources({
        wallets: walletsData,
        cards: cardsData
      });
    };
    fetchSources();
  }, []);

  // 2. O Grande Carregamento de Dados
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // A. Busca Limites
      const limitsObj = await fetchBudgetsByMonth(currentMonth);
      setBudgetLimits(limitsObj);

      // B. Busca Gastos Reais
      const spendingWalletObj = {};
      const spendingCardObj = {};
      CATEGORIES[TRANSACTION_TYPES.SAIDA].forEach(cat => {
        spendingWalletObj[cat] = 0;
        spendingCardObj[cat] = 0;
      });

      // --- B1. Transações (Wallets) ---
      const isWalletFilter = sources.wallets.some(w => w.id === selectedSource);
      if (selectedSource === 'all' || isWalletFilter) {
        const transactions = await fetchExpenseTransactions();

        transactions.forEach(t => {
          if (t.category === 'Pagamento de Cartão') return;

          const tMonth = t.dateObj.toLocaleDateString('en-CA').slice(0, 7);

          if (tMonth === currentMonth) {
            if (selectedSource === 'all' || t.walletId === selectedSource) {
              const cat = t.category || 'Outros';
              if (spendingWalletObj[cat] !== undefined) spendingWalletObj[cat] += Number(t.value);
            }
          }
        });
      }

      // --- B2. Compras (Cartões) ---
      const isCardFilter = sources.cards.some(c => c.id === selectedSource);
      if (selectedSource === 'all' || isCardFilter) {
        const shoppingData = await fetchCardsShopping();

        shoppingData.forEach(c => {
          const filterTargetDate = c.dueDateObj || c.dateObj;
          const cMonth = filterTargetDate.toLocaleDateString('en-CA').slice(0, 7);

          if (cMonth === currentMonth) {
            if (selectedSource === 'all' || c.cardId === selectedSource) {
              const cat = c.category || 'Outros';
              if (spendingCardObj[cat] !== undefined) spendingCardObj[cat] += Number(c.totalValue);
            }
          }
        });
      }

      // C. Monta array final
      const finalData = CATEGORIES[TRANSACTION_TYPES.SAIDA].map(cat => {
        const limit = limitsObj[cat] || 0;
        const spentWallet = spendingWalletObj[cat] || 0;
        const spentCard = spendingCardObj[cat] || 0;
        const spent = spentWallet + spentCard;
        
        let percent = 0;
        if (limit > 0) {
          percent = (spent / limit) * 100;
        }

        return {
          name: cat,
          spentWallet,
          spentCard,
          spent,
          limit,
          percent,
          remaining: limit - spent
        };
      });

      setSpendingData(finalData);
      setLoading(false);
    };

    if (sources.wallets.length > 0 || sources.cards.length > 0) {
      fetchData();
    }
  }, [currentMonth, selectedSource, sources]);

  // Salvar novo limite
  const handleSaveLimit = async () => {
    if (!editingCategory) return;

    try {
      await saveBudgetLimit(currentMonth, editingCategory, newLimit);

      setBudgetLimits(prev => ({ ...prev, [editingCategory]: Number(newLimit) }));
      setSpendingData(prev => prev.map(item => {
        if (item.name === editingCategory) {
          const val = Number(newLimit);
          return { ...item, limit: val, percent: val > 0 ? (item.spent / val) * 100 : 0 };
        }
        return item;
      }));

      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
    }
  };

  const openEdit = (category, currentLimit) => {
    setEditingCategory(category);
    setNewLimit(currentLimit || '');
    setIsEditModalOpen(true);
  };

  return (
    <div className="budgets-container container">
      <div className="budgets-header header-container">
        <div className="header-left">
          <h1 className="page-title">Metas e Orçamentos</h1>
          <p className="page-subtitle">Planeje seus limites (Considerando vencimento da fatura)</p>
        </div>

        <div className="budgets-filters">
          <div className="month-nav">
            <button onClick={() => changeMonth(-1)} className="month-nav-btn">◀</button>
            <span className="month-label">{formatMonthLabel(currentMonth)}</span>
            <button onClick={() => changeMonth(1)} className="month-nav-btn">▶</button>
          </div>
          <select
            value={selectedSource}
            onChange={e => setSelectedSource(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todas as Fontes</option>
            <optgroup label="Carteiras / Contas">
              {sources.wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </optgroup>
            <optgroup label="Cartões de Crédito">
              {sources.cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="budgets-chart-section">
        <h3>Panorama Geral</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={spendingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="spentWallet" stackId="a" name="Gasto Carteira" fill="#8884d8" radius={[0, 0, 4, 4]} />
              <Bar dataKey="spentCard" stackId="a" name="Gasto Cartão" fill="#c3b8ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="limit" name="Meta Definida" fill="#82ca9d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="budgets-list">
        {spendingData.map((item) => {
          let progressColor = '#2ecc71';
          if (item.percent > 75) progressColor = '#f1c40f';
          if (item.percent >= 100) progressColor = '#e74c3c';

          return (
            <div key={item.name} className="budget-card" onClick={() => openEdit(item.name, item.limit)}>
              <div className="budget-card-header">
                <span className="cat-name">{item.name}</span>
                <span className="cat-values">
                  <strong>{item.spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  {' / '}
                  <small>{item.limit > 0 ? item.limit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Sem meta'}</small>
                </span>
              </div>

              <div className="progress-bg">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(item.percent, 100)}%`,
                    backgroundColor: progressColor
                  }}
                ></div>
              </div>

              <div className="budget-status">
                {item.limit > 0 ? (
                  item.remaining >= 0
                    ? <span style={{ color: '#7f8c8d' }}>Resta: R$ {item.remaining.toFixed(2)}</span>
                    : <span style={{ color: '#c0392b', fontWeight: 'bold' }}>Excedeu: R$ {Math.abs(item.remaining).toFixed(2)}</span>
                ) : (
                  <span className="set-goal-text">Definir Meta +</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '300px' }}>
            <h3>Meta: {editingCategory}</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>Defina o teto de gastos para {currentMonth}</p>

            <CurrencyInput
              value={newLimit}
              onChange={e => setNewLimit(e.target.value)}
              placeholder="R$ 0,00"
              className="budget-input" // Adicionei classe para facilitar se quiser customizar mais
            />

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
              <button className="save-btn" onClick={handleSaveLimit}>Salvar Meta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;