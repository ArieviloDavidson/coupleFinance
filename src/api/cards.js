// =============================================
// API: Cards & CardsShopping
// Centraliza todos os acessos às collections "cards" e "cardsShopping"
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
 * Escuta todos os cartões em tempo real.
 * @param {Function} callback - Recebe array de cards [{ id, ...data }]
 * @returns {Function} unsubscribe
 */
export function subscribeCards(callback) {
  return onSnapshot(collection(db, COLLECTIONS.CARDS), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    callback(data);
  });
}

/**
 * Escuta todas as compras de cartão em tempo real.
 * @param {Function} callback - Recebe array de compras [{ id, dateObj, ...data }]
 * @returns {Function} unsubscribe
 */
export function subscribeCardsShopping(callback) {
  return onSnapshot(collection(db, COLLECTIONS.CARDS_SHOPPING), (snapshot) => {
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();

      const dateObj = docData.date?.toDate
        ? docData.date.toDate()
        : (docData.date ? new Date(docData.date) : new Date());

      return {
        ...docData,
        id: doc.id,
        dateObj: dateObj
      };
    });

    // Ordena por data (mais recente primeiro)
    data.sort((a, b) => b.dateObj - a.dateObj);
    callback(data);
  });
}

/**
 * Busca todos os cartões uma única vez (para selects/dropdowns).
 * @returns {Promise<Array>}
 */
export async function fetchCards() {
  const snap = await getDocs(collection(db, COLLECTIONS.CARDS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Busca todas as compras de cartão uma única vez.
 * @returns {Promise<Array>}
 */
export async function fetchCardsShopping() {
  const snap = await getDocs(collection(db, COLLECTIONS.CARDS_SHOPPING));
  return snap.docs.map(d => {
    const docData = d.data();
    const dateObj = docData.date?.toDate
      ? docData.date.toDate()
      : (docData.date ? new Date(docData.date) : new Date());
    return { id: d.id, ...docData, dateObj };
  });
}

/**
 * Adiciona um novo cartão.
 * @param {Object} cardData - Dados do cartão
 */
export async function addCard(cardData) {
  return addDoc(collection(db, COLLECTIONS.CARDS), {
    ...cardData,
    owner: 'Eu',
    createdAt: new Date()
  });
}

/**
 * Remove um cartão pelo ID.
 * @param {string} cardId
 */
export async function removeCard(cardId) {
  return deleteDoc(doc(db, COLLECTIONS.CARDS, cardId));
}

/**
 * Adiciona uma compra parcelada (cria uma entrada por parcela no batch).
 * @param {Object} purchaseData - Dados da compra (description, totalValue, installments, installmentValue, date, cardId, category)
 */
export async function addCardPurchase(purchaseData) {
  const batch = writeBatch(db);
  const installments = Number(purchaseData.installments);
  const installmentValue = Number(purchaseData.installmentValue);

  // Garante que é um objeto Date
  const baseDate = new Date(purchaseData.date);

  // Loop para criar UMA entrada por parcela
  for (let i = 1; i <= installments; i++) {
    const newDocRef = doc(collection(db, COLLECTIONS.CARDS_SHOPPING));

    // Calcula a data desta parcela (Incrementa os meses)
    const parcelDate = new Date(baseDate);
    parcelDate.setMonth(parcelDate.getMonth() + (i - 1));

    // Define os dados desta parcela
    batch.set(newDocRef, {
      ...purchaseData,
      description: installments > 1 ? `${purchaseData.description} (${i}/${installments})` : purchaseData.description,
      totalValue: installmentValue,
      date: parcelDate,
      installmentIndex: i,
      originalTotal: purchaseData.totalValue,
      status: 'aberto'
    });
  }

  await batch.commit();
}

/**
 * Remove uma compra de cartão pelo ID.
 * @param {string} purchaseId
 */
export async function removeCardPurchase(purchaseId) {
  return deleteDoc(doc(db, COLLECTIONS.CARDS_SHOPPING, purchaseId));
}

/**
 * Processa o pagamento de uma compra de cartão (operação atômica).
 * Marca como pago, desconta da carteira e cria transação de histórico.
 * @param {Object} purchase - Objeto da compra (id, description, totalValue)
 * @param {string} walletId - ID da carteira usada para pagar
 * @param {string} walletName - Nome da carteira
 */
export async function payCardPurchase(purchase, walletId, walletName) {
  const batch = writeBatch(db);

  // 1. Atualiza o status da compra para 'pago'
  const purchaseRef = doc(db, COLLECTIONS.CARDS_SHOPPING, purchase.id);
  batch.update(purchaseRef, { status: 'pago' });

  // 2. Desconta o valor da Wallet
  const walletRef = doc(db, COLLECTIONS.WALLETS, walletId);
  batch.update(walletRef, { currentBalance: increment(-purchase.totalValue) });

  // 3. Cria o registro histórico na Transactions
  const newTransactionRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
  batch.set(newTransactionRef, {
    description: `Pagamento Cartão: ${purchase.description}`,
    value: Number(purchase.totalValue),
    type: 'saida',
    category: 'Pagamento de Cartão',
    date: new Date(),
    walletId: walletId,
    walletName: walletName,
    paymentMethod: 'payment_bill'
  });

  await batch.commit();
}
