# SEA Scores: guia para agentes

Site estático (HTML, CSS e JavaScript puro, sem build) que mostra os jogos da NFL com o time favorito (Seahawks por padrão) no topo. Dados: API pública não oficial da ESPN, chamada direto do navegador. Publicado no GitHub Pages (branch `main`, pasta raiz). Idioma da interface: pt-BR.

## Estrutura
- `index.html`, `styles.css`, `sw.js` (service worker), `manifest.webmanifest`, `icons/`, `img/` (logotipo)
- `js/api.js`: único ponto de contato com a ESPN e normalização dos dados. Se a ESPN mudar o formato, só ele muda.
- `js/logic.js`: regras puras (semanas, intervalo de atualização). `js/util.js`: constantes, datas, helpers de HTML.
- `js/views/*.js`: telas (lista, detalhe, classificação). `js/app.js`: estado, rotas por hash, polling. `js/demo.js`: dados de exemplo só para desenvolvimento (`?demo=1`), nunca como alternativa a um erro.

## Comandos (Node 22 ou mais novo)
- Primeira vez: `npm install` e `npx playwright install chromium`.
- `npm test`: testes unitários (`node --test`, sem dependências). `npm run test:e2e`: testes de tela com Playwright. `npm run validate`: os dois.
- O `git push` roda `npm run validate` sozinho (`.githooks/pre-push`; o `npm install` liga isso). Teste falhando = push cancelado. Ainda não há CI no GitHub: o portão que vale é o local.
- Os testes nunca chamam a ESPN: usam dados reais guardados em `tests/fixtures/` (reduzidos aos campos usados). Para renovar, baixe novas respostas e reduza do mesmo jeito; confira os testes depois.

## Regras do projeto
- Todo texto que vem da ESPN passa por `esc()` antes de ir para `innerHTML` (há testes de XSS).
- Cor de destaque (`--accent`) só no time favorito. O topo do jogo usa as duas cores dos times da partida.
- Mudou ou criou arquivo em `js/`, `img/` ou `icons/`? Atualize a lista `SHELL` em `sw.js` e suba o número de `CACHE` (os testes avisam se faltar).
- Nunca chaves, tokens ou segredos no repositório. O repositório é público e a `main` é protegida (só o dono dá push).
- Texto novo: pt-BR, frases simples, sem pontos do meio nos títulos.

## Publicação
GitHub Pages republica sozinho em 1 a 2 minutos depois do push, mas o navegador pode mostrar a versão antiga por até 10 minutos (cache do Pages). O app instalado revalida sozinho.

Fluxo de trabalho de mudanças: branch, testes, `code-review`, `security-review`, resumo ao dono e só então push (skill `entrega-com-revisao-e-testes`).
