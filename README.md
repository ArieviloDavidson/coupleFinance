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

## 🚀 Próximos Passos

### 🧪 Testes Automatizados

Atualmente o projeto não possui testes automatizados. Abaixo está o roadmap de implementação, organizado por **prioridade** e **retorno de investimento**.

#### Fase 1 — Configuração Base `🔴 Alta Prioridade`
> **Tecnologia:** [Vitest](https://vitest.dev/) (test runner nativo do Vite, API compatível com Jest)

- [ ] Instalar Vitest como dependência de desenvolvimento (`npm i -D vitest`)
- [ ] Configurar script `"test"` e `"test:watch"` no `package.json`
- [ ] Configurar `vitest.config.js` com alias de paths do projeto
- [ ] Criar estrutura de diretórios: `src/__tests__/` ou co-located (`*.test.js` junto do arquivo)

#### Fase 2 — Testes Unitários da Camada API `🔴 Alta Prioridade`
> **Tecnologia:** Vitest + mock do Firebase (`vi.mock`)
>
> **Por quê prioridade alta?** A camada `src/api/` concentra toda a lógica de negócio crítica — atomicidade de batch, cálculos financeiros e validações. Um bug aqui impacta diretamente o saldo e as transações.

- [ ] `api/cards.js` — Testar `addCardPurchase()`:
  - Compra parcelada com categoria "Assinaturas" cria despesa fixa automaticamente
  - Compra 1x **não** cria despesa fixa
  - Duplicata de despesa fixa aborta toda a operação (atomicidade)
  - Parcelas são distribuídas corretamente nos meses seguintes
- [ ] `api/cards.js` — Testar `payCardPurchase()`:
  - Status muda para 'pago'
  - Saldo da carteira é decrementado
  - Transação de histórico é criada
- [ ] `api/fixedExpenses.js` — Testar `payFixedExpenseWithWallet()` e `payFixedExpenseWithCard()`:
  - Operações atômicas (batch commit)
  - Valores corretos na transação
- [ ] `api/transactions.js` — Testar `addTransactionWithWalletUpdate()` e `deleteTransactionWithRefund()`:
  - Entrada incrementa saldo, saída decrementa
  - Exclusão reverte o saldo corretamente
- [ ] `api/wallets.js` — Testar operações de transferência entre carteiras

#### Fase 3 — Testes de Utilidades `🟡 Média Prioridade`
> **Tecnologia:** Vitest (sem mocks — funções puras)

- [ ] `utils/constants.js` — Validar que categorias e collections estão corretas
- [ ] `utils/dateUtils.js` — Testar `parseDateToNoon()` com edge cases (fuso horário, virada de mês)
- [ ] Funções de cálculo nos componentes (ex: `getCardMetrics`, `predictionValue`)

#### Fase 4 — CI/CD no GitHub Actions `🟡 Média Prioridade`
> **Tecnologia:** [GitHub Actions](https://docs.github.com/en/actions) (grátis: 2.000 min/mês para repos privados)
>
> **Objetivo:** Rodar testes automaticamente a cada `push` ou `pull request`, impedindo que código quebrado entre no `main`.

- [ ] Criar workflow `.github/workflows/test.yml`
- [ ] Configurar steps: checkout → install → test → build
- [ ] Adicionar badge de status no README
- [ ] (Opcional) Bloquear merge no `main` se os testes falharem (branch protection)

#### Fase 5 — Testes de Componentes `🟢 Baixa Prioridade (futuro)`
> **Tecnologia:** Vitest + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
>
> **Por quê baixa prioridade?** O projeto é pequeno o suficiente para validar UI manualmente. Quando crescer, esses testes evitam regressões visuais.

- [ ] Testar renderização dos modais (`FixedExpensesPayModal`, `PayOffModal`)
- [ ] Testar formulários (`CardShoppingForm`, `TransactionForm`) — validações e submit
- [ ] Testar fluxo de navegação do `App.jsx` (sidebar, `navigateData`)

#### Fase 6 — Testes E2E `⚪ Overkill por agora (futuro distante)`
> **Tecnologia:** [Playwright](https://playwright.dev/) (browser real, suporta múltiplos navegadores)
>
> **Quando implementar?** Quando o projeto tiver mais de ~20 páginas ou múltiplos contribuidores.

- [ ] Testar fluxo completo: Login → Compra no Cartão → Verificar Despesa Fixa criada
- [ ] Testar fluxo de pagamento: Despesa Fixa → Pagar → Verificar saldo

---

**Referência rápida de comandos (após configuração):**
```bash
npm test            # Roda todos os testes uma vez
npm run test:watch  # Modo watch (re-roda ao salvar)
npx vitest --ui     # Interface visual dos testes no browser
```
