// =============================================
// API: Reminders (Lembretes Financeiros)
// Centraliza todos os acessos à collection "reminders"
// =============================================
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  increment,
  orderBy,
  query
} from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, TRANSACTION_TYPES } from '../utils/constants';

/**
 * Escuta todos os lembretes em tempo real, ordenados por dueDate ASC.
 * @param {Function} callback - Recebe array de lembretes [{ id, dueDateObj, ...data }]
 * @returns {Function} unsubscribe
 */
export function subscribeReminders(callback) {
  const q = query(collection(db, COLLECTIONS.REMINDERS), orderBy('dueDate', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        dueDateObj: docData.dueDate?.toDate ? docData.dueDate.toDate() : new Date(docData.dueDate)
      };
    });
    callback(data);
  });
}

/**
 * Adiciona um novo lembrete.
 * @param {Object} data - { description, value, dueDate }
 */
export async function addReminder(data) {
  return addDoc(collection(db, COLLECTIONS.REMINDERS), {
    description: data.description,
    value: Number(data.value),
    dueDate: data.dueDate,
    completed: false,
    createdAt: new Date()
  });
}

/**
 * Alterna o status de concluído de um lembrete.
 * @param {string} id - ID do lembrete
 * @param {boolean} currentStatus - Status atual (true/false)
 */
export async function toggleReminderCompleted(id, currentStatus) {
  return updateDoc(doc(db, COLLECTIONS.REMINDERS, id), {
    completed: !currentStatus
  });
}

/**
 * Remove um lembrete pelo ID.
 * @param {string} id
 */
export async function removeReminder(id) {
  return deleteDoc(doc(db, COLLECTIONS.REMINDERS, id));
}

/**
 * Paga um lembrete usando carteira (operação atômica).
 * Cria transação (entrada ou saída) + ajusta saldo da carteira + marca como concluído.
 * @param {Object} reminder - Item do lembrete ({ id, description })
 * @param {string} walletId - ID da carteira
 * @param {string} walletName - Nome da carteira
 * @param {number} value - Valor a pagar/receber
 * @param {string} transType - 'entrada' ou 'saida'
 * @param {string} category - Categoria da transação
 */
export async function payReminderWithWallet(reminder, walletId, walletName, value, transType, category) {
  const batch = writeBatch(db);
  const today = new Date();

  // A. Cria transação
  const transRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
  batch.set(transRef, {
    description: reminder.description,
    value: value,
    type: transType,
    category: category,
    date: today,
    walletId: walletId,
    walletName: walletName
  });

  // B. Ajusta saldo da carteira (entrada soma, saída subtrai)
  const walletRef = doc(db, COLLECTIONS.WALLETS, walletId);
  const amountToAdjust = transType === TRANSACTION_TYPES.ENTRADA ? value : -value;
  batch.update(walletRef, { currentBalance: increment(amountToAdjust) });

  // C. Marca lembrete como concluído
  const reminderRef = doc(db, COLLECTIONS.REMINDERS, reminder.id);
  batch.update(reminderRef, { completed: true });

  await batch.commit();
}

/**
 * Paga um lembrete usando cartão de crédito (apenas saída).
 * Cria registro em cardsShopping (1x sem juros) + marca como concluído.
 * @param {Object} reminder - Item do lembrete ({ id, description })
 * @param {string} cardId - ID do cartão
 * @param {number} value - Valor a pagar
 * @param {string} category - Categoria da transação
 */
export async function payReminderWithCard(reminder, cardId, value, category) {
  const batch = writeBatch(db);
  const today = new Date();

  // A. Cria registro em cardsShopping
  const shoppingRef = doc(collection(db, COLLECTIONS.CARDS_SHOPPING));
  batch.set(shoppingRef, {
    description: reminder.description,
    totalValue: value,
    installments: 1,
    installmentValue: value,
    date: today,
    cardId: cardId,
    category: category,
    status: 'aberto',
    installmentIndex: 1,
    originalTotal: value
  });

  // B. Marca lembrete como concluído
  const reminderRef = doc(db, COLLECTIONS.REMINDERS, reminder.id);
  batch.update(reminderRef, { completed: true });

  await batch.commit();
}
