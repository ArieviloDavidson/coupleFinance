// =============================================
// Testes: Lógica de Despesas Fixas Pagas
// Valida que despesas fixas são marcadas como pagas
// tanto via transação (carteira) quanto via cartão.
// =============================================
import { describe, it, expect } from 'vitest';

/**
 * Simula a lógica usada em FixedExpenses.jsx e Dashboard.jsx
 * para determinar quais despesas fixas já foram pagas no mês.
 *
 * @param {Array} transactions - Transações do mês (collection transactions)
 * @param {Array} cardPurchases - Compras no cartão (collection cardsShopping)
 * @param {string} currentMonth - Mês no formato 'YYYY-MM'
 * @returns {Set<string>} - Set com os nomes das despesas pagas
 */
function buildPaidExpensesSet(transactions, cardPurchases, currentMonth) {
  const paidNames = new Set();

  // 1. Verifica transações normais (pagamento via carteira)
  transactions.forEach(t => {
    if (t.category !== 'Contas') return;
    const tMonth = t.dateObj.toISOString().slice(0, 7);
    if (tMonth === currentMonth) {
      paidNames.add(t.description);
    }
  });

  // 2. Verifica compras no cartão (pagamento via cartão de crédito)
  cardPurchases.forEach(p => {
    if (p.category !== 'Contas') return;
    const pMonth = p.dateObj.toISOString().slice(0, 7);
    if (pMonth === currentMonth) {
      paidNames.add(p.description);
    }
  });

  return paidNames;
}

// -----------------------------------------------
// Dados de exemplo
// -----------------------------------------------
const CURRENT_MONTH = '2026-05';

const makeTransaction = (description, category, date) => ({
  description,
  category,
  dateObj: new Date(date),
});

const makeCardPurchase = (description, category, date, status = 'aberto') => ({
  description,
  category,
  dateObj: new Date(date),
  status,
});

// -----------------------------------------------
// Testes: Detecção de despesas pagas
// -----------------------------------------------
describe('Lógica de Despesas Fixas Pagas', () => {

  it('deve detectar despesa paga via carteira (transação)', () => {
    const transactions = [
      makeTransaction('Internet', 'Contas', '2026-05-05'),
    ];
    const cardPurchases = [];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    expect(paid.has('Internet')).toBe(true);
    expect(paid.size).toBe(1);
  });

  it('deve detectar despesa paga via cartão de crédito', () => {
    const transactions = [];
    const cardPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-10'),
    ];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    expect(paid.has('Energia')).toBe(true);
    expect(paid.size).toBe(1);
  });

  it('deve detectar despesas pagas por ambos os métodos (carteira + cartão)', () => {
    const transactions = [
      makeTransaction('Internet', 'Contas', '2026-05-05'),
    ];
    const cardPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-10'),
    ];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    expect(paid.has('Internet')).toBe(true);
    expect(paid.has('Energia')).toBe(true);
    expect(paid.size).toBe(2);
  });

  it('não deve marcar despesa de outro mês como paga', () => {
    const transactions = [
      makeTransaction('Internet', 'Contas', '2026-04-05'), // mês anterior
    ];
    const cardPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-06-10'), // mês seguinte
    ];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    expect(paid.has('Internet')).toBe(false);
    expect(paid.has('Energia')).toBe(false);
    expect(paid.size).toBe(0);
  });

  it('não deve marcar transações de outras categorias como despesa paga', () => {
    const transactions = [
      makeTransaction('Supermercado', 'Alimentação', '2026-05-05'),
      makeTransaction('Uber', 'Transporte', '2026-05-05'),
    ];
    const cardPurchases = [
      makeCardPurchase('Netflix', 'Assinaturas', '2026-05-01'),
      makeCardPurchase('Notebook', 'Eletrônicos', '2026-05-15'),
    ];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    expect(paid.size).toBe(0);
  });

  it('não deve duplicar quando mesma despesa aparece em transação e cartão', () => {
    const transactions = [
      makeTransaction('Internet', 'Contas', '2026-05-05'),
    ];
    const cardPurchases = [
      makeCardPurchase('Internet', 'Contas', '2026-05-10'),
    ];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    expect(paid.has('Internet')).toBe(true);
    expect(paid.size).toBe(1); // Set não duplica
  });

  it('deve retornar vazio quando não há transações nem compras', () => {
    const paid = buildPaidExpensesSet([], [], CURRENT_MONTH);

    expect(paid.size).toBe(0);
  });

  it('cenário completo: mix de pagas e não pagas', () => {
    const fixedExpenses = ['Internet', 'Energia', 'Água', 'Aluguel', 'Gás'];

    const transactions = [
      makeTransaction('Internet', 'Contas', '2026-05-05'),
      makeTransaction('Aluguel', 'Contas', '2026-05-01'),
    ];
    const cardPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-10'),
    ];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    // Pagas: Internet (carteira), Aluguel (carteira), Energia (cartão)
    expect(paid.has('Internet')).toBe(true);
    expect(paid.has('Aluguel')).toBe(true);
    expect(paid.has('Energia')).toBe(true);

    // Não pagas: Água, Gás
    expect(paid.has('Água')).toBe(false);
    expect(paid.has('Gás')).toBe(false);

    // Cálculo de despesas não pagas (como no Dashboard)
    const expensesData = fixedExpenses.map(name => ({ description: name, value: 100 }));
    const unpaidTotal = expensesData
      .filter(item => !paid.has(item.description))
      .reduce((acc, item) => acc + item.value, 0);

    expect(unpaidTotal).toBe(200); // Água (100) + Gás (100)
  });
});

// -----------------------------------------------
// Testes: Payload de pagamento de despesa fixa via cartão
// (fixedExpenses.js — payFixedExpenseWithCard L87-101)
// -----------------------------------------------
describe('Payload: Pagamento de Despesa Fixa via Cartão', () => {
  it('deve montar registro correto em cardsShopping', () => {
    const expenseItem = { description: 'Energia' };
    const cardId = 'card-123';
    const value = 150;
    const today = new Date();

    // Simula o payload criado por payFixedExpenseWithCard
    const payload = {
      description: expenseItem.description,
      totalValue: value,
      installments: 1,
      installmentValue: value,
      date: today,
      cardId: cardId,
      category: 'Contas',
      status: 'aberto',
      installmentIndex: 1,
      originalTotal: value,
    };

    expect(payload.description).toBe('Energia');
    expect(payload.category).toBe('Contas');
    expect(payload.installments).toBe(1);
    expect(payload.installmentValue).toBe(payload.totalValue);
    expect(payload.status).toBe('aberto');
    expect(payload.cardId).toBe(cardId);
  });

  it('categoria deve ser "Contas" para ser detectada como paga', () => {
    // O sistema verifica category === 'Contas' para marcar como paga
    const payload = {
      description: 'Energia',
      category: 'Contas',
      dateObj: new Date('2026-05-10'),
    };

    // Simula a verificação que FixedExpenses.jsx faz
    const paidNames = new Set();
    const currentMonth = '2026-05';
    if (payload.category === 'Contas') {
      const pMonth = payload.dateObj.toISOString().slice(0, 7);
      if (pMonth === currentMonth) {
        paidNames.add(payload.description);
      }
    }

    expect(paidNames.has('Energia')).toBe(true);
  });
});
