# NFL Scores

Site estático para acompanhar os jogos da NFL: o time favorito (Seahawks por padrão) no topo, lista da semana e detalhes por jogo (placar por quarto, pontuações, líderes, estatísticas e drives). Sem backend, sem chave de API e sem build. Veja [SPEC.md](SPEC.md).

## Rodar localmente

Os módulos ES precisam de HTTP (não abrem via `file://`):

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

- **Modo demo** (só para desenvolvimento, dados inventados): `http://localhost:8000/?demo=1` ou `/#demo`. Nunca é ativado sozinho; se a ESPN falhar, a página mostra o banner de erro e mantém os últimos dados.

## Estrutura

```
index.html        casca da página
styles.css        visual (cor de destaque = cor do time favorito)
js/app.js         bootstrap, roteamento por hash, polling, semanas
js/api.js         único ponto de contato com a ESPN + normalização
js/util.js        constantes (times, rótulos), datas, helpers de HTML
js/views/list.js  lista de jogos     js/views/game.js  detalhe do jogo
js/demo.js        dados de exemplo (só dev)
```

## Dados

API pública e **não oficial** da ESPN (`site.api.espn.com`), chamada direto do navegador (CORS liberado). Pode mudar sem aviso: todo o acesso fica em `js/api.js`. Se o CORS for bloqueado um dia, use o plano B da seção 9 do SPEC (GitHub Action que salva JSON no repo).

## Deploy (GitHub Pages)

Settings → Pages → *Deploy from a branch* → `main` / `/ (root)`. Os caminhos são relativos, então funciona em `https://<usuario>.github.io/nfl-scores/`. Observação: Pages a partir de repositório privado exige plano GitHub pago.

## Notas

- Fontes: Barlow Condensed e Inter via Google Fonts (decisão da POC aprovada); sem elas, cai na fonte do sistema.
- Nenhuma chave, token ou segredo neste repositório.
