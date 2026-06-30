import React, { useState, useEffect } from 'react';
import {
  subscribeCards,
  subscribeCardsShopping,
  addCard,
  removeCard,
  addCardPurchase,
  removeCardPurchase,
  payCardPurchase,
  payMultipleCardPurchases,
  updateCardLimit
} from '../../api/cards';
import CurrencyInput from '../../components/CurrencyInput/CurrencyInput';
import './ListCards.css';
import '../../shared.css';
import CardForm from '../../components/CardForm/CardForm';
import CardShoppingForm from '../../components/CardShoppingForm/CardShoppingForm';
import PayOffModal from '../../components/PayOffModal/PayOffModal';

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

const ListCards = ({ initialCardFilter }) => {

  // Filtro de mês/ano
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedCardFilter, setSelectedCardFilter] = useState(''); // ID do cartão selecionado
  const [statusFilter, setStatusFilter] = useState('all'); // all, aberto, pago

  const changeMonth = (direction) => {
    if (!currentMonth) return;
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    setCurrentMonth(getMonthKey(date));
  };

  const [cards, setCards] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [payOffModalOpen, setPayOffModalOpen] = useState(false);
  const [selectedPurchaseToPay, setSelectedPurchaseToPay] = useState(null);

  // Modal de edição de limite
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [newLimit, setNewLimit] = useState('');

  // --- MODO DE SELEÇÃO EM LOTE ---
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [selectedPurchases, setSelectedPurchases] = useState(new Set());
  const [lockedCardId, setLockedCardId] = useState(null);
  const [batchPurchaseItems, setBatchPurchaseItems] = useState(null); // Array para o modal

  // 1. Busca Cartões e Compras em paralelo (COM CORREÇÃO DE DATA)
  useEffect(() => {
    // Listener dos Cartões
    const unsubscribeCards = subscribeCards((data) => {
      setCards(data);
    });

    // Listener das Compras
    const unsubscribeShopping = subscribeCardsShopping((data) => {
      setShoppingList(data);
      setLoading(false);
    });

    return () => {
      unsubscribeCards();
      unsubscribeShopping();
    };
  }, []);

  // Aplica filtro externo quando recebido via navegação
  useEffect(() => {
    if (initialCardFilter) {
      setSelectedCardFilter(initialCardFilter);
    }
  }, [initialCardFilter]);

  const filteredShoppingList = shoppingList
    .filter(item => {
      // Filtro de Mês pela data de VENCIMENTO (YYYY-MM)
      const filterDate = item.dueDateObj || item.dateObj;
      const itemYearMonth = filterDate.toISOString().slice(0, 7);
      const matchMonth = !currentMonth || itemYearMonth === currentMonth;

      // Filtro de Cartão
      const matchCard = !selectedCardFilter || item.cardId === selectedCardFilter;

      // Filtro de Status
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchMonth && matchCard && matchStatus;
    })
    .sort((a, b) => {
      // 1º critério: não pagos antes dos pagos
      const aPaid = a.status === 'pago' ? 1 : 0;
      const bPaid = b.status === 'pago' ? 1 : 0;
      if (aPaid !== bPaid) return aPaid - bPaid;

      // 2º critério: data de compra mais recente primeiro
      return b.dateObj - a.dateObj;
    });

  // --- HELPER: Calcular Limite Disponível ---
  const getCardMetrics = (cardId, limitTotal) => {
    // Filtra compras deste cartão que NÃO estão pagas
    const openPurchases = shoppingList.filter(item =>
      item.cardId === cardId && item.status !== 'pago'
    );

    // Soma o total usado
    const used = openPurchases.reduce((acc, item) => acc + Number(item.totalValue), 0);

    // Calcula disponível (não deixa ficar negativo visualmente)
    const available = limitTotal - used;

    return {
      used,
      available: available < 0 ? 0 : available,
      percentageUsed: limitTotal > 0 ? (used / limitTotal) * 100 : 0
    };
  };

  const handleAddCard = async (newCardData) => {
    try {
      await addCard(newCardData);
    } catch (error) {
      console.error("Erro ao salvar cartão:", error);
    }
  };

  const handleDeleteCard = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este cartão?")) {
      try {
        await removeCard(id);
      } catch (error) {
        console.error("Erro ao excluir:", error);
      }
    }
  };

  // --- LÓGICA DE PARCELAMENTO AUTOMÁTICO (SPLIT) ---
  const handleAddShopping = async (purchaseData) => {
    try {
      const installments = Number(purchaseData.installments);
      await addCardPurchase(purchaseData);
      alert(`${installments} parcela(s) lançada(s) com sucesso!`);
    } catch (error) {
      if (error.message?.startsWith('DUPLICATE_FIXED_EXPENSE:')) {
        const name = error.message.split(':')[1];
        alert(`A despesa fixa "${name}" já existe! Remova-a antes de criar uma nova compra parcelada com esse nome.`);
        return;
      }
      console.error("Erro ao lançar compra parcelada:", error);
      alert("Erro ao salvar compras.");
    }
  };

  const handleDeleteShopping = async (id, description) => {
    if (window.confirm(`Excluir a compra "${description}"? Isso liberará o limite do cartão.`)) {
      try {
        await removeCardPurchase(id);
      } catch (error) {
        console.error("Erro ao excluir compra:", error);
      }
    }
  };

  const getCardName = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    return card ? card.name : 'Cartão Excluído';
  };

  // --- PAGAMENTO INDIVIDUAL ---
  const processPayment = async (purchase, walletId, walletName) => {
    try {
      await payCardPurchase(purchase, walletId, walletName);
      alert("Pagamento registrado! Limite liberado e saldo descontado.");
    } catch (error) {
      console.error("Erro no pagamento:", error);
      alert("Erro ao processar pagamento.");
    }
  };

  const openPayModal = (item) => {
    setSelectedPurchaseToPay(item);
    setBatchPurchaseItems(null);
    setPayOffModalOpen(true);
  };

  // --- PAGAMENTO EM LOTE ---
  const toggleBatchSelectMode = () => {
    if (batchSelectMode) {
      // Desativando: limpa seleção
      setSelectedPurchases(new Set());
      setLockedCardId(null);
    }
    setBatchSelectMode(!batchSelectMode);
  };

  const togglePurchaseSelection = (item) => {
    const newSelected = new Set(selectedPurchases);

    if (newSelected.has(item.id)) {
      // Desmarcando
      newSelected.delete(item.id);

      // Se ficou vazio, destrava o cartão
      if (newSelected.size === 0) {
        setLockedCardId(null);
      }
    } else {
      // Marcando
      if (newSelected.size === 0) {
        // Primeira seleção: trava o cartão
        setLockedCardId(item.cardId);
      }
      newSelected.add(item.id);
    }

    setSelectedPurchases(newSelected);
  };

  const getSelectedTotal = () => {
    return filteredShoppingList
      .filter(item => selectedPurchases.has(item.id))
      .reduce((sum, item) => sum + Number(item.totalValue), 0);
  };

  const openBatchPayModal = () => {
    const items = filteredShoppingList.filter(item => selectedPurchases.has(item.id));
    setBatchPurchaseItems(items);
    setSelectedPurchaseToPay(null);
    setPayOffModalOpen(true);
  };

  const processBatchPayment = async (purchases, walletId, walletName) => {
    try {
      await payMultipleCardPurchases(purchases, walletId, walletName);
      alert(`${purchases.length} pagamento(s) registrado(s)! Limite liberado e saldo descontado.`);
      // Limpa o modo de seleção
      setSelectedPurchases(new Set());
      setLockedCardId(null);
      setBatchSelectMode(false);
    } catch (error) {
      console.error("Erro no pagamento em lote:", error);
      alert("Erro ao processar pagamentos.");
    }
  };

  const handlePayOffConfirm = (purchaseOrPurchases, walletId, walletName) => {
    if (Array.isArray(purchaseOrPurchases)) {
      processBatchPayment(purchaseOrPurchases, walletId, walletName);
    } else {
      processPayment(purchaseOrPurchases, walletId, walletName);
    }
  };

  // --- Editar Limite do Cartão ---
  const openLimitEdit = (card) => {
    setEditingCard(card);
    setNewLimit(Number(card.limit) || '');
    setIsLimitModalOpen(true);
  };

  const handleSaveLimit = async () => {
    if (!editingCard) return;
    try {
      await updateCardLimit(editingCard.id, newLimit);
      setIsLimitModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar limite:", error);
      alert("Erro ao atualizar limite do cartão.");
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;

  // Conta quantas compras não-pagas existem para mostrar/esconder botão de seleção
  const unpaidCount = filteredShoppingList.filter(item => item.status !== 'pago').length;

  return (
    <div className="cards-wrapper container">
      <div className="header-actions header-container">
        <div className="header-left">
          <h1 className="page-title">Meus Cartões</h1>
          <p className="page-subtitle">Gestão de cartões e faturas</p>
        </div>
        <div className="header-buttons">
          <button className="btn-new-card btn" onClick={() => setIsModalOpen(true)}>
            + Novo Cartão
          </button>
          <button className="btn-shopping btn" onClick={() => setIsShoppingModalOpen(true)}>
            + Compra Crédito
          </button>
          {/* NOVO: Filtro de Cartão */}
          <select
            value={selectedCardFilter}
            onChange={e => setSelectedCardFilter(e.target.value)}
            className="filter-input"
          >
            <option value="">Todos os Cartões</option>
            {cards.map(card => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
          {/* NOVO: Filtro de Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="filter-input"
          >
            <option value="all">Todas as Compras</option>
            <option value="aberto">Não Pagas</option>
            <option value="pago">Pagas</option>
          </select>
          {/* NOVO: Filtro de Mês */}
          <div className="month-nav">
            <button onClick={() => changeMonth(-1)} className="month-nav-btn">◀</button>
            <span className="month-label">{formatMonthLabel(currentMonth)}</span>
            <button onClick={() => changeMonth(1)} className="month-nav-btn">▶</button>
          </div>
        </div>
      </div>

      {/* GRID DE CARTÕES */}
      <div className="cards-content page-container">
      <div className="cards-grid">
        {cards.map(card => {
          // Calcula métricas individuais
          const metrics = getCardMetrics(card.id, Number(card.limit));

          return (
            <div key={card.id} className="card-item" style={{ borderTop: `4px solid ${card.color || '#ccc'}` }}>
              <button className="btn-delete" onClick={() => handleDeleteCard(card.id)} title="Excluir cartão">&times;</button>

              <div className="card-header">
                <h3>{card.name}</h3>
                <div className="card-tags">
                  {card.flag && <span className="card-flag">{card.flag}</span>}
                </div>
              </div>

              {/* Informações de Limite Calculado */}
              <div className="card-limit-info">
                <div className="limit-row">
                  <span className="limit-label">Disponível</span>
                  <span className="limit-value available">
                    {metrics.available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="limit-progress-bar">
                  <div
                    className="limit-progress-fill"
                    style={{
                      width: `${Math.min(metrics.percentageUsed, 100)}%`,
                      backgroundColor: metrics.percentageUsed > 90 ? '#e74c3c' : (card.color || '#2c3e50')
                    }}
                  ></div>
                </div>

                <div className="limit-row small limit-row-clickable" onClick={() => openLimitEdit(card)} title="Clique para editar o limite">
                  <span className="limit-label">Limite Total</span>
                  <span className="limit-value limit-editable">
                    {Number(card.limit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    <span className="edit-icon">✎</span>
                  </span>
                </div>
              </div>

              <div className="card-body">
                <div className="card-dates">
                  <div className="date-group">
                    <small>Fecha dia</small>
                    <strong>{card.closingDay}</strong>
                  </div>
                  <div className="date-separator"></div>
                  <div className="date-group">
                    <small>Vence dia</small>
                    <strong>{card.dueDay}</strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* LISTA DE COMPRAS */}
      <div className="shopping-history-section">
        <div className="shopping-history-header">
          <h3>Histórico de Compras (Crédito) {currentMonth}</h3>
          {unpaidCount > 1 && (
            <button
              className={`batch-select-btn ${batchSelectMode ? 'active' : ''}`}
              onClick={toggleBatchSelectMode}
            >
              {batchSelectMode ? '✕ Cancelar' : '☐ Selecionar'}
            </button>
          )}
        </div>

        {filteredShoppingList.length === 0 ? (
          <p className="no-data">Nenhuma compra registrada nos cartões.</p>
        ) : (
          <div className="shopping-list">
            {filteredShoppingList.map(item => {
              const isPaid = item.status === 'pago';
              const isSelected = selectedPurchases.has(item.id);
              const isDisabledCard = batchSelectMode && lockedCardId && item.cardId !== lockedCardId && !isPaid;

              return (
                <div
                  key={item.id}
                  className={`shopping-item ${isPaid ? 'paid-item' : ''} ${isSelected ? 'selected' : ''} ${isDisabledCard ? 'disabled-card' : ''}`}
                  onClick={batchSelectMode && !isPaid && !isDisabledCard ? () => togglePurchaseSelection(item) : undefined}
                  style={batchSelectMode && !isPaid && !isDisabledCard ? { cursor: 'pointer' } : {}}
                >
                  {/* Checkbox no modo seleção */}
                  {batchSelectMode && !isPaid && (
                    <div className={`shopping-item-checkbox ${isSelected ? 'checked' : ''} ${isDisabledCard ? 'disabled' : ''}`}>
                      {isSelected && <span>✓</span>}
                    </div>
                  )}

                  <div className="shopping-info">
                    <span className="shopping-date">
                      Compra: {(item.purchaseDateObj || item.dateObj).toLocaleDateString('pt-BR')}
                      {' | '}
                      Venc: {(item.dueDateObj || item.dateObj).toLocaleDateString('pt-BR')}
                    </span>
                    <strong className="shopping-desc">{item.description}</strong>
                    <span className="shopping-card-badge">{getCardName(item.cardId)}</span>

                    {isPaid && <span className="status-badge-paid">PAGO</span>}
                  </div>

                  <div className="shopping-actions">
                    <strong className="shopping-total">
                      {Number(item.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>

                    {!isPaid && !batchSelectMode && (
                      <button
                        className="btn-pay-shopping"
                        onClick={() => openPayModal(item)}
                        title="Baixar/Pagar Compra"
                      >
                        ✓
                      </button>
                    )}

                    {!batchSelectMode && (
                      <button
                        className="btn-delete-shopping"
                        onClick={() => handleDeleteShopping(item.id, item.description)}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* BARRA FLUTUANTE DE AÇÕES EM LOTE */}
      {batchSelectMode && selectedPurchases.size > 0 && (
        <div className="batch-action-bar">
          <div className="batch-action-info">
            <span className="batch-count">{selectedPurchases.size} compra(s) selecionada(s)</span>
            <span className="batch-total">
              Total: {getSelectedTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <button className="batch-pay-btn" onClick={openBatchPayModal}>
            Pagar {selectedPurchases.size} Compra(s)
          </button>
        </div>
      )}

      {/* MODALS */}
      <CardForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddCard}
      />
      <CardShoppingForm
        isOpen={isShoppingModalOpen}
        onClose={() => setIsShoppingModalOpen(false)}
        onSave={handleAddShopping}
      />
      <PayOffModal
        isOpen={payOffModalOpen}
        onClose={() => {
          setPayOffModalOpen(false);
          setBatchPurchaseItems(null);
          setSelectedPurchaseToPay(null);
        }}
        onConfirm={handlePayOffConfirm}
        purchaseItem={selectedPurchaseToPay}
        purchaseItems={batchPurchaseItems}
      />

      {/* Modal Editar Limite */}
      {isLimitModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '300px' }}>
            <h3>Limite: {editingCard?.name}</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>Defina o novo limite deste cartão</p>

            <CurrencyInput
              value={newLimit}
              onChange={e => setNewLimit(e.target.value)}
              placeholder="R$ 0,00"
              className="budget-input"
            />

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setIsLimitModalOpen(false)}>Cancelar</button>
              <button className="save-btn" onClick={handleSaveLimit}>Salvar Limite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListCards;