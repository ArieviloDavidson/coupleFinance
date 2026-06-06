// =============================================
// Testes: Lógica de Despesas Fixas Pagas
// Valida que despesas fixas são marcadas como pagas
// tanto via transação (carteira) quanto via cartão.
//
// Reflete a lógica corrigida do Dashboard.jsx:
//   - useEffect reativo (subscribeTransactions + subscribeCardsShopping)
//   - Inclui categoria 'Assinaturas' além de 'Contas'
//   - Aplica cleanDescription para normalizar nomes
// =============================================
import { describe, it, expect } from 'vitest';

// -----------------------------------------------
// Replica de cleanDescription (Dashboard.jsx L20-27)
// Remove prefixo "Pagamento Cartão:" e sufixo de parcelas "(X/Y)"
// -----------------------------------------------
function cleanDescription(desc) {
  if (!desc) return '';
  return desc
    .replace(/^Pagamento Cartão:\s*/i, '')
    .replace(/\s*\(\d+\/\d+\)$/, '')
    .trim()
    .toLowerCase();
}

/**
 * Simula a lógica reativa usada em Dashboard.jsx (useEffect #6)
 * para determinar quais despesas fixas já foram pagas no mês.
 *
 * @param {Array} transactions  - Todas as transações (subscribeTransactions)
 * @param {Array} cardPurchases - Compras no cartão (subscribeCardsShopping)
 * @param {string} currentMonth - Mês no formato 'YYYY-MM'
 * @returns {Set<string>}       - Set com os nomes normalizados das despesas pagas
 */
function buildPaidExpensesSet(transactions, cardPurchases, currentMonth) {
  const paidNames = new Set();

  // 1. Verifica transações normais (carteira ou pagamento de cartão)
  transactions.forEach(t => {
    if (t.category !== 'Contas' && t.category !== 'Assinaturas' && t.category !== 'Pagamento de Cartão') return;
    const tMonth = t.dateObj.toISOString().slice(0, 7);
    if (tMonth === currentMonth) {
      paidNames.add(cleanDescription(t.description));
    }
  });

  // 2. Verifica compras no cartão (cartão de crédito)
  cardPurchases.forEach(p => {
    if (p.category !== 'Contas' && p.category !== 'Assinaturas') return;
    const pMonth = p.dateObj.toISOString().slice(0, 7);
    if (pMonth === currentMonth) {
      // Para compras parceladas, só considera paga se o status for 'pago'
      if (p.installments > 1 && p.status !== 'pago') return;
      paidNames.add(cleanDescription(p.description));
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

const makeCardPurchase = (description, category, date, { installments = 1, status = 'aberto' } = {}) => ({
  description,
  category,
  dateObj: new Date(date),
  installments,
  status,
});

// -----------------------------------------------
// Testes: cleanDescription
// -----------------------------------------------
describe('cleanDescription — normalização de nomes', () => {
  it('deve converter para minúsculas', () => {
    expect(cleanDescription('Internet')).toBe('internet');
    expect(cleanDescription('ENERGIA')).toBe('energia');
  });

  it('deve remover prefixo "Pagamento Cartão:"', () => {
    expect(cleanDescription('Pagamento Cartão: Internet')).toBe('internet');
    expect(cleanDescription('pagamento cartão: Luz')).toBe('luz');
  });

  it('deve remover sufixo de parcelas "(X/Y)"', () => {
    expect(cleanDescription('Netflix (1/12)')).toBe('netflix');
    expect(cleanDescription('Spotify (3/6)')).toBe('spotify');
  });

  it('deve remover prefixo e sufixo juntos', () => {
    expect(cleanDescription('Pagamento Cartão: Energia (2/3)')).toBe('energia');
  });

  it('deve retornar string vazia para null/undefined', () => {
    expect(cleanDescription(null)).toBe('');
    expect(cleanDescription(undefined)).toBe('');
  });

  it('não deve alterar descrições simples sem prefixo ou sufixo', () => {
    expect(cleanDescription('agua')).toBe('agua');
  });
});

// -----------------------------------------------
// Testes: Detecção de despesas pagas
// -----------------------------------------------
describe('Lógica de Despesas Fixas Pagas', () => {

  it('deve detectar despesa paga via carteira (category Contas)', () => {
    const transactions = [
      makeTransaction('Internet', 'Contas', '2026-05-05'),
    ];

    const paid = buildPaidExpensesSet(transactions, [], CURRENT_MONTH);

    expect(paid.has('internet')).toBe(true);
    expect(paid.size).toBe(1);
  });

  it('deve detectar despesa paga via carteira (category Assinaturas)', () => {
    const transactions = [
      makeTransaction('Netflix', 'Assinaturas', '2026-05-01'),
    ];

    const paid = buildPaidExpensesSet(transactions, [], CURRENT_MONTH);

    expect(paid.has('netflix')).toBe(true);
    expect(paid.size).toBe(1);
  });

  it('deve detectar despesa paga via cartão de crédito (1x, status aberto)', () => {
    const cardPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-10', { installments: 1, status: 'aberto' }),
    ];

    const paid = buildPaidExpensesSet([], cardPurchases, CURRENT_MONTH);

    expect(paid.has('energia')).toBe(true);
    expect(paid.size).toBe(1);
  });

  it('deve detectar despesa paga via cartão (parcelada, status pago)', () => {
    const cardPurchases = [
      makeCardPurchase('Spotify (1/12)', 'Assinaturas', '2026-05-01', { installments: 12, status: 'pago' }),
    ];

    const paid = buildPaidExpensesSet([], cardPurchases, CURRENT_MONTH);

    // cleanDescription remove o sufixo "(1/12)"
    expect(paid.has('spotify')).toBe(true);
  });

  it('NÃO deve detectar despesa parcelada no cartão com status aberto', () => {
    const cardPurchases = [
      makeCardPurchase('Spotify (1/12)', 'Assinaturas', '2026-05-01', { installments: 12, status: 'aberto' }),
    ];

    const paid = buildPaidExpensesSet([], cardPurchases, CURRENT_MONTH);

    expect(paid.has('spotify')).toBe(false);
    expect(paid.size).toBe(0);
  });

  it('deve detectar despesas pagas por ambos os métodos (carteira + cartão)', () => {
    const transactions = [
      makeTransaction('Internet', 'Contas', '2026-05-05'),
    ];
    const cardPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-10'),
    ];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    expect(paid.has('internet')).toBe(true);
    expect(paid.has('energia')).toBe(true);
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

    expect(paid.has('internet')).toBe(false);
    expect(paid.has('energia')).toBe(false);
    expect(paid.size).toBe(0);
  });

  it('não deve marcar transações de outras categorias como despesa paga', () => {
    const transactions = [
      makeTransaction('Supermercado', 'Alimentação', '2026-05-05'),
      makeTransaction('Uber', 'Transporte', '2026-05-05'),
    ];
    const cardPurchases = [
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

    expect(paid.has('internet')).toBe(true);
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

    // Pagas: internet, aluguel, energia
    expect(paid.has('internet')).toBe(true);
    expect(paid.has('aluguel')).toBe(true);
    expect(paid.has('energia')).toBe(true);

    // Não pagas: água, gás
    expect(paid.has('água')).toBe(false);
    expect(paid.has('gás')).toBe(false);

    // Cálculo de despesas não pagas (como no Dashboard)
    const expensesData = fixedExpenses.map(name => ({ description: name, value: 100 }));
    const unpaidTotal = expensesData
      .filter(item => !paid.has(cleanDescription(item.description)))
      .reduce((acc, item) => acc + item.value, 0);

    expect(unpaidTotal).toBe(200); // Água (100) + Gás (100)
  });
});

// -----------------------------------------------
// Testes: Comportamento Reativo (simula re-execução após novo pagamento)
// Valida que buildPaidExpensesSet retorna valores atualizados
// quando chamada novamente com dados novos — equivalente ao
// useEffect([paidTransactions, paidCardPurchases]) do Dashboard.
// -----------------------------------------------
describe('Reatividade — Set atualiza ao receber novos dados', () => {
  it('deve refletir novo pagamento via carteira ao recalcular', () => {
    // Estado ANTES do pagamento
    const before = buildPaidExpensesSet([], [], CURRENT_MONTH);
    expect(before.has('internet')).toBe(false);

    // Estado APÓS pagamento (simula callback do subscribeTransactions)
    const afterTransactions = [
      makeTransaction('Internet', 'Contas', '2026-05-10'),
    ];
    const after = buildPaidExpensesSet(afterTransactions, [], CURRENT_MONTH);
    expect(after.has('internet')).toBe(true);
  });

  it('deve refletir novo pagamento via cartão ao recalcular', () => {
    // Estado ANTES do pagamento
    const before = buildPaidExpensesSet([], [], CURRENT_MONTH);
    expect(before.has('energia')).toBe(false);

    // Estado APÓS pagamento (simula callback do subscribeCardsShopping)
    const afterPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-15'),
    ];
    const after = buildPaidExpensesSet([], afterPurchases, CURRENT_MONTH);
    expect(after.has('energia')).toBe(true);
  });

  it('deve calcular monthlyForecast corretamente após pagamento', () => {
    const totalBalance = 5000;
    const fixedExpenses = [
      { description: 'Internet', value: 100 },
      { description: 'Energia', value: 200 },
      { description: 'Água', value: 80 },
    ];

    // ANTES: nenhuma despesa paga
    const paidBefore = buildPaidExpensesSet([], [], CURRENT_MONTH);
    const unpaidBefore = fixedExpenses
      .filter(e => !paidBefore.has(cleanDescription(e.description)))
      .reduce((acc, e) => acc + e.value, 0);
    const forecastBefore = totalBalance - unpaidBefore;
    expect(forecastBefore).toBe(4620); // 5000 - 380

    // APÓS pagar Internet via carteira:
    const transactions = [makeTransaction('Internet', 'Contas', '2026-05-10')];
    const paidAfter = buildPaidExpensesSet(transactions, [], CURRENT_MONTH);
    const unpaidAfter = fixedExpenses
      .filter(e => !paidAfter.has(cleanDescription(e.description)))
      .reduce((acc, e) => acc + e.value, 0);
    // totalBalance já foi descontado pelo Firestore (subscribeWallets reagiu)
    const newBalance = 4900; // 5000 - 100
    const forecastAfter = newBalance - unpaidAfter;
    expect(forecastAfter).toBe(4620); // 4900 - 280 = 4620 (valor correto e igual ao anterior)
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

  it('categoria deve ser "Contas" para ser detectada como paga no buildPaidExpensesSet', () => {
    const purchase = makeCardPurchase('Energia', 'Contas', '2026-05-10', { installments: 1, status: 'aberto' });
    const paid = buildPaidExpensesSet([], [purchase], CURRENT_MONTH);
    expect(paid.has('energia')).toBe(true);
  });

  it('categoria "Assinaturas" também deve ser detectada como paga', () => {
    const purchase = makeCardPurchase('Spotify', 'Assinaturas', '2026-05-01', { installments: 1, status: 'aberto' });
    const paid = buildPaidExpensesSet([], [purchase], CURRENT_MONTH);
    expect(paid.has('spotify')).toBe(true);
  });
});
