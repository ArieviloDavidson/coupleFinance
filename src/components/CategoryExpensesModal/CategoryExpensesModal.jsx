import React, { useEffect } from 'react';
import './CategoryExpensesModal.css';

const formatMonthLabel = (monthKey) => {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${monthNames[Number(month) - 1]} / ${year}`;
};

const formatDate = (dateObj) => {
  if (!dateObj) return '';
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  return d.toLocaleDateString('pt-BR');
};

const CategoryExpensesModal = ({
  isOpen,
  onClose,
  category,
  monthKey,
  transactions = [],
  cardPurchases = [],
  cards = []
}) => {
  // Fechar ao pressionar a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !category) return null;

  // Mapa de cartões por id para exibir o nome correto
  const cardMap = {};
  cards.forEach(c => {
    cardMap[c.id] = c.name;
  });

  // 1. Filtra transações da carteira para o mês e categoria (exclui 'Pagamento de Cartão' e 'Transferência')
  const walletExpenses = transactions
    .filter(t => {
      if (t.category === 'Pagamento de Cartão' || t.category === 'Transferência') return false;
      const tCat = t.category || 'Outros';
      if (tCat !== category) return false;
      const tMonth = t.dateObj ? t.dateObj.toLocaleDateString('en-CA').slice(0, 7) : '';
      return tMonth === monthKey;
    })
    .map(t => ({
      id: t.id || `wallet-${Math.random()}`,
      description: t.description,
      value: Number(t.value || 0),
      dateObj: t.dateObj,
      sourceType: 'wallet',
      sourceName: t.walletName || 'Carteira'
    }));

  // 2. Filtra compras no cartão com status 'pago' para o mês e categoria
  const cardExpenses = cardPurchases
    .filter(c => {
      if (c.status !== 'pago') return false;
      const cCat = c.category || 'Outros';
      if (cCat !== category) return false;
      const filterDate = c.purchaseDateObj || c.dateObj;
      const cMonth = filterDate ? filterDate.toLocaleDateString('en-CA').slice(0, 7) : '';
      return cMonth === monthKey;
    })
    .map(c => ({
      id: c.id || `card-${Math.random()}`,
      description: c.description,
      value: Number(c.totalValue || 0),
      dateObj: c.purchaseDateObj || c.dateObj,
      sourceType: 'card',
      sourceName: cardMap[c.cardId] || 'Cartão de Crédito'
    }));

  // Junta todos os lançamentos e ordena por data decrescente (mais recente primeiro)
  const allExpenses = [...walletExpenses, ...cardExpenses].sort((a, b) => {
    const dateA = a.dateObj ? new Date(a.dateObj) : new Date(0);
    const dateB = b.dateObj ? new Date(b.dateObj) : new Date(0);
    return dateB - dateA;
  });

  const totalWallet = walletExpenses.reduce((acc, item) => acc + item.value, 0);
  const totalCard = cardExpenses.reduce((acc, item) => acc + item.value, 0);
  const totalGeneral = totalWallet + totalCard;

  // Fechar ao clicar fora (no overlay)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content category-expenses-modal">
        <div className="modal-header">
          <div>
            <h3>Gastos: {category}</h3>
            <span className="category-modal-subtitle">{formatMonthLabel(monthKey)}</span>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Resumo de Valores */}
        <div className="category-summary-cards">
          <div className="summary-card total">
            <span className="summary-label">Total Gasto</span>
            <strong className="summary-value">
              {totalGeneral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>
          <div className="summary-card wallet">
            <span className="summary-label">Carteira / Débito</span>
            <strong className="summary-value">
              {totalWallet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>
          <div className="summary-card card">
            <span className="summary-label">Cartão (Pago)</span>
            <strong className="summary-value">
              {totalCard.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>
        </div>

        {/* Lista Detalhada de Lançamentos */}
        <div className="category-items-container">
          <h4 className="items-title">Lançamentos ({allExpenses.length})</h4>

          {allExpenses.length === 0 ? (
            <div className="category-empty-state">
              <p>Nenhum gasto pago registrado nesta categoria em {formatMonthLabel(monthKey)}.</p>
            </div>
          ) : (
            <div className="category-items-list">
              {allExpenses.map((item) => (
                <div key={item.id} className="category-expense-item">
                  <div className="item-icon-col">
                    <span className={`item-badge-icon ${item.sourceType}`} title={item.sourceType === 'wallet' ? 'Pago via Carteira' : 'Pago via Cartão'}>
                      {item.sourceType === 'wallet' ? '👛' : '💳'}
                    </span>
                  </div>

                  <div className="item-info-col">
                    <span className="item-description">{item.description}</span>
                    <div className="item-meta">
                      <span className="item-source-name">{item.sourceName}</span>
                      <span className="item-dot">•</span>
                      <span className="item-date">{formatDate(item.dateObj)}</span>
                    </div>
                  </div>

                  <div className="item-value-col">
                    <strong>
                      {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="cancel-btn">Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default CategoryExpensesModal;
