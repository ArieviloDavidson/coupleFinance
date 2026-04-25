// =============================================
// API: Fixed Expenses (Despesas Fixas)
// Centraliza todos os acessos à collection "livingExpenses"
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
 * Escuta todas as despesas fixas em tempo real.
 * @param {Function} callback - Recebe array de despesas [{ id, ...data }]
 * @returns {Function} unsubscribe
 */
export function subscribeFixedExpenses(callback) {
  return onSnapshot(collection(db, COLLECTIONS.FIXED_EXPENSES), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
}

/**
 * Adiciona uma nova despesa fixa.
 * @param {Object} data - { description, value }
 */
export async function addFixedExpense(data) {
  return addDoc(collection(db, COLLECTIONS.FIXED_EXPENSES), {
    description: data.description,
    value: Number(data.value),
    source: 'manual'
  });
}

/**
 * Remove uma despesa fixa pelo ID.
 * @param {string} id
 */
export async function removeFixedExpense(id) {
  return deleteDoc(doc(db, COLLECTIONS.FIXED_EXPENSES, id));
}

/**
 * Paga uma despesa fixa usando carteira (operação atômica).
 * Cria transação de saída + desconta da carteira.
 * @param {Object} expenseItem - Item da despesa (description)
 * @param {string} walletId - ID da carteira
 * @param {string} walletName - Nome da carteira
 * @param {number} value - Valor a pagar
 */
export async function payFixedExpenseWithWallet(expenseItem, walletId, walletName, value) {
  const batch = writeBatch(db);
  const today = new Date();

  // A. Cria transação de Saída
  const transRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
  batch.set(transRef, {
    description: expenseItem.description,
    value: value,
    type: 'saida',
    category: 'Contas',
    date: today,
    walletId: walletId,
    walletName: walletName
  });

  // B. Desconta da Carteira
  const walletRef = doc(db, COLLECTIONS.WALLETS, walletId);
  batch.update(walletRef, { currentBalance: increment(-value) });

  await batch.commit();
}

/**
 * Paga uma despesa fixa usando cartão de crédito.
 * Cria registro em cardsShopping (1x sem juros).
 * @param {Object} expenseItem - Item da despesa (description)
 * @param {string} cardId - ID do cartão
 * @param {number} value - Valor a pagar
 */
export async function payFixedExpenseWithCard(expenseItem, cardId, value) {
  const today = new Date();

  return addDoc(collection(db, COLLECTIONS.CARDS_SHOPPING), {
    description: expenseItem.description,
    totalValue: value,
    installments: 1,
    installmentValue: value,
    date: today,
    cardId: cardId,
    category: 'Contas',
    status: 'aberto',
    installmentIndex: 1,
    originalTotal: value
  });
}
