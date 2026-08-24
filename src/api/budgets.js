// =============================================
// API: Budgets (Metas e Orçamentos)
// Centraliza todos os acessos à collection "budgets"
// =============================================
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../utils/constants';

/**
 * Busca todas as metas de orçamento (metas globais por categoria).
 * @returns {Promise<Object>} Objeto { category: limit }
 */
export async function fetchBudgets() {
  const snap = await getDocs(collection(db, COLLECTIONS.BUDGETS));
  const limitsObj = {};
  snap.forEach(doc => {
    const data = doc.data();
    if (data.category) {
      limitsObj[data.category] = Number(data.limit || 0);
    }
  });

  return limitsObj;
}

/**
 * Salva (cria ou atualiza) a meta de uma categoria.
 * @param {string} category - Nome da categoria
 * @param {number} limit - Valor da meta
 */
export async function saveBudgetLimit(category, limit) {
  const docId = category;
  return setDoc(doc(db, COLLECTIONS.BUDGETS, docId), {
    category: category,
    limit: Number(limit)
  });
}

