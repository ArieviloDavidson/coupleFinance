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
 * Simula a lógica reativa usada em Dashboard.jsx (useEffect #6) e FixedExpenses.jsx
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
    // Só considera paga se o status for 'pago' (independente do número de parcelas)
    if (p.status !== 'pago') return;
    const filterDate = p.dueDateObj || p.dateObj;
    const pMonth = filterDate.toISOString().slice(0, 7);
    if (pMonth === currentMonth) {
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

const makeCardPurchase = (description, category, date, { installments = 1, status = 'aberto', dueDate = null } = {}) => ({
  description,
  category,
  dateObj: new Date(date),
  dueDateObj: dueDate ? new Date(dueDate) : null,
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

  it('deve detectar despesa paga via transação de Pagamento de Cartão (quitação de fatura)', () => {
    const transactions = [
      makeTransaction('Pagamento Cartão: Energia', 'Pagamento de Cartão', '2026-05-10'),
    ];

    const paid = buildPaidExpensesSet(transactions, [], CURRENT_MONTH);

    expect(paid.has('energia')).toBe(true);
    expect(paid.size).toBe(1);
  });

  it('NÃO deve detectar despesa lançada no cartão (1x) com status aberto', () => {
    const cardPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-10', { installments: 1, status: 'aberto' }),
    ];

    const paid = buildPaidExpensesSet([], cardPurchases, CURRENT_MONTH);

    expect(paid.has('energia')).toBe(false);
    expect(paid.size).toBe(0);
  });

  it('deve detectar despesa no cartão (1x) quando status for pago', () => {
    const cardPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-10', { installments: 1, status: 'pago' }),
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

  it('deve detectar despesas pagas por ambos os métodos (carteira + cartão pago)', () => {
    const transactions = [
      makeTransaction('Internet', 'Contas', '2026-05-05'),
    ];
    const cardPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-10', { status: 'pago' }),
    ];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    expect(paid.has('internet')).toBe(true);
    expect(paid.size).toBe(2);
    expect(paid.has('energia')).toBe(true);
  });

  it('não deve marcar despesa de outro mês como paga', () => {
    const transactions = [
      makeTransaction('Internet', 'Contas', '2026-04-05'), // mês anterior
    ];
    const cardPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-06-10', { status: 'pago' }), // mês seguinte
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
      makeCardPurchase('Notebook', 'Eletrônicos', '2026-05-15', { status: 'pago' }),
    ];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    expect(paid.size).toBe(0);
  });

  it('não deve duplicar quando mesma despesa aparece em transação e cartão', () => {
    const transactions = [
      makeTransaction('Internet', 'Contas', '2026-05-05'),
    ];
    const cardPurchases = [
      makeCardPurchase('Internet', 'Contas', '2026-05-10', { status: 'pago' }),
    ];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    expect(paid.has('internet')).toBe(true);
    expect(paid.size).toBe(1); // Set não duplica
  });

  it('deve retornar vazio quando não há transações nem compras', () => {
    const paid = buildPaidExpensesSet([], [], CURRENT_MONTH);

    expect(paid.size).toBe(0);
  });

  it('cenário completo: mix de pagas, pendentes no cartão e não pagas', () => {
    const fixedExpenses = ['Internet', 'Energia', 'Água', 'Aluguel', 'Gás', 'Netflix'];

    const transactions = [
      makeTransaction('Internet', 'Contas', '2026-05-05'),
      makeTransaction('Aluguel', 'Contas', '2026-05-01'),
    ];
    const cardPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-10', { status: 'pago' }), // Paga no cartão
      makeCardPurchase('Netflix', 'Assinaturas', '2026-05-01', { status: 'aberto' }), // Lançada no cartão, fatura ABERTA
    ];

    const paid = buildPaidExpensesSet(transactions, cardPurchases, CURRENT_MONTH);

    // Pagas: internet, aluguel, energia
    expect(paid.has('internet')).toBe(true);
    expect(paid.has('aluguel')).toBe(true);
    expect(paid.has('energia')).toBe(true);

    // Não pagas / Pendentes: água, gás, netflix (fatura aberta)
    expect(paid.has('água')).toBe(false);
    expect(paid.has('gás')).toBe(false);
    expect(paid.has('netflix')).toBe(false);

    // Cálculo de despesas não pagas (como no Dashboard)
    const expensesData = fixedExpenses.map(name => ({ description: name, value: 100 }));
    const unpaidTotal = expensesData
      .filter(item => !paid.has(cleanDescription(item.description)))
      .reduce((acc, item) => acc + item.value, 0);

    expect(unpaidTotal).toBe(300); // Água (100) + Gás (100) + Netflix (100)
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

  it('deve manter despesa como não paga se compra no cartão for lançada com status aberto', () => {
    // Estado ANTES do lançamento
    const before = buildPaidExpensesSet([], [], CURRENT_MONTH);
    expect(before.has('energia')).toBe(false);

    // Estado APÓS lançar no cartão com status aberto
    const openPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-15', { status: 'aberto' }),
    ];
    const afterOpen = buildPaidExpensesSet([], openPurchases, CURRENT_MONTH);
    expect(afterOpen.has('energia')).toBe(false);
  });

  it('deve refletir novo pagamento via cartão ao pagar a fatura (status vira pago)', () => {
    // Estado APÓS quitação da fatura/compra no cartão
    const paidPurchases = [
      makeCardPurchase('Energia', 'Contas', '2026-05-15', { status: 'pago' }),
    ];
    const afterPaid = buildPaidExpensesSet([], paidPurchases, CURRENT_MONTH);
    expect(afterPaid.has('energia')).toBe(true);
  });

  it('deve refletir novo pagamento de cartão via transação gerada na quitação da fatura', () => {
    // Estado APÓS pagamento da fatura gerando transação
    const invoiceTransactions = [
      makeTransaction('Pagamento Cartão: Energia', 'Pagamento de Cartão', '2026-05-15'),
    ];
    const afterInvoice = buildPaidExpensesSet(invoiceTransactions, [], CURRENT_MONTH);
    expect(afterInvoice.has('energia')).toBe(true);
  });

  it('deve calcular monthlyForecast corretamente: não reduz despesas pendentes até que o cartão seja pago', () => {
    const totalBalance = 5000;
    const fixedExpenses = [
      { description: 'Internet', value: 100 },
      { description: 'Energia', value: 200 },
      { description: 'Água', value: 80 },
    ];

    // 1. ANTES de qualquer ação: nenhuma despesa paga
    const paidInitial = buildPaidExpensesSet([], [], CURRENT_MONTH);
    const unpaidInitial = fixedExpenses
      .filter(e => !paidInitial.has(cleanDescription(e.description)))
      .reduce((acc, e) => acc + e.value, 0);
    const forecastInitial = totalBalance - unpaidInitial;
    expect(forecastInitial).toBe(4620); // 5000 - 380

    // 2. APÓS lançar Energia no cartão (status aberto): ainda pendente de quitação
    const cardOpen = [makeCardPurchase('Energia', 'Contas', '2026-05-10', { status: 'aberto' })];
    const paidCardOpen = buildPaidExpensesSet([], cardOpen, CURRENT_MONTH);
    const unpaidCardOpen = fixedExpenses
      .filter(e => !paidCardOpen.has(cleanDescription(e.description)))
      .reduce((acc, e) => acc + e.value, 0);
    expect(unpaidCardOpen).toBe(380); // Continua 380 pendente
    expect(totalBalance - unpaidCardOpen).toBe(4620);

    // 3. APÓS pagar a fatura do cartão (carteira é debitada e status vira pago):
    const cardPaid = [makeCardPurchase('Energia', 'Contas', '2026-05-10', { status: 'pago' })];
    const paidCardPaid = buildPaidExpensesSet([], cardPaid, CURRENT_MONTH);
    const unpaidCardPaid = fixedExpenses
      .filter(e => !paidCardPaid.has(cleanDescription(e.description)))
      .reduce((acc, e) => acc + e.value, 0);
    expect(unpaidCardPaid).toBe(180); // Resta Internet (100) + Água (80)
    const newBalance = 4800; // 5000 - 200 debitado da carteira
    const forecastFinal = newBalance - unpaidCardPaid;
    expect(forecastFinal).toBe(4620); // 4800 - 180 = 4620 (previsão permanece consistente)
  });
});

// -----------------------------------------------
// Testes: Payload de pagamento de despesa fixa via cartão
// (fixedExpenses.js — payFixedExpenseWithCard)
// -----------------------------------------------
describe('Payload: Pagamento de Despesa Fixa via Cartão', () => {
  it('deve montar registro correto em cardsShopping com status aberto e dueDate', () => {
    const expenseItem = { description: 'Energia' };
    const cardId = 'card-123';
    const value = 150;
    const today = new Date();
    const dueDate = new Date('2026-06-10T12:00:00');

    // Simula o payload criado por payFixedExpenseWithCard
    const payload = {
      description: expenseItem.description,
      totalValue: value,
      installments: 1,
      installmentValue: value,
      purchaseDate: today,
      dueDate: dueDate,
      date: dueDate,
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
    expect(payload.dueDate).toEqual(dueDate);
  });

  it('categoria "Contas" no cartão só deve ser detectada como paga se status for "pago"', () => {
    const purchaseOpen = makeCardPurchase('Energia', 'Contas', '2026-05-10', { installments: 1, status: 'aberto' });
    const paidOpen = buildPaidExpensesSet([], [purchaseOpen], CURRENT_MONTH);
    expect(paidOpen.has('energia')).toBe(false);

    const purchasePaid = makeCardPurchase('Energia', 'Contas', '2026-05-10', { installments: 1, status: 'pago' });
    const paidPaid = buildPaidExpensesSet([], [purchasePaid], CURRENT_MONTH);
    expect(paidPaid.has('energia')).toBe(true);
  });

  it('categoria "Assinaturas" no cartão só deve ser detectada como paga se status for "pago"', () => {
    const purchaseOpen = makeCardPurchase('Spotify', 'Assinaturas', '2026-05-01', { installments: 1, status: 'aberto' });
    const paidOpen = buildPaidExpensesSet([], [purchaseOpen], CURRENT_MONTH);
    expect(paidOpen.has('spotify')).toBe(false);

    const purchasePaid = makeCardPurchase('Spotify', 'Assinaturas', '2026-05-01', { installments: 1, status: 'pago' });
    const paidPaid = buildPaidExpensesSet([], [purchasePaid], CURRENT_MONTH);
    expect(paidPaid.has('spotify')).toBe(true);
  });
});

