import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import CurrencyInput from '../CurrencyInput/CurrencyInput';
import './FixedEntries.css';
import FixedEntryReceiveModal from '../FixedEntryReceiveModal/FixedEntryReceiveModal';

const FixedEntries = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState([]);
  const [newItem, setNewItem] = useState({ description: '', value: '' });

  // Estado para controlar o modal de recebimento
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Carrega dados da coleção 'fixedEntries'
  useEffect(() => {
    if (!isOpen) return; // Só carrega se o modal estiver aberto

    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.FIXED_ENTRIES), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordena alfabeticamente
      data.sort((a, b) => a.description.localeCompare(b.description));
      setEntries(data);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.description || !newItem.value) return;

    try {
      await addDoc(collection(db, COLLECTIONS.FIXED_ENTRIES), {
        description: newItem.description,
        value: Number(newItem.value)
      });
      setNewItem({ description: '', value: '' });
    } catch (error) {
      console.error("Erro ao adicionar entrada:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remover esta entrada fixa?")) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.FIXED_ENTRIES, id));
      } catch (error) {
        console.error("Erro ao deletar:", error);
      }
    }
  };

  const totalPredicted = entries.reduce((acc, item) => acc + (item.value || 0), 0);

  const openReceiveModal = (item) => {
    setSelectedEntry(item);
    setReceiveModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content fixed-entries-content">
        <div className="modal-header">
          <h3>Entradas Fixas</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Badge de Total */}
        <div className="entries-summary">
          <small>Total Previsto</small>
          <strong>{totalPredicted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>

        <div className="modal-body">
          {/* Lista de Entradas */}
          <div className="fixed-list-entries">
            {entries.length === 0 && <p className="no-data">Nenhuma entrada cadastrada.</p>}

            {entries.map(item => (
              <div key={item.id} className="fixed-item-entry">
                <div className="fixed-info">
                  <span>{item.description}</span>
                </div>

                <div className="fixed-item-right">
                  <strong>
                    {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>

                  {/* BOTÃO GERAR/RECEBER */}
                  <button
                    className="btn-generate-entry"
                    onClick={() => openReceiveModal(item)}
                    title="Receber este valor"
                  >
                    ▶
                  </button>

                  <button onClick={() => handleDelete(item.id)} className="btn-remove-fixed">&times;</button>
                </div>
              </div>
            ))}
          </div>

          {/* Formulário de Adição */}
          <form onSubmit={handleAdd} className="fixed-form-entry">
            <input
              type="text"
              placeholder="Nova entrada (ex: Salário)"
              value={newItem.description}
              onChange={e => setNewItem({ ...newItem, description: e.target.value })}
              autoFocus
            />
            <CurrencyInput
              value={newItem.value}
              onChange={e => setNewItem({ ...newItem, value: e.target.value })}
              placeholder="R$"
            />
            <button type="submit">+</button>
          </form>
        </div>
      </div>

      {/* Modal de Recebimento (Filho) */}
      <FixedEntryReceiveModal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        entryItem={selectedEntry}
      />
    </div>
  );
};

export default FixedEntries;