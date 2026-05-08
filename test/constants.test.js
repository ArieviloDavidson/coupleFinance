// =============================================
// Testes: constants.js — Estado Atual
// Valida a estrutura exportada por constants.js
// =============================================
import { describe, it, expect } from 'vitest';
import { CATEGORIES, TRANSACTION_TYPES, COLLECTIONS } from '../src/utils/constants.js';

// -----------------------------------------------
// TRANSACTION_TYPES
// -----------------------------------------------
describe('TRANSACTION_TYPES', () => {
  it('deve ter os tipos entrada e saida', () => {
    expect(TRANSACTION_TYPES.ENTRADA).toBe('entrada');
    expect(TRANSACTION_TYPES.SAIDA).toBe('saida');
  });

  it('deve ter exatamente 2 tipos', () => {
    expect(Object.keys(TRANSACTION_TYPES)).toHaveLength(2);
  });
});

// -----------------------------------------------
// CATEGORIES — Estrutura Atual (arrays planos de strings)
// -----------------------------------------------
describe('CATEGORIES', () => {
  it('deve ter categorias indexadas por tipo de transação', () => {
    expect(CATEGORIES[TRANSACTION_TYPES.ENTRADA]).toBeDefined();
    expect(CATEGORIES[TRANSACTION_TYPES.SAIDA]).toBeDefined();
  });

  it('categorias de entrada devem ser um array de strings', () => {
    const cats = CATEGORIES[TRANSACTION_TYPES.ENTRADA];
    expect(Array.isArray(cats)).toBe(true);
    expect(cats.length).toBeGreaterThan(0);
    cats.forEach(cat => {
      expect(typeof cat).toBe('string');
    });
  });

  it('categorias de saída devem ser um array de strings', () => {
    const cats = CATEGORIES[TRANSACTION_TYPES.SAIDA];
    expect(Array.isArray(cats)).toBe(true);
    expect(cats.length).toBeGreaterThan(0);
    cats.forEach(cat => {
      expect(typeof cat).toBe('string');
    });
  });

  it('categorias de entrada atuais', () => {
    const cats = CATEGORIES[TRANSACTION_TYPES.ENTRADA];
    expect(cats).toEqual([
      'Salário',
      'Renda Extra',
      'Investimentos (Resgate)',
      'Presente',
      'Outros',
    ]);
  });

  it('categorias de saída atuais', () => {
    const cats = CATEGORIES[TRANSACTION_TYPES.SAIDA];
    expect(cats).toEqual([
      'Alimentação',
      'Mercado',
      'Contas',
      'Lazer',
      'Investimentos',
      'Transporte',
      'Saúde',
      'Eletrônicos',
      'Pagamento de Cartão',
      'Assinaturas',
      'Outros',
    ]);
  });

  it('não deve ter duplicatas nas categorias de entrada', () => {
    const cats = CATEGORIES[TRANSACTION_TYPES.ENTRADA];
    expect(new Set(cats).size).toBe(cats.length);
  });

  it('não deve ter duplicatas nas categorias de saída', () => {
    const cats = CATEGORIES[TRANSACTION_TYPES.SAIDA];
    expect(new Set(cats).size).toBe(cats.length);
  });
});

// -----------------------------------------------
// COLLECTIONS
// -----------------------------------------------
describe('COLLECTIONS', () => {
  it('deve conter todas as collections do Firestore', () => {
    expect(COLLECTIONS.TRANSACTIONS).toBe('transactions');
    expect(COLLECTIONS.WALLETS).toBe('wallets');
    expect(COLLECTIONS.CARDS).toBe('cards');
    expect(COLLECTIONS.BUDGETS).toBe('budgets');
    expect(COLLECTIONS.CARDS_SHOPPING).toBe('cardsShopping');
    expect(COLLECTIONS.FIXED_EXPENSES).toBe('livingExpenses');
    expect(COLLECTIONS.FIXED_ENTRIES).toBe('fixedEntries');
    expect(COLLECTIONS.ALLOWED_USERS).toBe('allowed_users');
    expect(COLLECTIONS.INVESTMENT_TYPES).toBe('investmentTypes');
    expect(COLLECTIONS.INVESTMENTS).toBe('investments');
    expect(COLLECTIONS.REMINDERS).toBe('reminders');
  });
});

// -----------------------------------------------
// FUTURO: Testes para estrutura hierárquica
// Descomentar quando migrar para categorias + subcategorias
// -----------------------------------------------

// describe('CATEGORIES — Estrutura Hierárquica (futuro)', () => {
//   it('categorias de entrada devem ser um array de objetos com id, label e subcategories', () => {
//     const cats = CATEGORIES[TRANSACTION_TYPES.ENTRADA];
//     cats.forEach(cat => {
//       expect(cat).toHaveProperty('id');
//       expect(cat).toHaveProperty('label');
//       expect(cat).toHaveProperty('subcategories');
//       expect(typeof cat.id).toBe('string');
//       expect(typeof cat.label).toBe('string');
//       expect(Array.isArray(cat.subcategories)).toBe(true);
//       expect(cat.subcategories.length).toBeGreaterThan(0);
//     });
//   });
//
//   it('categorias de saída devem ser um array de objetos com id, label e subcategories', () => {
//     const cats = CATEGORIES[TRANSACTION_TYPES.SAIDA];
//     cats.forEach(cat => {
//       expect(cat).toHaveProperty('id');
//       expect(cat).toHaveProperty('label');
//       expect(cat).toHaveProperty('subcategories');
//     });
//   });
//
//   it('não deve ter IDs duplicados dentro do mesmo tipo', () => {
//     [TRANSACTION_TYPES.ENTRADA, TRANSACTION_TYPES.SAIDA].forEach(type => {
//       const ids = CATEGORIES[type].map(c => c.id);
//       expect(new Set(ids).size).toBe(ids.length);
//     });
//   });
//
//   it('não deve ter subcategorias duplicadas dentro da mesma categoria', () => {
//     [TRANSACTION_TYPES.ENTRADA, TRANSACTION_TYPES.SAIDA].forEach(type => {
//       CATEGORIES[type].forEach(cat => {
//         const unique = new Set(cat.subcategories);
//         expect(unique.size).toBe(cat.subcategories.length);
//       });
//     });
//   });
// });

// describe('Helpers de Categorias (futuro)', () => {
//   it('getCategoryLabel deve retornar o label correto', () => {
//     // expect(getCategoryLabel('moradia')).toBe('Moradia');
//   });
//
//   it('getSubcategories deve retornar subcategorias do grupo', () => {
//     // const subs = getSubcategories(TRANSACTION_TYPES.SAIDA, 'alimentacao');
//     // expect(subs).toContain('Supermercado');
//     // expect(subs).toContain('Restaurantes');
//   });
//
//   it('findCategoryGroupBySubcategory deve encontrar o grupo-pai', () => {
//     // expect(findCategoryGroupBySubcategory(TRANSACTION_TYPES.SAIDA, 'Supermercado')).toBe('Alimentação');
//   });
//
//   it('getAllSubcategories deve retornar array plano de todas as subcategorias', () => {
//     // const all = getAllSubcategories(TRANSACTION_TYPES.SAIDA);
//     // expect(Array.isArray(all)).toBe(true);
//     // expect(all).toContain('Supermercado');
//     // expect(all).toContain('Aluguel');
//   });
// });
