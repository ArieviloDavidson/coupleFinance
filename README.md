# Couple Finance 💰

## 🎯 Objetivo
O **Couple Finance** é uma aplicação web desenvolvida para facilitar a gestão financeira compartilhada de casais. O objetivo principal é oferecer uma visão unificada e transparente das finanças, resolvendo dores comuns como o controle real do limite de cartões de crédito parcelados e o acompanhamento de metas orçamentárias mensais.

## ✨ Funcionalidades Principais

### 💳 Gestão Avançada de Cartões de Crédito
- **Limite Disponível em Tempo Real:** O app calcula quanto do limite sobra baseando-se nas compras em aberto, não apenas no limite total.
- **Parcelamento Inteligente:** Ao lançar uma compra parcelada (ex: 10x), o sistema projeta automaticamente os lançamentos para os meses futuros.
- **Visualização de Ciclo:** Considera datas de fechamento e vencimento para alocar a despesa no mês correto da fatura.

### 🎯 Metas e Orçamentos (Budgets)
- Definição de teto de gastos por categoria (ex: Alimentação, Lazer).
- Gráficos comparativos (Previsto vs. Realizado).
- **Lógica Anti-Duplicidade:** O sistema sabe diferenciar o que é "Gasto no Cartão" do "Pagamento da Fatura", evitando que a despesa seja contabilizada duas vezes no orçamento.

### 📊 Controle Financeiro
- **Transações:** Registro de receitas e despesas com categorização.
- **Carteiras:** Gestão de saldo de múltiplas contas bancárias.
- **Despesas Fixas:** Checklist mensal de contas recorrentes com botão de "Pagamento Rápido" (gera a transação e desconta do saldo automaticamente).

### 🔐 Segurança
- Autenticação via **Google (Firebase Auth)**.
- Sistema de **Allowlist**: Apenas e-mails previamente autorizados conseguem acessar o sistema e os dados.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React.js (Vite)
- **Banco de Dados:** Firebase Firestore
- **Autenticação:** Firebase Auth
- **Visualização de Dados:** Recharts
- **Hospedagem:** Vercel