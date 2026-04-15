// =============================================
// API: Wallets
// Centraliza todos os acessos à collection "wallets"
// =============================================
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../utils/constants';

/**
 * Escuta todas as carteiras em tempo real.
 * @param {Function} callback - Recebe array de wallets [{ id, ...data }]
 * @returns {Function} unsubscribe
 */
export function subscribeWallets(callback) {
  return onSnapshot(collection(db, COLLECTIONS.WALLETS), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
}

/**
 * Busca todas as carteiras uma única vez (para selects/dropdowns).
 * @returns {Promise<Array>}
 */
export async function fetchWallets() {
  const snap = await getDocs(collection(db, COLLECTIONS.WALLETS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Adiciona uma nova carteira.
 * @param {Object} walletData - Dados da carteira (name, type, currentBalance, color)
 */
export async function addWallet(walletData) {
  return addDoc(collection(db, COLLECTIONS.WALLETS), {
    ...walletData,
    createdAt: new Date()
  });
}

/**
 * Remove uma carteira pelo ID.
 * @param {string} walletId
 */
export async function removeWallet(walletId) {
  return deleteDoc(doc(db, COLLECTIONS.WALLETS, walletId));
}

/**
 * Realiza transferência entre duas carteiras (operação atômica).
 * Cria duas transações (saída na origem, entrada no destino) e atualiza os saldos.
 * @param {Object} transferData - { sourceId, sourceName, destId, destName, value, date }
 */
export async function transferBetweenWallets(transferData) {
  const batch = writeBatch(db);

  // 1. Atualiza Saldos
  const sourceRef = doc(db, COLLECTIONS.WALLETS, transferData.sourceId);
  const destRef = doc(db, COLLECTIONS.WALLETS, transferData.destId);
  batch.update(sourceRef, { currentBalance: increment(-transferData.value) });
  batch.update(destRef, { currentBalance: increment(transferData.value) });

  // 2. Transação de SAÍDA na Origem
  const transactionOutRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
  batch.set(transactionOutRef, {
    description: `Transf. para ${transferData.destName}`,
    value: transferData.value,
    type: 'saida',
    category: 'Transferência',
    date: transferData.date,
    walletId: transferData.sourceId,
    walletName: transferData.sourceName
  });

  // 3. Transação de ENTRADA no Destino
  const transactionInRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
  batch.set(transactionInRef, {
    description: `Transf. de ${transferData.sourceName}`,
    value: transferData.value,
    type: 'entrada',
    category: 'Transferência',
    date: transferData.date,
    walletId: transferData.destId,
    walletName: transferData.destName
  });

  // 4. Executa tudo de uma vez
  await batch.commit();
}
