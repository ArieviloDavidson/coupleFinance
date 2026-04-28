import React, { useState, useEffect } from 'react';
import { fetchWallets } from '../../api/wallets';
import { fetchCards } from '../../api/cards';
import { CATEGORIES, TRANSACTION_TYPES } from '../../utils/constants';
import CurrencyInput from '../CurrencyInput/CurrencyInput';
import './TransactionForm.css';

const TransactionForm = ({ isOpen, onClose, onSave }) => {
  const [wallets, setWallets] = useState([]);
  const [cards, setCards] = useState([]);

  const [description, setDescription] = useState('');
  const [transType, setTransType] = useState(TRANSACTION_TYPES.SAIDA);
  const [category, setCategory] = useState('');
  const [value, setValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' ou 'card'
  const [selectedSourceId, setSelectedSourceId] = useState('');

  // Carrega Wallets e Cards quando abre
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        const walletsData = await fetchWallets();
        setWallets(walletsData);

        const cardsData = await fetchCards();
        setCards(cardsData);
      };
      loadData();
    }
  }, [isOpen]);

  // Quando muda o tipo, reseta a categoria
  useEffect(() => {
    const cats = CATEGORIES[transType];
    if (cats && cats.length > 0) {
      setCategory(cats[0]);
    }
  }, [transType]);

  // Quando muda para 'entrada', força carteira (não faz sentido receber via cartão)
  useEffect(() => {
    if (transType === TRANSACTION_TYPES.ENTRADA) {
      setPaymentMethod('wallet');
    }
  }, [transType]);

  // Define uma fonte padrão assim que os dados carregam
  useEffect(() => {
    if (paymentMethod === 'wallet' && wallets.length > 0) setSelectedSourceId(wallets[0].id);
    if (paymentMethod === 'card' && cards.length > 0) setSelectedSourceId(cards[0].id);
  }, [paymentMethod, wallets, cards]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const numericValue = Number(value);
    if (!numericValue || numericValue <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    if (paymentMethod === 'wallet') {
      const selectedWallet = wallets.find(w => w.id === selectedSourceId);
      onSave({
        description,
        value: numericValue,
        type: transType,
        category,
        date: new Date(),
        walletId: selectedSourceId,
        walletName: selectedWallet ? selectedWallet.name : 'Desconhecida',
        paymentMethod: 'wallet'
      });
    } else {
      // Cartão de crédito
      onSave({
        description,
        value: numericValue,
        type: transType,
        category,
        date: new Date(),
        cardId: selectedSourceId,
        paymentMethod: 'card'
      });
    }

    onClose();
    // Reset
    setDescription('');
    setTransType(TRANSACTION_TYPES.SAIDA);
    setCategory('');
    setValue('');
    setPaymentMethod('wallet');
    setSelectedSourceId('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3>Nova Movimentação</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Descrição */}
          <div className="form-group">
            <label>Descrição</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Mercado Semanal, Jantar..."
              required
            />
          </div>

          {/* Tipo de Transação - Toggle Buttons */}
          <div className="form-group">
            <label>Tipo de Transação</label>
            <div className="reminder-toggle-row">
              <button
                type="button"
                className={`toggle-btn ${transType === TRANSACTION_TYPES.SAIDA ? 'active toggle-saida' : ''}`}
                onClick={() => setTransType(TRANSACTION_TYPES.SAIDA)}
              >
                Saída
              </button>
              <button
                type="button"
                className={`toggle-btn ${transType === TRANSACTION_TYPES.ENTRADA ? 'active toggle-entrada' : ''}`}
                onClick={() => setTransType(TRANSACTION_TYPES.ENTRADA)}
              >
                Entrada
              </button>
            </div>
          </div>

          {/* Categoria */}
          <div className="form-group">
            <label>Categoria</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
            >
              {(CATEGORIES[transType] || []).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Valor */}
          <div className="form-group">
            <label>Valor (R$)</label>
            <CurrencyInput
              value={value}
              onChange={e => setValue(e.target.value)}
              required
            />
            <small>Informe o valor da transação.</small>
          </div>

          {/* Método de Pagamento - Toggle Buttons */}
          <div className="form-group">
            <label>Método</label>
            <div className="reminder-toggle-row">
              <button
                type="button"
                className={`toggle-btn ${paymentMethod === 'wallet' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('wallet')}
              >
                Carteira / Débito
              </button>
              {/* Esconde opção de cartão para entradas */}
              {transType === TRANSACTION_TYPES.SAIDA && (
                <button
                  type="button"
                  className={`toggle-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  Cartão de Crédito
                </button>
              )}
            </div>
          </div>

          {/* Selecionar Origem */}
          <div className="form-group">
            <label>Selecione a Origem</label>
            <select
              value={selectedSourceId}
              onChange={e => setSelectedSourceId(e.target.value)}
              required
            >
              {paymentMethod === 'wallet'
                ? wallets.map(w => <option key={w.id} value={w.id}>{w.name} (R$ {w.currentBalance.toFixed(2)})</option>)
                : cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
              }
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
            <button type="submit" className="save-btn">Confirmar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;