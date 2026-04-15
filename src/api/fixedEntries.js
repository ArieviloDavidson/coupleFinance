// =============================================
// API: Fixed Entries (Entradas Fixas)
// Centraliza todos os acessos à collection "fixedEntries"
// =============================================
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../utils/constants';

/**
 * Escuta todas as entradas fixas em tempo real.
 * @param {Function} callback - Recebe array de entradas [{ id, ...data }]
 * @returns {Function} unsubscribe
 */
export function subscribeFixedEntries(callback) {
  return onSnapshot(collection(db, COLLECTIONS.FIXED_ENTRIES), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
}

/**
 * Adiciona uma nova entrada fixa.
 * @param {Object} data - { description, value }
 */
export async function addFixedEntry(data) {
  return addDoc(collection(db, COLLECTIONS.FIXED_ENTRIES), {
    description: data.description,
    value: Number(data.value)
  });
}

/**
 * Remove uma entrada fixa pelo ID.
 * @param {string} id
 */
export async function removeFixedEntry(id) {
  return deleteDoc(doc(db, COLLECTIONS.FIXED_ENTRIES, id));
}

/**
 * Recebe uma entrada fixa: cria transação de entrada + incrementa saldo da carteira (operação atômica).
 * @param {Object} entryItem - Item da entrada (description)
 * @param {string} walletId - ID da carteira destino
 * @param {string} walletName - Nome da carteira
 * @param {number} value - Valor recebido
 */
export async function receiveFixedEntry(entryItem, walletId, walletName, value) {
  const batch = writeBatch(db);

  // 1. Cria transação de Entrada
  const transRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
  batch.set(transRef, {
    description: entryItem.description,
    value: value,
    type: 'entrada',
    category: 'Receita Fixa',
    date: new Date(),
    walletId: walletId,
    walletName: walletName
  });

  // 2. Incrementa o saldo da Carteira
  const walletRef = doc(db, COLLECTIONS.WALLETS, walletId);
  batch.update(walletRef, { currentBalance: increment(value) });

  await batch.commit();
}
