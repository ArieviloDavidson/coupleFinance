# Testes do Couple Finance

Este diretório contém a suíte de testes automatizados do projeto **Couple Finance**. Utilizamos o **Vitest** como framework de testes para garantir que a lógica de negócios funcione corretamente.

## 🛠 Como executar os testes localmente

Você pode rodar os testes de duas maneiras usando o terminal na raiz do projeto:

### 1. Rodar os testes uma única vez
Para rodar todos os testes de ponta a ponta e apenas ver o resultado (ideal para rodar antes de um commit ou para apenas confirmar se está tudo funcionando):
```bash
npm run test
```

### 2. Rodar os testes no modo contínuo (Watch Mode)
Para deixar os testes rodando em background. Neste modo, sempre que você editar e salvar um arquivo do projeto, o Vitest vai identificar a mudança e reexecutar automaticamente os testes relacionados. Isso é ideal enquanto você está programando novas funções:
```bash
npm run test:watch
```

## 📂 Estrutura e Arquivos de Teste

Nossos testes estão focados em isolar as lógicas mais importantes (regras de negócio) para garantir que cálculos e regras nunca quebrem com as atualizações do app. A suíte atual conta com os seguintes arquivos:

- **`dateUtils.test.js`**
  Testa as funções de manipulação de datas, garantindo o cálculo correto de meses, anos e principalmente o cálculo exato do vencimento das faturas de cartão de crédito.
  
- **`paidExpensesLogic.test.js`**
  Valida o comportamento complexo de baixar (pagar) despesas, garantindo que as lógicas de dedução ou fluxo de transações funcionem da forma esperada.
  
- **`transactionPayloads.test.js`**
  Assegura que os objetos de dados que montamos antes de mandar para o banco de dados estão estruturados com as propriedades corretas baseados no tipo de transação.
  
- **`categoryLogic.test.js`**
  Testa validações e regras que se baseiam nas diferentes categorias (gastos, receitas, faturas, etc.).
  
- **`constants.test.js`**
  Testa se as variáveis de ambiente e as constantes globais contêm todos os valores vitais para o funcionamento do app (se você renomear ou deletar uma categoria principal sem querer, esse teste vai avisar).

## 💡 Dicas

- Sempre que você alterar lógicas matemáticas ou de regras de negócio na pasta `src/utils` ou em componentes que processem dados, é recomendado rodar `npm run test` para validar se nada do comportamento anterior quebrou.
- Novos arquivos de teste devem sempre terminar com `.test.js` para que o *Vitest* os encontre automaticamente.
