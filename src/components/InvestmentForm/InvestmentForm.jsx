import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import { parseDateToNoon } from '../../utils/dateUtils';
import CurrencyInput from '../CurrencyInput/CurrencyInput';
import './InvestmentForm.css';

const InvestmentForm = ({ isOpen, onClose, onSave, investmentTypes }) => {
  const [wallets, setWallets] = useState([]);

  const [formData, setFormData] = useState({
    description: '',
    value: '',
    type: 'entrada', // entrada = Aporte, saida = Resgate
    investmentTypeId: '',
    walletId: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Busca carteiras ao abrir
  useEffect(() => {
    const fetchWallets = async () => {
      if (isOpen) {
        const snap = await getDocs(collection(db, COLLECTIONS.WALLETS));
        setWallets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    };
    fetchWallets();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const selectedType = investmentTypes.find(t => t.id === formData.investmentTypeId);

    if (!selectedType) {
      alert('Selecione o tipo de investimento.');
      return;
    }

    const selectedWallet = wallets.find(w => w.id === formData.walletId);
    const dateFixed = parseDateToNoon(formData.date);

    onSave({
      ...formData,
      value: Number(formData.value),
      date: dateFixed,
      investmentTypeName: selectedType.name,
      walletName: selectedWallet ? selectedWallet.name : null
    });

    onClose();
    setFormData({
      description: '',
      value: '',
      type: 'entrada',
      investmentTypeId: '',
      walletId: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Nova Movimentação de Investimento</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Descrição */}
          <div className="form-group">
            <label>Descrição</label>
            <input
              type="text" name="description"
              value={formData.description} onChange={handleChange}
              placeholder="Ex: Aporte CDB 120% CDI" required
            />
          </div>

          {/* Valor e Operação */}
          <div className="form-row">
            <div className="form-group">
              <label>Valor (R$)</label>
              <CurrencyInput
                name="value"
                value={formData.value}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Operação</label>
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value="entrada">Aporte (Compra)</option>
                <option value="saida">Resgate (Venda)</option>
              </select>
            </div>
          </div>

          {/* Tipo de Investimento e Data */}
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Investimento</label>
              <select
                name="investmentTypeId"
                value={formData.investmentTypeId}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Selecione...</option>
                {investmentTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Data</label>
              <input
                type="date" name="date"
                value={formData.date} onChange={handleChange} required
              />
            </div>
          </div>

          {/* Carteira (opcional) */}
          <div className="form-group">
            <label>
              {formData.type === 'entrada'
                ? 'Carteira (Débito - sai daqui)'
                : 'Carteira (Crédito - entra aqui)'}
              <span style={{ color: '#95a5a6', fontWeight: 400, marginLeft: 6, fontSize: '0.8rem' }}>— opcional</span>
            </label>
            <select name="walletId" value={formData.walletId} onChange={handleChange}>
              <option value="">Sem carteira (apenas histórico)</option>
              {wallets.map(wallet => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} (Saldo: R$ {Number(wallet.currentBalance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
            <button type="submit" className="save-btn">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvestmentForm;
