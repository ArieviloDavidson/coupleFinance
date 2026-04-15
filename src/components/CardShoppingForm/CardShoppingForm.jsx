import React, { useState, useEffect } from 'react';
import { fetchCards } from '../../api/cards';
import './CardShoppingForm.css';

import { CATEGORIES, TRANSACTION_TYPES } from '../../utils/constants';
import { parseDateToNoon } from '../../utils/dateUtils';
import CurrencyInput from '../CurrencyInput/CurrencyInput';

const CardShoppingForm = ({ isOpen, onClose, onSave }) => {
  const [cards, setCards] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    totalValue: '',
    installments: 1,
    date: new Date().toISOString().split('T')[0],
    cardId: '',
    category: ''
  });

  // Busca os cartões para o Select
  useEffect(() => {
    const loadCards = async () => {
      if (isOpen) {
        const data = await fetchCards();
        setCards(data);
      }
    };
    loadCards();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const total = Number(formData.totalValue);
    const parcels = Number(formData.installments);

    onSave({
      ...formData,
      totalValue: total,
      installments: parcels,
      installmentValue: total / parcels,
      date: parseDateToNoon(formData.date),
      status: 'aberto'
    });

    onClose();

    setFormData({
      description: '',
      totalValue: '',
      installments: 1,
      date: new Date().toISOString().split('T')[0],
      cardId: '',
      category: ''
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Compra no Crédito</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>O que comprou?</label>
            <input type="text" name="description" value={formData.description} onChange={handleChange} required placeholder="Ex: iPhone, Jantar..." />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Valor Total (R$)</label>
              <CurrencyInput
                name="totalValue"
                value={formData.totalValue}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Parcelas</label>
              <input type="number" name="installments" value={formData.installments} onChange={handleChange} min="1" max="24" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cartão</label>
              <select name="cardId" value={formData.cardId} onChange={handleChange} required>
                <option value="" disabled>Selecione...</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Categoria</label>
              <select name="category" value={formData.category} onChange={handleChange} required>
                <option value="" disabled>Selecione...</option>
                {CATEGORIES[TRANSACTION_TYPES.SAIDA].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Data da Compra</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} required />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
            <button type="submit" className="save-btn">Lançar Compra</button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CardShoppingForm;