import React, { useState, useEffect } from 'react';
import { fetchWallets } from '../../api/wallets';
import { fetchCards } from '../../api/cards';
import { payFixedExpenseWithWallet, payFixedExpenseWithCard } from '../../api/fixedExpenses';
import CurrencyInput from '../CurrencyInput/CurrencyInput';
import './FixedExpensesPayModal.css';

const FixedExpensePayModal = ({ isOpen, onClose, expenseItem }) => {
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' ou 'card'
  const [selectedSourceId, setSelectedSourceId] = useState('');

  const [wallets, setWallets] = useState([]);
  const [cards, setCards] = useState([]);

  // Permite editar o valor na hora de pagar (ex: conta de luz varia)
  const [currentValue, setCurrentValue] = useState('');

  // Carrega Wallets e Cards quando abre
  useEffect(() => {
    if (isOpen && expenseItem) {
      setCurrentValue(expenseItem.value); // Preenche com o valor padrão

      const fetchData = async () => {
        const walletsData = await fetchWallets();
        setWallets(walletsData);

        const cardsData = await fetchCards();
        setCards(cardsData);
      };
      fetchData();
    }
  }, [isOpen, expenseItem]);

  // Define uma fonte padrão assim que os dados carregam
  useEffect(() => {
    if (paymentMethod === 'wallet' && wallets.length > 0) setSelectedSourceId(wallets[0].id);
    if (paymentMethod === 'card' && cards.length > 0) setSelectedSourceId(cards[0].id);
  }, [paymentMethod, wallets, cards]);

  if (!isOpen || !expenseItem) return null;

  const handleConfirm = async () => {
    try {
      const val = Number(currentValue);

      if (paymentMethod === 'wallet') {
        // --- CENÁRIO 1: PAGAMENTO VIA CARTEIRA ---
        const walletName = wallets.find(w => w.id === selectedSourceId)?.name || 'Carteira';
        await payFixedExpenseWithWallet(expenseItem, selectedSourceId, walletName, val);
        alert(`Conta "${expenseItem.description}" paga via ${walletName}!`);
      } else {
        // --- CENÁRIO 2: PAGAMENTO VIA CARTÃO DE CRÉDITO ---
        const selectedCard = cards.find(c => c.id === selectedSourceId);
        await payFixedExpenseWithCard(expenseItem, selectedCard || selectedSourceId, val);
        alert(`Conta "${expenseItem.description}" lançada no cartão!`);
      }

      onClose();

    } catch (error) {
      console.error("Erro ao gerar despesa:", error);
      alert("Erro ao processar.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Gerar Despesa</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="form-group">
          <label>Despesa</label>
          <input type="text" value={expenseItem.description} disabled style={{ background: '#f0f0f0' }} />
        </div>

        <div className="form-group">
          <label>Valor (R$)</label>
          <CurrencyInput
            value={currentValue}
            onChange={e => setCurrentValue(e.target.value)}
          />
          <small>Você pode ajustar o valor se veio diferente.</small>
        </div>

        <div className="form-group">
          <label>Método de Pagamento</label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button
              type="button"
              className={`toggle-btn ${paymentMethod === 'wallet' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('wallet')}
            >
              Carteira / Débito
            </button>
            <button
              type="button"
              className={`toggle-btn ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              Cartão de Crédito
            </button>
          </div>
        </div>

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
          <button onClick={handleConfirm} className="save-btn">Confirmar Pagamento</button>
        </div>
      </div>
    </div>
  );
};

export default FixedExpensePayModal;