import React, { useState, useEffect } from 'react';
import { fetchWallets } from '../../api/wallets';
import { parseDateToNoon } from '../../utils/dateUtils';
import { CATEGORIES, TRANSACTION_TYPES } from '../../utils/constants';
import CurrencyInput from '../CurrencyInput/CurrencyInput';
import './TransactionForm.css';

const TransactionForm = ({ isOpen, onClose, onSave }) => {
  const [wallets, setWallets] = useState([]);

  const [formData, setFormData] = useState({
    description: '',
    value: '',
    type: TRANSACTION_TYPES.SAIDA,
    date: new Date().toISOString().split('T')[0],
    walletId: '',
    category: '' // Novo campo iniciando vazio
  });

  // Busca carteiras
  useEffect(() => {
    const loadWallets = async () => {
      if (isOpen) {
        const walletsData = await fetchWallets();
        setWallets(walletsData);
      }
    };
    loadWallets();
  }, [isOpen]);

  // Se o usuário mudar o TIPO (entrada/saida), resetamos a categoria
  // para ele não salvar uma Saída com categoria de "Salário", por exemplo.
  useEffect(() => {
    setFormData(prev => ({ ...prev, category: '' }));
  }, [formData.type]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const selectedWallet = wallets.find(w => w.id === formData.walletId);


    // 2. Usamos o utilitário para criar a data corrigida (meio-dia)
    const dateFixed = parseDateToNoon(formData.date);

    onSave({
      ...formData,
      value: Number(formData.value),
      date: dateFixed, // Usamos a data corrigida
      walletName: selectedWallet ? selectedWallet.name : 'Desconhecida'
    });

    onClose();
    // Reset Total
    setFormData({
      description: '',
      value: '',
      type: TRANSACTION_TYPES.SAIDA,
      date: new Date().toISOString().split('T')[0],
      walletId: '',
      category: ''
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Nova Movimentação</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Descrição */}
          <div className="form-group">
            <label>Descrição</label>
            <input
              type="text" name="description"
              value={formData.description} onChange={handleChange}
              placeholder="Ex: Mercado Semanal, Jantar..." required
            />
          </div>

          {/* Valor e Tipo (Lado a Lado) */}
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
              <label>Tipo</label>
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value={TRANSACTION_TYPES.SAIDA}>Saída (Gasto)</option>
                <option value={TRANSACTION_TYPES.ENTRADA}>Entrada (Ganho)</option>
              </select>
            </div>
          </div>

          {/* Data e Categoria (Lado a Lado) - NOVO LAYOUT */}
          <div className="form-row">
            <div className="form-group">
              <label>Data</label>
              <input
                type="date" name="date"
                value={formData.date} onChange={handleChange} required
              />
            </div>

            <div className="form-group">
              <label>Categoria</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Selecione...</option>
                {/* Renderiza as opções baseado no TIPO selecionado */}
                {CATEGORIES[formData.type].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Carteira */}
          <div className="form-group">
            <label>Carteira (Origem/Destino)</label>
            <select name="walletId" value={formData.walletId} onChange={handleChange} required>
              <option value="" disabled>Selecione uma carteira</option>
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

export default TransactionForm;