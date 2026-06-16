import React, { useState, useEffect } from 'react';
import { fetchWallets } from '../../api/wallets';
import './PayOffModal.css';

const PayOffModal = ({ isOpen, onClose, onConfirm, purchaseItem, purchaseItems }) => {
  const [wallets, setWallets] = useState([]);
  const [selectedWalletId, setSelectedWalletId] = useState('');

  useEffect(() => {
    const loadWallets = async () => {
      if (isOpen) {
        const data = await fetchWallets();
        setWallets(data);
        if (data.length > 0) setSelectedWalletId(data[0].id);
      }
    };
    loadWallets();
  }, [isOpen]);

  // Determina se é modo lote ou individual
  const isBatch = Array.isArray(purchaseItems) && purchaseItems.length > 0;
  const items = isBatch ? purchaseItems : (purchaseItem ? [purchaseItem] : []);

  if (!isOpen || items.length === 0) return null;

  const totalValue = items.reduce((sum, p) => sum + Number(p.totalValue), 0);

  const handleConfirm = () => {
    const wallet = wallets.find(w => w.id === selectedWalletId);
    if (isBatch) {
      onConfirm(items, selectedWalletId, wallet?.name);
    } else {
      onConfirm(purchaseItem, selectedWalletId, wallet?.name);
    }
    onClose();
  };

  return (
    <div className="payoff-overlay">
      <div className="payoff-content">
        <h3>{isBatch ? `Pagar ${items.length} Compras` : 'Pagar Compra'}</h3>

        {isBatch ? (
          <>
            <p className="payoff-batch-subtitle">Compras selecionadas:</p>
            <div className="payoff-items-list">
              {items.map(item => (
                <div key={item.id} className="payoff-item-row">
                  <span className="payoff-item-desc">{item.description}</span>
                  <span className="payoff-item-value">
                    R$ {Number(item.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
            <div className="payoff-total-row">
              <span>Total</span>
              <strong>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
          </>
        ) : (
          <>
            <p>Você está baixando a compra: <strong>{purchaseItem.description}</strong></p>
            <p>Valor Total: <strong>R$ {Number(purchaseItem.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
          </>
        )}

        <div className="form-group" style={{ marginTop: '15px' }}>
          <label>Pagar usando qual carteira?</label>
          <select
            value={selectedWalletId}
            onChange={(e) => setSelectedWalletId(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            {wallets.map(w => (
              <option key={w.id} value={w.id}>
                {w.name} (R$ {Number(w.currentBalance).toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div className="payoff-actions">
          <button onClick={onClose} className="btn-cancel">Cancelar</button>
          <button onClick={handleConfirm} className="btn-confirm">
            {isBatch ? `Confirmar ${items.length} Pagamentos` : 'Confirmar Pagamento'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayOffModal;