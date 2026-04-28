export const TRANSACTION_TYPES = {
    ENTRADA: 'entrada',
    SAIDA: 'saida',
};

export const CATEGORIES = {
    [TRANSACTION_TYPES.ENTRADA]: [
        'Salário',
        'Renda Extra',
        'Investimentos (Resgate)',
        'Presente',
        'Outros' // Mantendo 'Outros' como padrão
    ],
    [TRANSACTION_TYPES.SAIDA]: [
        'Alimentação',         // Restaurantes, iFood
        'Mercado',             // Compras do mês
        'Contas',              // Luz, Internet, Aluguel
        'Lazer',               // Cinema, Viagem
        'Investimentos',       // Aporte
        'Transporte',          // Uber, Gasolina, Ônibus
        'Saúde',               // Farmácia, Médicos
        'Eletrônicos',         // Gadgets, Celulares (Veio do CardShoppingForm)
        'Pagamento de Cartão', // Para categorizar pagamentos de fatura
        'Assinaturas',         // Serviços de AudioVisual
        'Outros',
    ]
};

export const COLLECTIONS = {
    TRANSACTIONS: 'transactions',
    WALLETS: 'wallets',
    CARDS: 'cards',
    BUDGETS: 'budgets',
    CARDS_SHOPPING: 'cardsShopping',
    FIXED_EXPENSES: 'livingExpenses',
    FIXED_ENTRIES: 'fixedEntries',
    ALLOWED_USERS: 'allowed_users',
    INVESTMENT_TYPES: 'investmentTypes',
    INVESTMENTS: 'investments',
    REMINDERS: 'reminders',
};