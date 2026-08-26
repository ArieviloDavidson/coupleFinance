import React, { useState, useEffect, useMemo } from 'react';
import { calculateDueDate } from '../../utils/dateUtils';
import './CloseInvoiceModal.css';

const CloseInvoiceModal = ({ isOpen, onClose, cards, shoppingList, initialCardId, onProceedToPay }) => {
  const [selectedCardId, setSelectedCardId] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialCardId && cards.some(c => c.id === initialCardId)) {
        setSelectedCardId(initialCardId);
      } else if (cards.length > 0) {
        setSelectedCardId(cards[0].id);
      }
    }
  }, [isOpen, initialCardId, cards]);

  const selectedCard = useMemo(() => {
    return cards.find(c => c.id === selectedCardId) || null;
  }, [cards, selectedCardId]);

  const invoiceData = useMemo(() => {
    if (!selectedCard) {
      return { purchases: [], closingDate: null, dueDate: null, total: 0, isPastClosing: false };
    }

    const closingDay = Number(selectedCard.closingDay);
    const dueDay = Number(selectedCard.dueDay);
    const today = new Date();

    // Se hoje < dia de fechamento: fatura fecha no dia closingDay deste mês.
    // Se hoje >= dia de fechamento: fatura fechou no dia closingDay deste mês.
    const isPastClosing = today.getDate() >= closingDay;
    const closingDate = new Date(today.getFullYear(), today.getMonth(), closingDay, 23, 59, 59, 999);
    const dueDate = calculateDueDate(closingDate, closingDay, dueDay);
    const dueDateLimit = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 23, 59, 59, 999);

    // Filtra as compras em aberto deste cartão que vencem até o vencimento desta fatura
    const purchases = shoppingList.filter(item => {
      if (item.cardId !== selectedCard.id) return false;
      if (item.status === 'pago') return false;

      const itemDueDate = item.dueDateObj || item.dateObj;
      return itemDueDate && itemDueDate <= dueDateLimit;
    });

    const total = purchases.reduce((sum, item) => sum + Number(item.totalValue), 0);

    return {
      purchases,
      closingDate,
      dueDate,
      total,
      isPastClosing
    };
  }, [selectedCard, shoppingList]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (invoiceData.purchases.length === 0) return;
    onProceedToPay(invoiceData.purchases);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="close-invoice-modal">
        <div className="modal-header">
          <h3>🧾 Fechar Fatura</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="close-invoice-body">
          <div className="form-group">
            <label>Selecione o Cartão:</label>
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="invoice-card-select"
            >
              {cards.map(card => (
                <option key={card.id} value={card.id}>
                  {card.name} (Fecha dia {card.closingDay} | Vence dia {card.dueDay})
                </option>
              ))}
            </select>
          </div>

          {selectedCard && (
            <div className="invoice-summary-box">
              <div className="invoice-dates-info">
                <div className="info-pill">
                  <span className="info-label">Fechamento da Fatura</span>
                  <strong>{invoiceData.closingDate?.toLocaleDateString('pt-BR')}</strong>
                  <small className="info-status">
                    {invoiceData.isPastClosing ? '(Fatura já fechada)' : '(Fechamento próximo)'}
                  </small>
                </div>
                <div className="info-pill">
                  <span className="info-label">Vencimento</span>
                  <strong>{invoiceData.dueDate?.toLocaleDateString('pt-BR')}</strong>
                </div>
              </div>

              <div className="invoice-stats">
                <div className="stats-row">
                  <span>Compras em aberto:</span>
                  <strong>{invoiceData.purchases.length} compra(s)</strong>
                </div>
                <div className="stats-row total-highlight">
                  <span>Total da Fatura:</span>
                  <strong>
                    {invoiceData.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
              </div>

              {invoiceData.purchases.length > 0 ? (
                <div className="invoice-items-preview">
                  <span className="preview-title">Itens inclusos nesta fatura:</span>
                  <div className="items-list-container">
                    {invoiceData.purchases.map(item => (
                      <div key={item.id} className="preview-item-row">
                        <div className="preview-item-info">
                          <span className="preview-desc">{item.description}</span>
                          <span className="preview-date">
                            Venc: {(item.dueDateObj || item.dateObj).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <span className="preview-val">
                          {Number(item.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-items-warning">
                  🎉 Nenhuma compra em aberto encontrada para esta fatura!
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>Cancelar</button>
            <button
              className="confirm-invoice-btn"
              disabled={!selectedCard || invoiceData.purchases.length === 0}
              onClick={handleConfirm}
            >
              Ir para Pagamento ({invoiceData.purchases.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloseInvoiceModal;
