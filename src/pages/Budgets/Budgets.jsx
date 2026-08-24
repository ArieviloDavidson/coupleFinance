import React, { useState, useEffect } from 'react';
import { fetchWallets } from '../../api/wallets';
import { fetchCards, fetchCardsShopping } from '../../api/cards';
import { fetchExpenseTransactions } from '../../api/transactions';
import { fetchBudgets, saveBudgetLimit } from '../../api/budgets';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CurrencyInput from '../../components/CurrencyInput/CurrencyInput';
import CategoryExpensesModal from '../../components/CategoryExpensesModal/CategoryExpensesModal';
import DashboardCard from '../../components/DashboardCard/DashboardCard';
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
  const [totalMonthExpenses, setTotalMonthExpenses] = useState(0);
  const [rawTransactions, setRawTransactions] = useState([]);
  const [rawCardPurchases, setRawCardPurchases] = useState([]);

  // Modal de Edição de Meta
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newLimit, setNewLimit] = useState('');

  // Modal de Detalhamento de Gastos
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

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
      const limitsObj = await fetchBudgets();
      setBudgetLimits(limitsObj);

      // B. Busca Gastos Reais
      // Filtra Pagamento de Cartão (cartão entra diretamente) e Outros (exceções não orçadas)
      const budgetCategories = CATEGORIES[TRANSACTION_TYPES.SAIDA].filter(
        cat => cat !== 'Pagamento de Cartão' && cat !== 'Outros'
      );

      const spendingWalletObj = {};
      const spendingCardObj = {};
      budgetCategories.forEach(cat => {
        spendingWalletObj[cat] = 0;
        spendingCardObj[cat] = 0;
      });

      const transactions = await fetchExpenseTransactions();
      const shoppingData = await fetchCardsShopping();

      setRawTransactions(transactions);
      setRawCardPurchases(shoppingData);

      // --- B1. Transações (Wallets) para categorias ---
      const isWalletFilter = sources.wallets.some(w => w.id === selectedSource);
      if (selectedSource === 'all' || isWalletFilter) {
        transactions.forEach(t => {
          if (t.category === 'Pagamento de Cartão' || t.category === 'Transferência') return;

          const tMonth = t.dateObj.toLocaleDateString('en-CA').slice(0, 7);

          if (tMonth === currentMonth) {
            if (selectedSource === 'all' || t.walletId === selectedSource) {
              const cat = t.category || 'Outros';
              if (spendingWalletObj[cat] !== undefined) spendingWalletObj[cat] += Number(t.value);
            }
          }
        });
      }

      // --- B2. Compras (Cartões) para categorias ---
      const isCardFilter = sources.cards.some(c => c.id === selectedSource);
      if (selectedSource === 'all' || isCardFilter) {
        shoppingData.forEach(c => {
          // Apenas compras já pagas configuram gasto real
          if (c.status !== 'pago') return;

          const filterTargetDate = c.purchaseDateObj || c.dateObj;
          const cMonth = filterTargetDate.toLocaleDateString('en-CA').slice(0, 7);

          if (cMonth === currentMonth) {
            if (selectedSource === 'all' || c.cardId === selectedSource) {
              const cat = c.category || 'Outros';
              if (spendingCardObj[cat] !== undefined) spendingCardObj[cat] += Number(c.totalValue);
            }
          }
        });
      }

      // --- B3. Total de Saídas do Mês (Card de Resumo) ---
      // Conta apenas transações reais do mês (incluindo pagamentos de cartão, mas excluindo transferências internas), evitando duplicar com compras no cartão
      let totalOutflow = 0;
      if (selectedSource === 'all' || isWalletFilter) {
        transactions.forEach(t => {
          if (t.category === 'Transferência') return;

          const tMonth = t.dateObj.toLocaleDateString('en-CA').slice(0, 7);
          if (tMonth === currentMonth) {
            if (selectedSource === 'all' || t.walletId === selectedSource) {
              totalOutflow += Number(t.value || 0);
            }
          }
        });
      } else if (isCardFilter) {
        shoppingData.forEach(c => {
          if (c.status !== 'pago') return;
          const filterTargetDate = c.purchaseDateObj || c.dateObj;
          const cMonth = filterTargetDate.toLocaleDateString('en-CA').slice(0, 7);
          if (cMonth === currentMonth && c.cardId === selectedSource) {
            totalOutflow += Number(c.totalValue || 0);
          }
        });
      }

      setTotalMonthExpenses(totalOutflow);

      // C. Monta array final
      const finalData = budgetCategories.map(cat => {
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
      await saveBudgetLimit(editingCategory, newLimit);

      setBudgetLimits(prev => ({ ...prev, [editingCategory]: Number(newLimit) }));
      setSpendingData(prev => prev.map(item => {
        if (item.name === editingCategory) {
          const val = Number(newLimit);
          return {
            ...item,
            limit: val,
            percent: val > 0 ? (item.spent / val) * 100 : 0,
            remaining: val - item.spent
          };
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

  const handleOpenCategoryModal = (categoryName) => {
    if (!categoryName) return;
    setSelectedCategoryForModal(categoryName);
    setIsCategoryModalOpen(true);
  };

  const totalBudgetLimit = spendingData.reduce((acc, item) => acc + (item.limit || 0), 0);

  return (
    <div className="budgets-container container">
      <div className="budgets-header header-container">
        <div className="header-left">
          <h1 className="page-title">Metas e Orçamentos</h1>
          <p className="page-subtitle">Planeje seus limites mensais</p>
        </div>

        <div className="header-cards">
          <DashboardCard
            label="Total das Metas"
            value={totalBudgetLimit}
            variant="prediction"
            valueStyle={{ color: '#2e4761ff' }}
          />

          <DashboardCard
            label="Total de Saídas"
            value={totalMonthExpenses}
            variant="forecast"
            className={totalBudgetLimit > 0 && totalMonthExpenses > totalBudgetLimit ? 'forecast-negative' : 'forecast-positive'}
          />
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


      <div className="budgets-content page-container">
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

                <div className="budget-card-footer">
                  <button
                    type="button"
                    className="btn-view-category-expenses"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCategoryModal(item.name);
                    }}
                    title="Ver gastos detalhados desta categoria"
                  >
                    Ver Gastos 🔍
                  </button>

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
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Edição de Meta */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsEditModalOpen(false); }}>
          <div className="modal-content" style={{ maxWidth: '300px' }}>
            <h3>Meta: {editingCategory}</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>Defina o teto de gastos mensal</p>

            <CurrencyInput
              value={newLimit}
              onChange={e => setNewLimit(e.target.value)}
              placeholder="R$ 0,00"
              className="budget-input"
            />

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
              <button className="save-btn" onClick={handleSaveLimit}>Salvar Meta</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhamento dos Gastos da Categoria */}
      <CategoryExpensesModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        category={selectedCategoryForModal}
        monthKey={currentMonth}
        transactions={rawTransactions}
        cardPurchases={rawCardPurchases}
        cards={sources.cards}
      />
    </div>
  );
};

export default Budgets;