// =============================================
// API: Budgets (Metas e Orçamentos)
// Centraliza todos os acessos à collection "budgets"
// =============================================
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../utils/constants';

/**
 * Busca os limites de orçamento de um mês específico.
 * @param {string} month - Mês no formato YYYY-MM
 * @returns {Promise<Object>} Objeto { category: limit }
 */
export async function fetchBudgetsByMonth(month) {
  const q = query(collection(db, COLLECTIONS.BUDGETS), where("month", "==", month)); // Cria uma query para buscar os limites de orçamento
  const snap = await getDocs(q); // Executa a query

  const limitsObj = {}; // Cria um objeto para armazenar os limites de orçamento
  snap.forEach(doc => { // Itera sobre os documentos encontrados
    const data = doc.data(); // Pega os dados do documento
    limitsObj[data.category] = Number(data.limit); // Adiciona o limite ao objeto
  });

  return limitsObj; // Retorna o objeto com os limites de orçamento
}

/**
 * Salva (cria ou atualiza) o limite de uma categoria para um mês.
 * @param {string} month - Mês no formato YYYY-MM
 * @param {string} category - Nome da categoria
 * @param {number} limit - Valor do limite
 */
export async function saveBudgetLimit(month, category, limit) {
  const docId = `${month}_${category}`; // Cria o ID do documento
  return setDoc(doc(db, COLLECTIONS.BUDGETS, docId), {
    month: month,
    category: category,
    limit: Number(limit)
  }); // Salva o limite de orçamento
}
