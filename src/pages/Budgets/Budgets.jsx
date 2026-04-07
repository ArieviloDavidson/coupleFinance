import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CurrencyInput from '../../components/CurrencyInput/CurrencyInput';
import './Budgets.css';

import { CATEGORIES, TRANSACTION_TYPES, COLLECTIONS } from '../../utils/constants';

const Budgets = () => {
  const [loading, setLoading] = useState(true);

  // Filtros
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
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
      const wSnap = await getDocs(collection(db, COLLECTIONS.WALLETS));
      const cSnap = await getDocs(collection(db, COLLECTIONS.CARDS));
      setSources({
        wallets: wSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        cards: cSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      });
    };
    fetchSources();
  }, []);

  // 2. O Grande Carregamento de Dados
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // A. Busca Limites
      const limitsObj = {};
      const budgetsSnap = await getDocs(query(collection(db, COLLECTIONS.BUDGETS), where("month", "==", currentMonth)));
      budgetsSnap.forEach(doc => {
        const data = doc.data();
        limitsObj[data.category] = Number(data.limit);
      });
      setBudgetLimits(limitsObj);

      // B. Busca Gastos Reais
      const spendingObj = {};
      CATEGORIES[TRANSACTION_TYPES.SAIDA].forEach(cat => spendingObj[cat] = 0);

      // --- B1. Transações (Wallets) ---
      const isWalletFilter = sources.wallets.some(w => w.id === selectedSource);
      if (selectedSource === 'all' || isWalletFilter) {
        const qTrans = query(collection(db, COLLECTIONS.TRANSACTIONS), where("type", "==", TRANSACTION_TYPES.SAIDA));
        const transSnap = await getDocs(qTrans);

        transSnap.docs.forEach(doc => {
          const t = doc.data();
          if (t.category === 'Pagamento de Cartão') return;

          const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
          const tMonth = tDate.toISOString().slice(0, 7);

          if (tMonth === currentMonth) {
            if (selectedSource === 'all' || t.walletId === selectedSource) {
              const cat = t.category || 'Outros';
              if (spendingObj[cat] !== undefined) spendingObj[cat] += Number(t.value);
            }
          }
        });
      }

      // --- B2. Compras (Cartões) - LÓGICA DE VENCIMENTO APLICADA ---
      const isCardFilter = sources.cards.some(c => c.id === selectedSource);
      if (selectedSource === 'all' || isCardFilter) {
        const qCards = query(collection(db, COLLECTIONS.CARDS_SHOPPING));
        const cardsSnap = await getDocs(qCards);

        cardsSnap.docs.forEach(doc => {
          const c = doc.data();
          const cardConfig = sources.cards.find(card => card.id === c.cardId);

          // 1. Pega data original da compra/parcela
          let targetDate = c.date?.toDate ? c.date.toDate() : new Date(c.date);

          // 2. Se temos a config do cartão, aplicamos a projeção de vencimento
          if (cardConfig) {
            const closingDay = Number(cardConfig.closingDay);
            const dueDay = Number(cardConfig.dueDay);
            const purchaseDay = targetDate.getDate();

            // Lógica A: Compra caiu na próxima fatura? (Comprou depois que fechou)
            if (purchaseDay >= closingDay) {
              targetDate.setMonth(targetDate.getMonth() + 1);
            }

            // Lógica B: O vencimento é no mês seguinte ao fechamento?
            // Ex: Fecha dia 25, Vence dia 10. (10 < 25) -> Paga no mês seguinte
            if (dueDay < closingDay) {
              targetDate.setMonth(targetDate.getMonth() + 1);
            }
          }

          const cMonth = targetDate.toISOString().slice(0, 7);

          // Agora comparamos com o mês da fatura calculada, não da compra
          if (cMonth === currentMonth) {
            if (selectedSource === 'all' || c.cardId === selectedSource) {
              const cat = c.category || 'Outros';
              if (spendingObj[cat] !== undefined) spendingObj[cat] += Number(c.totalValue);
            }
          }
        });
      }

      // C. Monta array final
      const finalData = CATEGORIES[TRANSACTION_TYPES.SAIDA].map(cat => {
        const limit = limitsObj[cat] || 0;
        const spent = spendingObj[cat] || 0;
        const percent = limit > 0 ? (spent / limit) * 100 : 0;

        return {
          name: cat,
          limit: limit,
          spent: spent,
          remaining: limit - spent,
          percent: percent
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

    const docId = `${currentMonth}_${editingCategory}`;
    try {
      await setDoc(doc(db, COLLECTIONS.BUDGETS, docId), {
        month: currentMonth,
        category: editingCategory,
        limit: Number(newLimit)
      });

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
    <div className="budgets-container">
      <div className="budgets-header">
        <div className="header-title">
          <h2>Metas e Orçamentos</h2>
          <p>Planeje seus limites (Considerando vencimento da fatura)</p>
        </div>

        <div className="budgets-filters">
          <input
            type="month"
            value={currentMonth}
            onChange={e => setCurrentMonth(e.target.value)}
            className="filter-input"
          />
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
              <Bar dataKey="spent" name="Gasto Real" fill="#8884d8" radius={[4, 4, 0, 0]} />
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