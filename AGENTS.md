# Regras para o Assistente (AGENTS.md)

1. **Planejamento Obrigatório Antes da Execução**:
   - Sempre que uma tarefa for solicitada, elabore primeiro o plano de implementação detalhado e **aguarde a confirmação/aprovação explícita do usuário** antes de executar qualquer modificação no código.

2. **Controle Estrito de Git**:
   - **NUNCA** execute comandos de `git commit`, `git push` ou `git merge` por conta própria. Essas operações só devem ser realizadas se forem **EXPLICITAMENTE** solicitadas pelo usuário.

3. **Padrão de Commits (Conventional Commits em Português) e Commits Separados**:
   - Quando um commit for explicitamente solicitado, utilize o padrão **Conventional Commits** no formato `tipo(escopo): descrição`, escrevendo a mensagem **SEMPRE em português**.
   - **Tipos permitidos**:
     - `feat`: Nova funcionalidade (ex: `feat(expenses): adiciona campo de observação`)
     - `fix`: Correção de bug (ex: `fix(cards): corrige data de competência no gráfico`)
     - `docs`: Alterações apenas em documentação (ex: `docs(readme): atualiza instruções de instalação`)
     - `style`: Alterações de formatação/estilo sem impacto na lógica (ex: `style(dashboard): remove imports não utilizados`)
     - `test`: Adicionar ou corrigir testes (ex: `test(expenses): adiciona testes para despesas pagas`)
     - `ci`: Alterações em pipelines de CI/CD (ex: `ci(github): adiciona job de testes`)
     - `chore`: Tarefas de manutenção, dependências, configs (ex: `chore(deps): atualiza vitest`)
     - `build`: Alterações no sistema de build ou ferramentas (ex: `build(vite): ajusta configurações de build`)
     - `perf`: Melhorias reais de performance (ex: `perf(query): otimiza busca de transações`)
   - **Commits Atômicos/Separados**: Se houver assuntos ou arquivos de contextos diferentes para commitar, divida as alterações em **commits separados**, agrupando apenas os arquivos e mudanças pertinentes a cada assunto.
