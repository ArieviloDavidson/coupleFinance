// =============================================
// API: Auth
// Centraliza verificação de usuários permitidos
// =============================================
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../utils/constants';

/**
 * Verifica se um email está na lista de usuários permitidos.
 * @param {string} email - Email do usuário
 * @returns {Promise<boolean>} true se permitido, false se não
 */
export async function checkAllowedUser(email) {
  const usersRef = collection(db, COLLECTIONS.ALLOWED_USERS); // Pega a coleção de usuários permitidos
  const q = query(usersRef, where("email", "==", email)); // Cria uma query para buscar o email
  const querySnapshot = await getDocs(q); // Executa a query
  return !querySnapshot.empty; // Retorna true se o email for encontrado, false caso contrário
}
