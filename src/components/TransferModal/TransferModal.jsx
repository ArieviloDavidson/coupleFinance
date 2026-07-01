import React, { useState, useEffect } from 'react';
import { parseDateToNoon } from '../../utils/dateUtils';
import CurrencyInput from '../CurrencyInput/CurrencyInput';
import './TransferModal.css';

const TransferModal = ({ isOpen, onClose, onConfirm, wallets }) => {
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));

  // Reseta o form quando abre
  useEffect(() => {
    if (isOpen) {
      setSourceId('');
      setDestId('');
      setValue('');
      setDate(new Date().toLocaleDateString('en-CA'));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (sourceId === destId) {
      alert("A origem e o destino não podem ser iguais.");
      return;
    }

    if (!sourceId || !destId || !value) {
      alert("Preencha todos os campos.");
      return;
    }

    // Encontra os nomes para salvar no histórico
    const sourceWallet = wallets.find(w => w.id === sourceId);
    const destWallet = wallets.find(w => w.id === destId);

    // 2. Data corrigida pelo utilitário
    const dateFixed = parseDateToNoon(date);

    onConfirm({
      sourceId,
      sourceName: sourceWallet.name,
      destId,
      destName: destWallet.name,
      value: Number(value),
      date: dateFixed // <--- Usa a data corrigida
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Nova Transferência</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>De (Origem)</label>
            <select
              value={sourceId}
              onChange={e => setSourceId(e.target.value)}
              required
            >
              <option value="">Selecione a carteira...</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} (R$ {Number(w.currentBalance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Para (Destino)</label>
            <select
              value={destId}
              onChange={e => setDestId(e.target.value)}
              required
            >
              <option value="">Selecione a carteira...</option>
              {wallets.filter(w => w.id !== sourceId).map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Valor (R$)</label>
            <CurrencyInput
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>

          <div className="form-group">
            <label>Data</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
            <button type="submit" className="save-btn">Confirmar Transferência</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;