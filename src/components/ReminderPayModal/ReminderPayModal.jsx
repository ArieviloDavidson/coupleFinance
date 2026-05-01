import React, { useState, useEffect } from 'react';
import { fetchWallets } from '../../api/wallets';
import { fetchCards } from '../../api/cards';
import { payReminderWithWallet, payReminderWithCard } from '../../api/reminders';
import { CATEGORIES, TRANSACTION_TYPES } from '../../utils/constants';
import CurrencyInput from '../CurrencyInput/CurrencyInput';
import './ReminderPayModal.css';

const ReminderPayModal = ({ isOpen, onClose, reminderItem }) => {
  const [transType, setTransType] = useState(TRANSACTION_TYPES.SAIDA);
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' ou 'card'
  const [selectedSourceId, setSelectedSourceId] = useState('');

  const [wallets, setWallets] = useState([]);
  const [cards, setCards] = useState([]);

  // Permite editar o valor na hora de pagar
  const [currentValue, setCurrentValue] = useState('');

  // Permite escolher a data da transação
  const [transDate, setTransDate] = useState('');

  // Carrega Wallets e Cards quando abre
  useEffect(() => {
    if (isOpen && reminderItem) {
      setCurrentValue(reminderItem.value);
      setTransDate(new Date().toISOString().slice(0, 10)); // Data padrão: hoje
      setTransType(TRANSACTION_TYPES.SAIDA);
      setPaymentMethod('wallet');

      const fetchData = async () => {
        const walletsData = await fetchWallets();
        setWallets(walletsData);

        const cardsData = await fetchCards();
        setCards(cardsData);
      };
      fetchData();
    }
  }, [isOpen, reminderItem]);

  // Define categoria padrão quando muda o tipo
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

  if (!isOpen || !reminderItem) return null;

  const handleConfirm = async () => {
    try {
      const val = Number(currentValue);

      // Converte a data selecionada para um objeto Date (meio-dia para evitar problemas de fuso)
      const [year, month, day] = transDate.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day, 12, 0, 0);

      if (paymentMethod === 'wallet') {
        const walletName = wallets.find(w => w.id === selectedSourceId)?.name || 'Carteira';
        await payReminderWithWallet(reminderItem, selectedSourceId, walletName, val, transType, category, selectedDate);
        alert(`Lembrete "${reminderItem.description}" processado via ${walletName}!`);
      } else {
        await payReminderWithCard(reminderItem, selectedSourceId, val, category, selectedDate);
        alert(`Lembrete "${reminderItem.description}" lançado no cartão!`);
      }

      onClose();

    } catch (error) {
      console.error("Erro ao processar lembrete:", error);
      alert("Erro ao processar.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3>Gerar Transação</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Descrição (readonly) */}
        <div className="form-group">
          <label>Lembrete</label>
          <input type="text" value={reminderItem.description} disabled style={{ background: '#f0f0f0' }} />
        </div>

        {/* Tipo de Transação */}
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
            style={{ width: '100%', padding: '10px' }}
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
            value={currentValue}
            onChange={e => setCurrentValue(e.target.value)}
          />
          <small>Você pode ajustar o valor se necessário.</small>
        </div>

        {/* Data */}
        <div className="form-group">
          <label>Data</label>
          <input
            type="date"
            value={transDate}
            onChange={e => setTransDate(e.target.value)}
            style={{ width: '100%', padding: '10px' }}
          />
        </div>

        {/* Método de Pagamento */}
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
            style={{ width: '100%', padding: '10px' }}
          >
            {paymentMethod === 'wallet'
              ? wallets.map(w => <option key={w.id} value={w.id}>{w.name} (R$ {w.currentBalance.toFixed(2)})</option>)
              : cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
            }
          </select>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-btn">Cancelar</button>
          <button onClick={handleConfirm} className="save-btn">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

export default ReminderPayModal;
