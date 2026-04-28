// =============================================
// API: Transactions
// Centraliza todos os acessos à collection "transactions"
// =============================================
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  doc,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, TRANSACTION_TYPES } from '../utils/constants';

/**
 * Escuta todas as transações em tempo real, ordenadas por data desc.
 * @param {Function} callback - Recebe array de transações [{ id, dateObj, ...data }]
 * @returns {Function} unsubscribe
 */
export function subscribeTransactions(callback) {
  const q = query(collection(db, COLLECTIONS.TRANSACTIONS), orderBy('date', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        dateObj: docData.date?.toDate ? docData.date.toDate() : new Date(docData.date)
      };
    });
    callback(data);
  });
}

/**
 * Busca transações de saída (type === 'saida') uma única vez.
 * @returns {Promise<Array>}
 */
export async function fetchExpenseTransactions() {
  const q = query(collection(db, COLLECTIONS.TRANSACTIONS), where("type", "==", "saida"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      dateObj: data.date?.toDate ? data.date.toDate() : new Date(data.date)
    };
  });
}

/**
 * Cria uma transação e atualiza o saldo da carteira (operação atômica).
 * @param {Object} transData - Dados da transação (description, value, type, category, date, walletId, walletName)
 */
export async function addTransactionWithWalletUpdate(transData) {
  const batch = writeBatch(db);

  // A: Cria a transação
  const newTransRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
  batch.set(newTransRef, transData);

  // B: Atualiza saldo da carteira
  if (transData.walletId) {
    const walletRef = doc(db, COLLECTIONS.WALLETS, transData.walletId);
    const amountToAdjust = transData.type === TRANSACTION_TYPES.ENTRADA
      ? transData.value
      : -transData.value;

    batch.update(walletRef, {
      currentBalance: increment(amountToAdjust)
    });
  }

  // C: Executa tudo de uma vez
  await batch.commit();
}

/**
 * Exclui uma transação e estorna o valor para a carteira (operação atômica).
 * @param {Object} transaction - Objeto da transação a excluir (com id, type, value, walletId)
 */
export async function deleteTransactionWithRefund(transaction) {
  const batch = writeBatch(db);

  // A: Deleta a transação
  const transRef = doc(db, COLLECTIONS.TRANSACTIONS, transaction.id);
  batch.delete(transRef);

  // B: Estorna na carteira (lógica inversa)
  if (transaction.walletId) {
    const walletRef = doc(db, COLLECTIONS.WALLETS, transaction.walletId);
    const amountToRevert = transaction.type === TRANSACTION_TYPES.ENTRADA
      ? -transaction.value
      : transaction.value;

    batch.update(walletRef, {
      currentBalance: increment(amountToRevert)
    });
  }

  await batch.commit();
}

/**
 * Cria uma compra no cartão de crédito (1x) a partir do formulário de transação.
 * @param {Object} transData - Dados da transação (description, value, category, date, cardId)
 */
export async function addTransactionWithCard(transData) {
  const batch = writeBatch(db);

  const shoppingRef = doc(collection(db, COLLECTIONS.CARDS_SHOPPING));
  batch.set(shoppingRef, {
    description: transData.description,
    totalValue: transData.value,
    installments: 1,
    installmentValue: transData.value,
    date: transData.date,
    cardId: transData.cardId,
    category: transData.category,
    status: 'aberto',
    installmentIndex: 1,
    originalTotal: transData.value
  });

  await batch.commit();
}
