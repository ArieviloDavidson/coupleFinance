import React, { useState, useEffect } from 'react';
import { collection, getDocs, writeBatch, doc, increment, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
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
        const wSnap = await getDocs(collection(db, COLLECTIONS.WALLETS));
        setWallets(wSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const cSnap = await getDocs(collection(db, COLLECTIONS.CARDS));
        setCards(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      const today = new Date(); // Data do pagamento é HOJE

      if (paymentMethod === 'wallet') {
        // --- CENÁRIO 1: PAGAMENTO VIA CARTEIRA ---
        const batch = writeBatch(db);

        // A. Cria transação de Saída
        const transRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
        const walletName = wallets.find(w => w.id === selectedSourceId)?.name || 'Carteira';

        batch.set(transRef, {
          description: expenseItem.description,
          value: val,
          type: 'saida',
          category: 'Contas', // Categoria fixa para despesas fixas
          date: today,
          walletId: selectedSourceId,
          walletName: walletName
        });

        // B. Desconta da Carteira
        const walletRef = doc(db, COLLECTIONS.WALLETS, selectedSourceId);
        batch.update(walletRef, { currentBalance: increment(-val) });

        await batch.commit();
        alert(`Conta "${expenseItem.description}" paga via ${walletName}!`);

      } else {
        // --- CENÁRIO 2: PAGAMENTO VIA CARTÃO DE CRÉDITO ---
        // Cria registro em cardsShopping (Assumindo 1x sem juros)
        await addDoc(collection(db, COLLECTIONS.CARDS_SHOPPING), {
          description: expenseItem.description,
          totalValue: val,
          installments: 1,
          installmentValue: val,
          date: today,
          cardId: selectedSourceId,
          category: 'Contas',
          status: 'aberto',
          installmentIndex: 1,
          originalTotal: val
        });
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