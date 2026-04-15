import React, { useState, useEffect } from 'react';
import { fetchWallets } from '../../api/wallets';
import './PayOffModal.css';

const PayOffModal = ({ isOpen, onClose, onConfirm, purchaseItem }) => {
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

  if (!isOpen || !purchaseItem) return null;

  const handleConfirm = () => {
    // Busca o nome da carteira para histórico
    const wallet = wallets.find(w => w.id === selectedWalletId);
    onConfirm(purchaseItem, selectedWalletId, wallet?.name);
    onClose();
  };

  return (
    <div className="payoff-overlay">
      <div className="payoff-content">
        <h3>Pagar Compra</h3>
        <p>Você está baixando a compra: <strong>{purchaseItem.description}</strong></p>
        <p>Valor Total: <strong>R$ {Number(purchaseItem.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>

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
          <button onClick={handleConfirm} className="btn-confirm">Confirmar Pagamento</button>
        </div>
      </div>
    </div>
  );
};

export default PayOffModal;