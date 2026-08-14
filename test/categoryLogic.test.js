// =============================================
// Testes: Lógica de Categorias — Estado Atual
// Replica a lógica real dos componentes que consomem
// CATEGORIES como array plano de strings.
// =============================================
import { describe, it, expect } from 'vitest';
import { CATEGORIES, TRANSACTION_TYPES } from '../src/utils/constants.js';

// -----------------------------------------------
// TransactionForm.jsx / ReminderPayModal.jsx
// Quando o tipo muda, seleciona a primeira categoria do array
// Código real (TransactionForm L38-43):
//   const cats = CATEGORIES[transType];
//   if (cats && cats.length > 0) setCategory(cats[0]);
// -----------------------------------------------
describe('Seleção de categoria padrão nos formulários', () => {
  it('CATEGORIES[saida] deve retornar array, e o primeiro item deve ser string', () => {
    const cats = CATEGORIES[TRANSACTION_TYPES.SAIDA];
    expect(Array.isArray(cats)).toBe(true);
    expect(typeof cats[0]).toBe('string');
  });

  it('CATEGORIES[entrada] deve retornar array, e o primeiro item deve ser string', () => {
    const cats = CATEGORIES[TRANSACTION_TYPES.ENTRADA];
    expect(Array.isArray(cats)).toBe(true);
    expect(typeof cats[0]).toBe('string');
  });
});

// -----------------------------------------------
// Budgets.jsx (L53-71)
// Inicializa um objeto com { categoria: 0 } para cada categoria de saída,
// depois soma os valores das transações por categoria.
// Código real:
//   const spendingObj = {};
//   CATEGORIES[TRANSACTION_TYPES.SAIDA].forEach(cat => spendingObj[cat] = 0);
//   transactions.forEach(t => {
//     if (t.category === 'Pagamento de Cartão') return;
//     const cat = t.category || 'Outros';
//     if (spendingObj[cat] !== undefined) spendingObj[cat] += Number(t.value);
//   });
// -----------------------------------------------
describe('Budgets — agregação de gastos por categoria', () => {
  it('deve inicializar spending zerado para cada categoria de saída', () => {
    const spendingObj = {};
    CATEGORIES[TRANSACTION_TYPES.SAIDA].forEach(cat => {
      spendingObj[cat] = 0;
    });

    CATEGORIES[TRANSACTION_TYPES.SAIDA].forEach(cat => {
      expect(spendingObj[cat]).toBe(0);
    });
  });

  it('deve acumular valores por categoria', () => {
    const spendingObj = {};
    CATEGORIES[TRANSACTION_TYPES.SAIDA].forEach(cat => spendingObj[cat] = 0);

    const transacoes = [
      { category: 'Alimentação', value: 50 },
      { category: 'Alimentação', value: 30 },
      { category: 'Transporte', value: 20 },
      { category: 'Contas', value: 100 },
    ];

    transacoes.forEach(t => {
      const cat = t.category || 'Outros';
      if (spendingObj[cat] !== undefined) spendingObj[cat] += Number(t.value);
    });

    expect(spendingObj['Alimentação']).toBe(80);
    expect(spendingObj['Transporte']).toBe(20);
    expect(spendingObj['Contas']).toBe(100);
    expect(spendingObj['Lazer']).toBe(0);
  });

  it('deve pular transações de "Pagamento de Cartão"', () => {
    const spendingObj = {};
    CATEGORIES[TRANSACTION_TYPES.SAIDA].forEach(cat => spendingObj[cat] = 0);

    const transacoes = [
      { category: 'Alimentação', value: 50 },
      { category: 'Pagamento de Cartão', value: 500 },
    ];

    transacoes.forEach(t => {
      if (t.category === 'Pagamento de Cartão') return;
      const cat = t.category || 'Outros';
      if (spendingObj[cat] !== undefined) spendingObj[cat] += Number(t.value);
    });

    expect(spendingObj['Alimentação']).toBe(50);
    expect(spendingObj['Pagamento de Cartão']).toBe(0);
  });

  it('deve agregar compras de cartão no orçamento usando a data da compra (purchaseDateObj) e apenas status pago', () => {
    const spendingCardObj = { 'Mercado': 0, 'Lazer': 0, 'Alimentação': 0 };
    const shoppingData = [
      {
        category: 'Mercado',
        totalValue: 1000,
        status: 'pago',
        purchaseDateObj: new Date('2026-08-14T12:00:00'), // Compra em Agosto Paga
        dueDateObj: new Date('2026-09-05T12:00:00'),
      },
      {
        category: 'Alimentação',
        totalValue: 300,
        status: 'aberto', // Compra em Agosto ABERTA (não entra)
        purchaseDateObj: new Date('2026-08-14T12:00:00'),
        dueDateObj: new Date('2026-09-05T12:00:00'),
      },
      {
        category: 'Lazer',
        totalValue: 200,
        status: 'pago',
        purchaseDateObj: new Date('2026-07-20T12:00:00'), // Compra em Julho
        dueDateObj: new Date('2026-08-05T12:00:00'),
      }
    ];

    const currentMonth = '2026-08';

    shoppingData.forEach(c => {
      if (c.status !== 'pago') return;
      const filterTargetDate = c.purchaseDateObj || c.dateObj;
      const cMonth = filterTargetDate.toISOString().slice(0, 7);

      if (cMonth === currentMonth) {
        const cat = c.category || 'Outros';
        if (spendingCardObj[cat] !== undefined) spendingCardObj[cat] += Number(c.totalValue);
      }
    });

    // Compra de Agosto Paga entra em Agosto (1000)
    expect(spendingCardObj['Mercado']).toBe(1000);
    // Compra de Agosto Aberta não entra (0)
    expect(spendingCardObj['Alimentação']).toBe(0);
    // Compra de Julho não entra em Agosto (0)
    expect(spendingCardObj['Lazer']).toBe(0);
  });

  it('CategoryExpensesModal — deve filtrar transações e compras pagas da categoria sem duplicar', () => {
    const transactions = [
      { id: 't1', description: 'Supermercado Extra', category: 'Mercado', value: 250, dateObj: new Date('2026-08-10T12:00:00'), walletName: 'Nubank' },
      { id: 't2', description: 'Pagamento Cartão: Mercado', category: 'Pagamento de Cartão', value: 500, dateObj: new Date('2026-08-10T12:00:00') },
      { id: 't3', description: 'Padaria', category: 'Mercado', value: 50, dateObj: new Date('2026-07-10T12:00:00') }, // Mês anterior
    ];

    const cardPurchases = [
      { id: 'c1', description: 'Feira Livre', category: 'Mercado', totalValue: 120, status: 'pago', purchaseDateObj: new Date('2026-08-12T12:00:00'), cardId: 'card1' },
      { id: 'c2', description: 'Hortifruti', category: 'Mercado', totalValue: 80, status: 'aberto', purchaseDateObj: new Date('2026-08-14T12:00:00'), cardId: 'card1' }, // Aberto
    ];

    const monthKey = '2026-08';
    const targetCategory = 'Mercado';

    const walletItems = transactions
      .filter(t => t.category === targetCategory && t.category !== 'Pagamento de Cartão' && t.dateObj.toISOString().slice(0, 7) === monthKey)
      .map(t => ({ description: t.description, value: Number(t.value), source: 'wallet' }));

    const cardItems = cardPurchases
      .filter(c => c.category === targetCategory && c.status === 'pago' && c.purchaseDateObj.toISOString().slice(0, 7) === monthKey)
      .map(c => ({ description: c.description, value: Number(c.totalValue), source: 'card' }));

    const total = [...walletItems, ...cardItems].reduce((sum, item) => sum + item.value, 0);

    expect(walletItems.length).toBe(1); // Apenas Supermercado Extra (250)
    expect(cardItems.length).toBe(1);   // Apenas Feira Livre (120)
    expect(total).toBe(370);            // 250 + 120 = 370 (Hortifruti aberto e Pagamento de Cartão ignorados)
  });

  // Budgets.jsx (L115-127) — monta array final para o gráfico
  it('deve montar dados do gráfico com meta, gasto e percentual', () => {
    const limitsObj = { 'Alimentação': 500, 'Transporte': 200 };
    const spendingObj = { 'Alimentação': 350, 'Transporte': 180 };

    const finalData = CATEGORIES[TRANSACTION_TYPES.SAIDA].map(cat => {
      const limit = limitsObj[cat] || 0;
      const spent = spendingObj[cat] || 0;
      const percent = limit > 0 ? (spent / limit) * 100 : 0;
      return { name: cat, limit, spent, remaining: limit - spent, percent };
    });

    const alimentacao = finalData.find(d => d.name === 'Alimentação');
    expect(alimentacao.limit).toBe(500);
    expect(alimentacao.spent).toBe(350);
    expect(alimentacao.remaining).toBe(150);
    expect(alimentacao.percent).toBe(70);

    const lazer = finalData.find(d => d.name === 'Lazer');
    expect(lazer.limit).toBe(0);
    expect(lazer.percent).toBe(0);
  });

  it('deve recalcular remaining e percent corretamente ao atualizar a meta dinamicamente (handleSaveLimit)', () => {
    // Estado inicial: Gasto de 1000 sem meta (limit = 0, remaining = -1000)
    let spendingData = [
      { name: 'Mercado', spent: 1000, limit: 0, percent: 0, remaining: -1000 }
    ];

    // Simula handleSaveLimit ao cadastrar meta de 2000
    const newLimit = 2000;
    const editingCategory = 'Mercado';

    spendingData = spendingData.map(item => {
      if (item.name === editingCategory) {
        const val = Number(newLimit);
        return {
          ...item,
          limit: val,
          percent: val > 0 ? (item.spent / val) * 100 : 0,
          remaining: val - item.spent
        };
      }
      return item;
    });

    const mercado = spendingData.find(d => d.name === 'Mercado');
    expect(mercado.limit).toBe(2000);
    expect(mercado.percent).toBe(50);
    expect(mercado.remaining).toBe(1000); // Resta 1000 (positivo, não excedeu)
  });
});

// -----------------------------------------------
// ChartExpensesCategory.jsx (L20-29)
// Agrupa gastos por category para o PieChart, exclui 'Transferência'.
// Código real:
//   const grouped = {};
//   transactions.forEach(item => {
//     const cat = item.category || 'Outros';
//     if (itemMonth === filterDate && cat !== 'Transferência') {
//       grouped[cat] = (grouped[cat] || 0) + Number(item.value);
//     }
//   });
// -----------------------------------------------
describe('ChartExpensesCategory — agrupamento para gráfico de pizza', () => {
  it('deve agrupar valores e excluir "Transferência"', () => {
    const transacoes = [
      { category: 'Alimentação', value: 50, dateObj: new Date('2025-06-15') },
      { category: 'Alimentação', value: 30, dateObj: new Date('2025-06-20') },
      { category: 'Transferência', value: 200, dateObj: new Date('2025-06-10') },
      { category: 'Transporte', value: 45, dateObj: new Date('2025-06-05') },
    ];

    const filterDate = '2025-06';
    const grouped = {};

    transacoes.forEach(item => {
      const itemMonth = item.dateObj.toISOString().slice(0, 7);
      const cat = item.category || 'Outros';
      if (itemMonth === filterDate && cat !== 'Transferência') {
        grouped[cat] = (grouped[cat] || 0) + Number(item.value);
      }
    });

    expect(grouped['Alimentação']).toBe(80);
    expect(grouped['Transporte']).toBe(45);
    expect(grouped['Transferência']).toBeUndefined();
  });

  it('deve tratar transações sem categoria como "Outros"', () => {
    const transacoes = [
      { category: null, value: 100, dateObj: new Date('2025-06-15') },
      { category: undefined, value: 50, dateObj: new Date('2025-06-15') },
    ];

    const filterDate = '2025-06';
    const grouped = {};

    transacoes.forEach(item => {
      const itemMonth = item.dateObj.toISOString().slice(0, 7);
      const cat = item.category || 'Outros';
      if (itemMonth === filterDate && cat !== 'Transferência') {
        grouped[cat] = (grouped[cat] || 0) + Number(item.value);
      }
    });

    expect(grouped['Outros']).toBe(150);
  });

  it('deve incluir compras no cartão com status "pago" agrupadas pela data da compra (purchaseDateObj)', () => {
    const cardPurchases = [
      {
        category: 'Contas',
        totalValue: 150,
        status: 'pago',
        purchaseDateObj: new Date('2026-08-14T12:00:00'), // Compra em Agosto
        dueDateObj: new Date('2026-09-05T12:00:00'),      // Vencimento em Setembro
      },
      {
        category: 'Alimentação',
        totalValue: 80,
        status: 'aberto', // Não paga: não entra no gráfico
        purchaseDateObj: new Date('2026-08-14T12:00:00'),
        dueDateObj: new Date('2026-09-05T12:00:00'),
      },
    ];

    const filterDate = '2026-08'; // Mês da compra
    const grouped = {};

    cardPurchases.forEach(item => {
      if (item.status !== 'pago') return;
      const filterTargetDate = item.purchaseDateObj || item.dateObj;
      const itemMonth = filterTargetDate.toISOString().slice(0, 7);
      const cat = item.category || 'Outros';

      if (itemMonth === filterDate) {
        grouped[cat] = (grouped[cat] || 0) + Number(item.totalValue);
      }
    });

    expect(grouped['Contas']).toBe(150); // Entra em Agosto
    expect(grouped['Alimentação']).toBeUndefined(); // Aberto: não entra
  });
});

// -----------------------------------------------
// Dashboard.jsx (useEffect #6) — lógica corrigida com subscribeTransactions
// Filtra transações com category 'Contas', 'Assinaturas' ou 'Pagamento de Cartão'
// para detectar despesas pagas no mês atual.
// Código real (pós-fix):
//   paidTransactions.forEach(t => {
//     if (t.category !== 'Contas' && t.category !== 'Assinaturas' && t.category !== 'Pagamento de Cartão') return;
//     const tMonth = t.dateObj.toISOString().slice(0, 7);
//     if (tMonth === currentMonth) paidNames.add(cleanDescription(t.description));
//   });
// -----------------------------------------------
describe('Dashboard — filtro de despesas pagas (lógica corrigida)', () => {
  it('deve identificar transações "Contas" no mês correto', () => {
    const currentMonth = '2025-06';

    const transacoes = [
      { category: 'Contas', description: 'Internet', dateObj: new Date('2025-06-05') },
      { category: 'Contas', description: 'Luz', dateObj: new Date('2025-06-10') },
      { category: 'Alimentação', description: 'Mercado', dateObj: new Date('2025-06-15') },
      { category: 'Contas', description: 'Aluguel', dateObj: new Date('2025-05-05') }, // mês diferente
    ];

    const paidNames = new Set();
    transacoes.forEach(t => {
      if (t.category !== 'Contas' && t.category !== 'Assinaturas' && t.category !== 'Pagamento de Cartão') return;
      const tMonth = t.dateObj.toISOString().slice(0, 7);
      if (tMonth === currentMonth) paidNames.add(t.description.toLowerCase());
    });

    expect(paidNames.has('internet')).toBe(true);
    expect(paidNames.has('luz')).toBe(true);
    expect(paidNames.has('mercado')).toBe(false);  // categoria diferente
    expect(paidNames.has('aluguel')).toBe(false);  // mês diferente
  });

  it('deve identificar transações "Assinaturas" (categoria nova incluída no fix)', () => {
    const currentMonth = '2025-06';

    const transacoes = [
      { category: 'Assinaturas', description: 'Netflix', dateObj: new Date('2025-06-01') },
      { category: 'Assinaturas', description: 'Spotify', dateObj: new Date('2025-06-01') },
      { category: 'Alimentação', description: 'iFood', dateObj: new Date('2025-06-10') },
    ];

    const paidNames = new Set();
    transacoes.forEach(t => {
      if (t.category !== 'Contas' && t.category !== 'Assinaturas' && t.category !== 'Pagamento de Cartão') return;
      const tMonth = t.dateObj.toISOString().slice(0, 7);
      if (tMonth === currentMonth) paidNames.add(t.description.toLowerCase());
    });

    expect(paidNames.has('netflix')).toBe(true);
    expect(paidNames.has('spotify')).toBe(true);
    expect(paidNames.has('ifood')).toBe(false);
  });

  it('deve identificar "Pagamento de Cartão" como despesa paga', () => {
    const currentMonth = '2025-06';

    const transacoes = [
      { category: 'Pagamento de Cartão', description: 'Pagamento Cartão: Energia', dateObj: new Date('2025-06-05') },
    ];

    const paidNames = new Set();
    transacoes.forEach(t => {
      if (t.category !== 'Contas' && t.category !== 'Assinaturas' && t.category !== 'Pagamento de Cartão') return;
      const tMonth = t.dateObj.toISOString().slice(0, 7);
      if (tMonth === currentMonth) {
        // Simula cleanDescription
        const cleaned = t.description.replace(/^Pagamento Cartão:\s*/i, '').trim().toLowerCase();
        paidNames.add(cleaned);
      }
    });

    expect(paidNames.has('energia')).toBe(true);
  });

  // Dashboard.jsx — calcula total de despesas não pagas
  it('deve calcular o total de despesas fixas não pagas corretamente', () => {
    const expenses = [
      { description: 'Internet', value: 100 },
      { description: 'Luz', value: 150 },
      { description: 'Aluguel', value: 1200 },
    ];

    const paidExpenses = new Set(['internet']); // cleanDescription normaliza para lowercase

    const unpaidTotal = expenses
      .filter(item => !paidExpenses.has(item.description.toLowerCase()))
      .reduce((acc, item) => acc + Number(item.value || 0), 0);

    expect(unpaidTotal).toBe(1350);
  });
});

// -----------------------------------------------
// wallets.js (L74-94)
// Transferências usam category: 'Transferência' hardcoded.
// -----------------------------------------------
describe('Transferências — category hardcoded "Transferência"', () => {
  it('deve gerar duas transações com category "Transferência"', () => {
    const transferData = {
      sourceId: 'w1', sourceName: 'Nubank',
      destId: 'w2', destName: 'Inter',
      value: 500, date: new Date('2025-06-15'),
    };

    const saida = {
      description: `Transf. para ${transferData.destName}`,
      value: transferData.value,
      type: 'saida',
      category: 'Transferência',
      walletId: transferData.sourceId,
      walletName: transferData.sourceName,
    };

    const entrada = {
      description: `Transf. de ${transferData.sourceName}`,
      value: transferData.value,
      type: 'entrada',
      category: 'Transferência',
      walletId: transferData.destId,
      walletName: transferData.destName,
    };

    expect(saida.category).toBe('Transferência');
    expect(entrada.category).toBe('Transferência');
    expect(saida.type).toBe('saida');
    expect(entrada.type).toBe('entrada');
  });
});

// -----------------------------------------------
// fixedExpenses.js (L63-71, L90-101)
// Pagamento de despesas fixas usa category: 'Contas' hardcoded.
// -----------------------------------------------
describe('Pagamento de Despesas Fixas — category hardcoded "Contas"', () => {
  it('payload via carteira deve ter category "Contas" e type "saida"', () => {
    const payload = {
      description: 'Internet',
      value: 99.90,
      type: 'saida',
      category: 'Contas',
      date: new Date(),
      walletId: 'w1',
      walletName: 'Nubank',
    };

    expect(payload.category).toBe('Contas');
    expect(payload.type).toBe('saida');
  });

  it('payload via cartão deve ter category "Contas" e status "aberto"', () => {
    const payload = {
      description: 'Luz',
      totalValue: 150,
      installments: 1,
      installmentValue: 150,
      date: new Date(),
      cardId: 'c1',
      category: 'Contas',
      status: 'aberto',
      installmentIndex: 1,
      originalTotal: 150,
    };

    expect(payload.category).toBe('Contas');
    expect(payload.status).toBe('aberto');
    expect(payload.installments).toBe(1);
  });
});

// -----------------------------------------------
// FUTURO: Testes para quando categoryGroup existir
// Descomentar quando migrar para categorias hierárquicas
// -----------------------------------------------

// describe('Budgets — agregação por categoryGroup (futuro)', () => {
//   it('deve agrupar gastos por categoryGroup ao invés de category', () => {
//     const transacoes = [
//       { categoryGroup: 'Alimentação', category: 'Supermercado', value: 200 },
//       { categoryGroup: 'Alimentação', category: 'Restaurantes', value: 80 },
//       { categoryGroup: 'Transporte', category: 'Uber', value: 50 },
//     ];
//
//     const spendingObj = {};
//     transacoes.forEach(t => {
//       const group = t.categoryGroup || t.category;
//       spendingObj[group] = (spendingObj[group] || 0) + Number(t.value);
//     });
//
//     expect(spendingObj['Alimentação']).toBe(280);
//     expect(spendingObj['Transporte']).toBe(50);
//   });
// });

// describe('ChartExpensesCategory — agrupamento por categoryGroup (futuro)', () => {
//   it('deve agrupar por categoryGroup com fallback para category', () => {
//     const transacoes = [
//       { categoryGroup: 'Alimentação', category: 'Supermercado', value: 100 },
//       { category: 'Alimentação', value: 50 },  // dado antigo, sem categoryGroup
//     ];
//
//     const grouped = {};
//     transacoes.forEach(t => {
//       const group = t.categoryGroup || t.category || 'Outros';
//       grouped[group] = (grouped[group] || 0) + Number(t.value);
//     });
//
//     expect(grouped['Alimentação']).toBe(150);
//   });
// });

// describe('Payloads com categoryGroup (futuro)', () => {
//   it('transação deve ter categoryGroup e category', () => {
//     const payload = {
//       description: 'Mercado Semanal',
//       value: 250,
//       type: 'saida',
//       categoryGroup: 'Alimentação',
//       category: 'Supermercado',
//       walletId: 'w1',
//       walletName: 'Nubank',
//     };
//
//     expect(payload.categoryGroup).toBeDefined();
//     expect(payload.category).toBeDefined();
//     expect(payload.categoryGroup).not.toBe(payload.category);
//   });
//
//   it('transferência deve ter categoryGroup "Transferência"', () => {
//     const payload = {
//       categoryGroup: 'Transferência',
//       category: 'Transferência',
//     };
//     expect(payload.categoryGroup).toBe('Transferência');
//   });
//
//   it('despesa fixa deve ter categoryGroup "Moradia"', () => {
//     const payload = {
//       categoryGroup: 'Moradia',
//       category: 'Contas',
//     };
//     expect(payload.categoryGroup).toBe('Moradia');
//   });
// });
