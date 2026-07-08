export const parseDateToNoon = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-');
    // Cria a data ao meio-dia para evitar problemas de fuso horário (UTC-3 vs UTC)
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
};

/**
 * Calcula a data de vencimento da fatura com base na data de compra e nas regras do cartão.
 * - Compra ANTES do fechamento (< closingDay): vencimento = dueDay do mês seguinte
 * - Compra NO DIA ou DEPOIS do fechamento (>= closingDay): vencimento = dueDay de 2 meses depois
 *
 * Ex (fecha=25, vence=5):
 *   Compra 24/06 → Venc 05/07
 *   Compra 26/06 → Venc 05/08
 */
export const calculateDueDate = (purchaseDate, closingDay, dueDay) => {
    const closing = Number(closingDay);
    const due = Number(dueDay);
    const day = purchaseDate.getDate();
    const month = purchaseDate.getMonth();
    const year = purchaseDate.getFullYear();

    // Verifica se o vencimento ocorre no mês seguinte ao fechamento
    // Ex: fecha dia 25, vence dia 5 (do mês seguinte) -> true
    // Ex: fecha dia 6, vence dia 10 (do mesmo mês) -> false
    const isDueNextMonth = closing > due;

    // Se comprou antes do fechamento (0), entra na fatura atual. 
    // Se comprou no dia ou depois (1), entra na próxima fatura.
    let monthsAhead = day < closing ? 0 : 1;

    // Adiciona 1 mês extra se a regra do cartão joga o vencimento para o mês seguinte ao fechamento
    if (isDueNextMonth) {
        monthsAhead += 1;
    }

    return new Date(year, month + monthsAhead, due, 12, 0, 0);
};
