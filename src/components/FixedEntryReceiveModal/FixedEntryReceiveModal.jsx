import React, { useState, useEffect } from 'react';
import { collection, getDocs, writeBatch, doc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import CurrencyInput from '../CurrencyInput/CurrencyInput';
import './FixedEntryReceiveModal.css';

const FixedEntryReceiveModal = ({ isOpen, onClose, entryItem }) => {
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [wallets, setWallets] = useState([]);
  const [currentValue, setCurrentValue] = useState('');

  // Carrega Wallets quando abre
  useEffect(() => {
    if (isOpen && entryItem) {
      setCurrentValue(entryItem.value);

      const fetchData = async () => {
        const wSnap = await getDocs(collection(db, COLLECTIONS.WALLETS));
        const walletList = wSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setWallets(walletList);

        // Seleciona a primeira carteira por padrão
        if (walletList.length > 0) setSelectedWalletId(walletList[0].id);
      };
      fetchData();
    }
  }, [isOpen, entryItem]);

  if (!isOpen || !entryItem) return null;

  const handleConfirm = async () => {
    try {
      const val = Number(currentValue);
      const batch = writeBatch(db);

      // 1. Cria transação de Entrada
      const transRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
      const walletName = wallets.find(w => w.id === selectedWalletId)?.name || 'Carteira';

      batch.set(transRef, {
        description: entryItem.description,
        value: val,
        type: 'entrada',
        category: 'Receita Fixa', // Categoria automática
        date: new Date(),
        walletId: selectedWalletId,
        walletName: walletName
      });

      // 2. Incrementa o saldo da Carteira
      const walletRef = doc(db, COLLECTIONS.WALLETS, selectedWalletId);
      batch.update(walletRef, { currentBalance: increment(val) });

      await batch.commit();
      alert(`Entrada "${entryItem.description}" recebida na carteira ${walletName}!`);

      onClose();

    } catch (error) {
      console.error("Erro ao gerar entrada:", error);
      alert("Erro ao processar.");
    }
  };

  return (
    <div className="sub-modal-overlay"> {/* Classe diferente para sobrepor o modal pai */}
      <div className="sub-modal-content">
        <div className="modal-header">
          <h3>Receber Entrada</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="form-group">
          <label>Descrição</label>
          <input type="text" value={entryItem.description} disabled style={{ background: '#f0f0f0' }} />
        </div>

        <div className="form-group">
          <label>Valor Recebido (R$)</label>
          <CurrencyInput
            value={currentValue}
            onChange={e => setCurrentValue(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Carteira de Destino</label>
          <select
            value={selectedWalletId}
            onChange={e => setSelectedWalletId(e.target.value)}
            style={{ width: '100%', padding: '10px' }}
          >
            {wallets.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-btn">Cancelar</button>
          <button onClick={handleConfirm} className="save-btn-green">Confirmar Recebimento</button>
        </div>
      </div>
    </div>
  );
};

export default FixedEntryReceiveModal;