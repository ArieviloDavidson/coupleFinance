import React, { useState, useEffect } from 'react';
import {
  subscribeCards,
  subscribeCardsShopping,
  addCard,
  removeCard,
  addCardPurchase,
  removeCardPurchase,
  payCardPurchase,
  updateCardLimit
} from '../../api/cards';
import CurrencyInput from '../../components/CurrencyInput/CurrencyInput';
import './ListCards.css';
import CardForm from '../../components/CardForm/CardForm';
import CardShoppingForm from '../../components/CardShoppingForm/CardShoppingForm';
import PayOffModal from '../../components/PayOffModal/PayOffModal';

const ListCards = ({ initialCardFilter }) => {

  // Filtro de mês/ano
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedCardFilter, setSelectedCardFilter] = useState(''); // ID do cartão selecionado

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

  const filteredShoppingList = shoppingList.filter(item => {
    // Filtro de Mês (YYYY-MM)
    const itemYearMonth = item.dateObj.toISOString().slice(0, 7);
    const matchMonth = !currentMonth || itemYearMonth === currentMonth;

    // Filtro de Cartão
    const matchCard = !selectedCardFilter || item.cardId === selectedCardFilter;

    return matchMonth && matchCard;
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
    setPayOffModalOpen(true);
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

  return (
    <div className="cards-wrapper">
      <div className="header-actions">
        <h2>Meus Cartões</h2>
        <div className="header-buttons">
          <button className="btn-new-card" onClick={() => setIsModalOpen(true)}>
            + Novo Cartão
          </button>
          <button className="btn-shopping" onClick={() => setIsShoppingModalOpen(true)}>
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
          {/* NOVO: Filtro de Mês */}
          <input
            type="month"
            value={currentMonth}
            onChange={e => setCurrentMonth(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      {/* GRID DE CARTÕES */}
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
        <h3>Histórico de Compras (Crédito) {currentMonth}</h3>

        {filteredShoppingList.length === 0 ? (
          <p className="no-data">Nenhuma compra registrada nos cartões.</p>
        ) : (
          <div className="shopping-list">
            {filteredShoppingList.map(item => {
              const isPaid = item.status === 'pago';

              return (
                <div key={item.id} className={`shopping-item ${isPaid ? 'paid-item' : ''}`}>
                  <div className="shopping-info">
                    <span className="shopping-date">
                      {item.dateObj.toLocaleDateString('pt-BR')}
                    </span>
                    <strong className="shopping-desc">{item.description}</strong>
                    <span className="shopping-card-badge">{getCardName(item.cardId)}</span>

                    {isPaid && <span className="status-badge-paid">PAGO</span>}
                  </div>

                  <div className="shopping-actions">
                    <strong className="shopping-total">
                      {Number(item.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>

                    {!isPaid && (
                      <button
                        className="btn-pay-shopping"
                        onClick={() => openPayModal(item)}
                        title="Baixar/Pagar Compra"
                      >
                        ✓
                      </button>
                    )}

                    <button
                      className="btn-delete-shopping"
                      onClick={() => handleDeleteShopping(item.id, item.description)}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
        onClose={() => setPayOffModalOpen(false)}
        onConfirm={processPayment}
        purchaseItem={selectedPurchaseToPay}
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