// =============================================
// API: Investments
// Centraliza todos os acessos às collections "investments" e "investmentTypes"
// =============================================
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  increment,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../utils/constants';

/**
 * Escuta todos os tipos de investimento em tempo real.
 * @param {Function} callback - Recebe array de tipos [{ id, ...data }]
 * @returns {Function} unsubscribe
 */
export function subscribeInvestmentTypes(callback) {
  return onSnapshot(collection(db, COLLECTIONS.INVESTMENT_TYPES), (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

/**
 * Escuta todas as movimentações de investimento em tempo real.
 * @param {Function} callback - Recebe array de movimentações [{ id, dateObj, ...data }]
 * @returns {Function} unsubscribe
 */
export function subscribeInvestments(callback) {
  return onSnapshot(collection(db, COLLECTIONS.INVESTMENTS), (snap) => {
    const data = snap.docs.map(d => {
      const docData = d.data();
      return {
        id: d.id,
        ...docData,
        dateObj: docData.date?.toDate ? docData.date.toDate() : new Date(docData.date)
      };
    });
    // Ordena por data desc
    data.sort((a, b) => b.dateObj - a.dateObj);
    callback(data);
  });
}

/**
 * Adiciona um novo tipo de investimento.
 * @param {Object} typeData - { name, idealPercentage, color }
 */
export async function addInvestmentType(typeData) {
  return addDoc(collection(db, COLLECTIONS.INVESTMENT_TYPES), {
    ...typeData,
    createdAt: new Date()
  });
}

/**
 * Remove um tipo de investimento pelo ID.
 * @param {string} typeId
 */
export async function removeInvestmentType(typeId) {
  return deleteDoc(doc(db, COLLECTIONS.INVESTMENT_TYPES, typeId));
}

/**
 * Atualiza um tipo de investimento (idealPercentage, color).
 * @param {string} typeId
 * @param {Object} updates - { idealPercentage, color }
 */
export async function updateInvestmentType(typeId, updates) {
  return updateDoc(doc(db, COLLECTIONS.INVESTMENT_TYPES, typeId), updates);
}

/**
 * Adiciona uma movimentação de investimento (operação atômica).
 * Cria o investimento, atualiza saldo da carteira e cria transação correspondente.
 * @param {Object} data - Dados da movimentação
 */
export async function addInvestment(data) {
  const batch = writeBatch(db);

  // A) Cria o registro de investimento
  const invRef = doc(collection(db, COLLECTIONS.INVESTMENTS));
  batch.set(invRef, {
    ...data,
    createdAt: new Date()
  });

  // B) Atualiza saldo da carteira (apenas se carteira selecionada)
  if (data.walletId) {
    const walletRef = doc(db, COLLECTIONS.WALLETS, data.walletId);

    if (data.type === 'entrada') {
      batch.update(walletRef, { currentBalance: increment(-data.value) });
    } else {
      batch.update(walletRef, { currentBalance: increment(data.value) });
    }

    // C) Cria transação correspondente na collection principal
    const transRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
    if (data.type === 'entrada') {
      batch.set(transRef, {
        description: data.description,
        value: data.value,
        type: 'saida',
        category: 'Investimentos',
        date: data.date,
        walletId: data.walletId,
        walletName: data.walletName
      });
    } else {
      batch.set(transRef, {
        description: data.description,
        value: data.value,
        type: 'entrada',
        category: 'Investimentos (Resgate)',
        date: data.date,
        walletId: data.walletId,
        walletName: data.walletName
      });
    }
  }

  await batch.commit();
}

/**
 * Exclui uma movimentação de investimento com estorno na carteira (operação atômica).
 * @param {Object} investment - Objeto da movimentação (id, type, value, walletId)
 */
export async function deleteInvestment(investment) {
  const batch = writeBatch(db);

  // Deleta o investimento
  batch.delete(doc(db, COLLECTIONS.INVESTMENTS, investment.id));

  // Estorna na carteira (lógica inversa)
  if (investment.walletId) {
    const walletRef = doc(db, COLLECTIONS.WALLETS, investment.walletId);
    if (investment.type === 'entrada') {
      // Estorno de aporte: devolver dinheiro pra carteira
      batch.update(walletRef, { currentBalance: increment(investment.value) });
    } else {
      // Estorno de resgate: tirar dinheiro da carteira
      batch.update(walletRef, { currentBalance: increment(-investment.value) });
    }
  }

  await batch.commit();
}
