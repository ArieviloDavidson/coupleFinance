import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  increment,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';

// Sub-componentes
import InvestmentForm from '../../components/InvestmentForm/InvestmentForm';
import InvestmentTypeForm from '../../components/InvestmentTypeForm/InvestmentTypeForm';

// Gráficos
import ChartInvestmentsByType from '../../components/Charts/ChartInvestmentsByType';
import ChartInvestmentsByMonth from '../../components/Charts/ChartInvestmentsByMonth';
import ChartInvestmentsValueByType from '../../components/Charts/ChartInvestmentsValueByType';

// Estilos
import './Investments.css';
import '../../shared.css';

// ======================================================
// HELPER: Cor dinâmica baseada na proximidade do ideal
// ratio = atual / ideal → distância de 1 define a cor
// distance 0 (perfeito) → verde | distance ≥ 1 → vermelho
// Simétrico: excesso e falta são igualmente penalizados
// ======================================================
function getInvestmentColor(atual, ideal) {
  if (ideal === 0) return '#95a5a6';
  const ratio = atual / ideal;
  // Distância absoluta do ideal (ratio = 1 é perfeito)
  const distance = Math.abs(ratio - 1);
  // Clamp: distância 0 → verde, distância ≥ 1 → vermelho
  const clampedDistance = Math.min(distance, 1);
  // Map 1→0 a hue 120→0 (verde→vermelho)
  const hue = (1 - clampedDistance) * 120;
  return `hsl(${hue}, 70%, 45%)`;
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================
const Investments = () => {
  // --- Estados ---
  const [investmentTypes, setInvestmentTypes] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTypeFormOpen, setIsTypeFormOpen] = useState(false);
  const [isEditIdealOpen, setIsEditIdealOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [newIdealValue, setNewIdealValue] = useState('');
  const [newColorValue, setNewColorValue] = useState('#4caf50');

  // Filtro de data para lista de movimentações
  const [filterDate, setFilterDate] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });

  // --- 1. Listener: Tipos de Investimento ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.INVESTMENT_TYPES), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInvestmentTypes(data);
    });
    return () => unsub();
  }, []);

  // --- 2. Listener: Movimentações ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.INVESTMENTS), (snap) => {
      const data = snap.docs.map(d => {
        const docData = d.data();
        return {
          id: d.id,
          ...docData,
          dateObj: docData.date?.toDate ? docData.date.toDate() : new Date(docData.date)
        };
      });
      // Ordena por data desc
      data.sort((a, b) => b.dateObj - a.dateObj);
      setInvestments(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- 3. Cálculos Derivados ---
  // Saldo por tipo: { typeId: valor }
  const balanceByType = {};
  investments.forEach(inv => {
    const key = inv.investmentTypeId;
    if (!balanceByType[key]) balanceByType[key] = 0;
    if (inv.type === 'entrada') {
      balanceByType[key] += Number(inv.value);
    } else {
      balanceByType[key] -= Number(inv.value);
    }
  });

  const totalInvested = Object.values(balanceByType).reduce((a, b) => a + Math.max(b, 0), 0);

  // Dados dos cards (nome, ideal%, atual%, cor, saldo)
  const typeCards = investmentTypes.map(t => {
    const saldo = balanceByType[t.id] || 0;
    const atualPercent = totalInvested > 0 ? (Math.max(saldo, 0) / totalInvested) * 100 : 0;
    const idealPercent = t.idealPercentage || 0;
    const dynamicColor = getInvestmentColor(atualPercent, idealPercent);

    return {
      ...t,
      saldo,
      atualPercent,
      idealPercent,
      dynamicColor
    };
  });

  // Dados para gráficos
  const chartPieData = typeCards
    .filter(t => t.saldo > 0)
    .map(t => ({
      name: t.name,
      value: t.saldo,
      color: t.color
    }));

  const chartBarData = typeCards.map(t => ({
    name: t.name,
    value: Math.max(t.saldo, 0),
    color: t.color
  }));

  // Movimentações filtradas por mês
  const filteredInvestments = investments.filter(inv => {
    if (filterDate) {
      const invMonth = inv.dateObj.toISOString().slice(0, 7);
      if (invMonth !== filterDate) return false;
    }
    return true;
  });

  // --- 4. CRUD: Adicionar Movimentação ---
  const handleAddInvestment = async (data) => {
    try {
      const batch = writeBatch(db);

      // A) Cria o registro de investimento
      const invRef = doc(collection(db, COLLECTIONS.INVESTMENTS));
      batch.set(invRef, {
        ...data,
        createdAt: new Date()
      });

      // B) Atualiza saldo da carteira (apenas se carteira selecionada)
      if (data.walletId) {
        const walletRef = doc(db, COLLECTIONS.WALLETS, data.walletId);

        if (data.type === 'entrada') {
          batch.update(walletRef, { currentBalance: increment(-data.value) });
        } else {
          batch.update(walletRef, { currentBalance: increment(data.value) });
        }

        // C) Cria transação correspondente na collection principal (só com carteira)
        const transRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
        if (data.type === 'entrada') {
          batch.set(transRef, {
            description: data.description,
            value: data.value,
            type: 'saida',
            category: 'Investimentos',
            date: data.date,
            walletId: data.walletId,
            walletName: data.walletName
          });
        } else {
          batch.set(transRef, {
            description: data.description,
            value: data.value,
            type: 'entrada',
            category: 'Investimentos (Resgate)',
            date: data.date,
            walletId: data.walletId,
            walletName: data.walletName
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error("Erro ao salvar investimento:", error);
      alert("Erro ao salvar investimento.");
    }
  };

  // --- 5. CRUD: Adicionar Tipo ---
  const handleAddType = async (typeData) => {
    try {
      await addDoc(collection(db, COLLECTIONS.INVESTMENT_TYPES), {
        ...typeData,
        createdAt: new Date()
      });
    } catch (error) {
      console.error("Erro ao criar tipo:", error);
      alert("Erro ao criar tipo.");
    }
  };

  // --- 6. CRUD: Excluir Tipo ---
  const handleDeleteType = async (typeId, typeName) => {
    const hasMovements = investments.some(inv => inv.investmentTypeId === typeId);
    const msg = hasMovements
      ? `O tipo "${typeName}" possui movimentações. Deseja realmente excluir? As movimentações não serão apagadas.`
      : `Excluir o tipo "${typeName}"?`;

    if (window.confirm(msg)) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.INVESTMENT_TYPES, typeId));
      } catch (error) {
        console.error("Erro ao excluir tipo:", error);
      }
    }
  };

  // --- 7. CRUD: Excluir Movimentação (com estorno) ---
  const handleDeleteInvestment = async (investment) => {
    const walletMsg = investment.walletId
      ? ` O valor (R$ ${investment.value}) será estornado na carteira.`
      : '';
    const confirmMsg = `Excluir "${investment.description}"?${walletMsg}`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const batch = writeBatch(db);

      // Deleta o investimento
      batch.delete(doc(db, COLLECTIONS.INVESTMENTS, investment.id));

      // Estorna na carteira (lógica inversa)
      if (investment.walletId) {
        const walletRef = doc(db, COLLECTIONS.WALLETS, investment.walletId);
        if (investment.type === 'entrada') {
          // Estorno de aporte: devolver dinheiro pra carteira
          batch.update(walletRef, { currentBalance: increment(investment.value) });
        } else {
          // Estorno de resgate: tirar dinheiro da carteira
          batch.update(walletRef, { currentBalance: increment(-investment.value) });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error("Erro ao excluir investimento:", error);
      alert("Erro ao excluir.");
    }
  };

  // --- 8. Editar % Ideal ---
  const openEditIdeal = (type) => {
    setEditingType(type);
    setNewIdealValue(type.idealPercentage || '');
    setNewColorValue(type.color || '#4caf50');
    setIsEditIdealOpen(true);
  };

  const handleSaveIdeal = async () => {
    if (!editingType) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.INVESTMENT_TYPES, editingType.id), {
        idealPercentage: Number(newIdealValue),
        color: newColorValue
      });
      setIsEditIdealOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar tipo:", error);
    }
  };

  // --- RENDER ---
  if (loading) return <div className="loading">Carregando investimentos...</div>;

  return (
    <div className="investments-container">

      {/* ===== HEADER ===== */}
      <div className="investments-header">
        <div className="header-title">
          <h2>Investimentos</h2>
          <p>Controle de aportes e resgates por tipo</p>
        </div>

        <div className="header-buttons">
          <button className="btn-new-type" onClick={() => setIsTypeFormOpen(true)}>
            + Novo Tipo
          </button>
          <button className="btn-new-investment" onClick={() => setIsFormOpen(true)}>
            + Nova Movimentação
          </button>
        </div>
      </div>

      {/* ===== CARDS DE TIPO ===== */}
      <div className="investment-types-grid">
        {typeCards.map(card => (
          <div
            key={card.id}
            className="investment-type-card"
            onClick={() => openEditIdeal(card)}
          >
            <button
              className="btn-delete-type"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteType(card.id, card.name);
              }}
            >
              &times;
            </button>

            {/* Barra lateral com cor do tipo */}
            <div className="type-color-bar" style={{ backgroundColor: card.color }} />

            <div className="type-card-content">
              <span className="type-name">{card.name}</span>

              <div className="type-percentages">
                <div className="percentage-row">
                  <span className="percentage-label">Ideal</span>
                  <span className="percentage-value">{card.idealPercent.toFixed(0)}%</span>
                </div>
                <div className="percentage-row">
                  <span className="percentage-label">Atual</span>
                  <span
                    className="percentage-value percentage-atual"
                    style={{ color: card.dynamicColor }}
                  >
                    {card.atualPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="type-progress-bg">
                <div
                  className="type-progress-fill"
                  style={{
                    width: `${Math.min((card.atualPercent / Math.max(card.idealPercent, 1)) * 100, 100)}%`,
                    backgroundColor: card.dynamicColor
                  }}
                />
              </div>

              <span className="type-balance">
                {card.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ===== SALDO TOTAL ===== */}
      <div className="total-invested-card">
        <span>Total Investido</span>
        <strong>
          {totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </strong>
      </div>

      {/* ===== GRÁFICOS ===== */}
      <div className="investments-charts-grid">
        <ChartInvestmentsByType data={chartPieData} />
        <ChartInvestmentsByMonth investments={investments} />
        <ChartInvestmentsValueByType data={chartBarData} />
      </div>

      {/* ===== LISTA DE MOVIMENTAÇÕES ===== */}
      <div className="investments-movements-section">
        <div className="movements-header">
          <h3>Movimentações</h3>
          <input
            type="month"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="investments-list">
          {filteredInvestments.length === 0 ? (
            <p className="no-data">Nenhuma movimentação neste período.</p>
          ) : (
            filteredInvestments.map(inv => (
              <div key={inv.id} className="investment-item">
                <button
                  className="btn-delete-transaction"
                  onClick={() => handleDeleteInvestment(inv)}
                  title="Excluir e estornar saldo"
                >
                  &times;
                </button>

                <div className={`indicator ${inv.type}`} />

                <div className="transaction-info">
                  <span className="transaction-desc">{inv.description}</span>
                  <span className="transaction-category">{inv.investmentTypeName}</span>
                  <div className="transaction-meta">
                    <span className="transaction-date">
                      {inv.dateObj.toLocaleDateString('pt-BR')}
                    </span>
                    {inv.walletName && (
                      <span className="transaction-wallet-badge">
                        {inv.walletName}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`transaction-value ${inv.type}`}>
                  {inv.type === 'saida' ? '- ' : '+ '}
                  {Number(inv.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== MODAIS ===== */}
      <InvestmentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleAddInvestment}
        investmentTypes={investmentTypes}
      />

      <InvestmentTypeForm
        isOpen={isTypeFormOpen}
        onClose={() => setIsTypeFormOpen(false)}
        onSave={handleAddType}
      />

      {/* Modal Editar Tipo */}
      {isEditIdealOpen && editingType && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '320px' }}>
            <h3>Editar: {editingType.name}</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Ajuste a porcentagem ideal e a cor deste tipo de investimento
            </p>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem', color: '#444' }}>
                % Ideal
              </label>
              <input
                type="number"
                value={newIdealValue}
                onChange={(e) => setNewIdealValue(e.target.value)}
                placeholder="25"
                min="0"
                max="100"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem', color: '#444' }}>
                Cor do tipo
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="color"
                  value={newColorValue}
                  onChange={(e) => setNewColorValue(e.target.value)}
                  style={{ width: '48px', height: '40px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', padding: '2px' }}
                />
                <span style={{ fontSize: '0.9rem', color: '#555', fontFamily: 'monospace' }}>{newColorValue}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setIsEditIdealOpen(false)}>Cancelar</button>
              <button className="save-btn" onClick={handleSaveIdeal}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
