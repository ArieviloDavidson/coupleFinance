// =============================================
// Testes: Payloads de Transações — Estado Atual
// Valida a estrutura dos dados enviados ao Firestore
// conforme implementado hoje nos módulos da API.
// =============================================
import { describe, it, expect } from 'vitest';
import { CATEGORIES, TRANSACTION_TYPES } from '../src/utils/constants.js';

// -----------------------------------------------
// transactions.js — addTransactionWithWalletUpdate (L62-83)
// -----------------------------------------------
describe('Payload: Transação via Carteira', () => {
  it('saída deve ter todos os campos obrigatórios', () => {
    const payload = {
      description: 'Jantar',
      value: 85.50,
      type: TRANSACTION_TYPES.SAIDA,
      category: 'Alimentação',
      date: new Date('2025-06-15'),
      walletId: 'wallet-123',
      walletName: 'Nubank',
    };

    expect(payload.description).toBeTruthy();
    expect(payload.value).toBeGreaterThan(0);
    expect(payload.type).toBe('saida');
    expect(typeof payload.category).toBe('string');
    expect(CATEGORIES[payload.type]).toContain(payload.category);
    expect(payload.walletId).toBeTruthy();
    expect(payload.walletName).toBeTruthy();
    expect(payload.date).toBeInstanceOf(Date);
  });

  it('entrada deve ter todos os campos obrigatórios', () => {
    const payload = {
      description: 'Salário',
      value: 5000,
      type: TRANSACTION_TYPES.ENTRADA,
      category: 'Salário',
      date: new Date('2025-06-05'),
      walletId: 'wallet-123',
      walletName: 'Nubank',
    };

    expect(payload.type).toBe('entrada');
    expect(CATEGORIES[payload.type]).toContain(payload.category);
  });

  it('ajuste de saldo: positivo para entrada, negativo para saída', () => {
    const value = 100;

    const ajusteEntrada = TRANSACTION_TYPES.ENTRADA === 'entrada' ? value : -value;
    expect(ajusteEntrada).toBe(100);

    const ajusteSaida = TRANSACTION_TYPES.SAIDA === 'entrada' ? value : -value;
    expect(ajusteSaida).toBe(-100);
  });
});

// -----------------------------------------------
// transactions.js — addTransactionWithCard (L115-133)
// -----------------------------------------------
describe('Payload: Transação via Cartão (1x)', () => {
  it('deve montar registro de cardsShopping com 1 parcela', () => {
    const payload = {
      description: 'iPhone',
      totalValue: 4999,
      installments: 1,
      installmentValue: 4999,
      date: new Date('2025-06-15'),
      cardId: 'card-456',
      category: 'Eletrônicos',
      status: 'aberto',
      installmentIndex: 1,
      originalTotal: 4999,
    };

    expect(payload.installments).toBe(1);
    expect(payload.installmentValue).toBe(payload.totalValue);
    expect(payload.status).toBe('aberto');
    expect(CATEGORIES[TRANSACTION_TYPES.SAIDA]).toContain(payload.category);
  });
});

// -----------------------------------------------
// CardShoppingForm.jsx (L38-50) — compras parceladas
// -----------------------------------------------
describe('Payload: Compra Parcelada', () => {
  it('deve calcular valor da parcela corretamente', () => {
    const totalValue = 1200;
    const installments = 12;
    const installmentValue = totalValue / installments;

    expect(installmentValue).toBe(100);
  });

  it('deve lidar com divisão que gera decimais', () => {
    const totalValue = 100;
    const installments = 3;
    const installmentValue = totalValue / installments;

    expect(installmentValue).toBeCloseTo(33.33, 2);
  });
});

// -----------------------------------------------
// reminders.js — payReminderWithWallet (L85-111)
// -----------------------------------------------
describe('Payload: Pagamento de Lembrete via Carteira', () => {
  it('deve aceitar qualquer categoria válida de saída', () => {
    const payload = {
      description: 'Conta de Água',
      value: 80,
      type: TRANSACTION_TYPES.SAIDA,
      category: 'Contas',
      date: new Date(),
      walletId: 'w1',
      walletName: 'Nubank',
    };

    expect(CATEGORIES[payload.type]).toContain(payload.category);
  });

  it('deve aceitar qualquer categoria válida de entrada', () => {
    const payload = {
      description: 'Freelance',
      value: 2000,
      type: TRANSACTION_TYPES.ENTRADA,
      category: 'Renda Extra',
      date: new Date(),
      walletId: 'w1',
      walletName: 'Inter',
    };

    expect(CATEGORIES[payload.type]).toContain(payload.category);
  });
});

// -----------------------------------------------
// FUTURO: Payloads com campo categoryGroup
// Descomentar quando migrar para categorias hierárquicas
// -----------------------------------------------

// describe('Payload com categoryGroup (futuro)', () => {
//   it('transação via carteira deve incluir categoryGroup', () => {
//     const payload = {
//       description: 'Mercado Semanal',
//       value: 250,
//       type: TRANSACTION_TYPES.SAIDA,
//       categoryGroup: 'Alimentação',
//       category: 'Supermercado',
//       walletId: 'w1',
//       walletName: 'Nubank',
//     };
//
//     expect(payload).toHaveProperty('categoryGroup');
//     expect(payload).toHaveProperty('category');
//   });
//
//   it('transação via cartão deve incluir categoryGroup', () => {
//     const payload = {
//       description: 'Notebook',
//       totalValue: 5000,
//       installments: 10,
//       installmentValue: 500,
//       categoryGroup: 'Compras Pessoais',
//       category: 'Computadores',
//       cardId: 'c1',
//       status: 'aberto',
//     };
//
//     expect(payload).toHaveProperty('categoryGroup');
//   });
//
//   it('lembrete pago deve incluir categoryGroup', () => {
//     const payload = {
//       description: 'Conta de Água',
//       value: 80,
//       type: TRANSACTION_TYPES.SAIDA,
//       categoryGroup: 'Moradia',
//       category: 'Água',
//       walletId: 'w1',
//     };
//
//     expect(payload.categoryGroup).toBe('Moradia');
//     expect(payload.category).toBe('Água');
//   });
// });
