# NFL Scores — Spec

Site estático para acompanhar os jogos da NFL, com o time favorito (Seahawks por padrão) no topo e uma tela de detalhes por jogo. Publicado no GitHub Pages. Sem backend, sem chave de API, sem build.

> **Implementação de referência:** o `index.html` que acompanha este spec é uma POC funcional e aprovada visualmente. Use-a como ponto de partida (layout, cores, normalização e ordenação já estão prontos) e a quebre na estrutura de arquivos da seção 2. Detalhes da POC e o que mudar estão na seção 11.

---

## 1. Objetivos

- Ver todos os jogos da semana numa lista simples, com placar e status.
- O jogo do time favorito aparece sempre primeiro, destacado.
- Tocar num jogo abre os detalhes: placar por quarto, scoring plays, estatísticas e líderes.
- Atualizar sozinho enquanto houver jogo ao vivo.
- Funcionar bem no celular.

**Fora do escopo (v1):** login, notificações push, fantasy, odds, histórico de temporadas antigas e PWA offline.

---

## 2. Stack e restrições

| Item | Decisão |
|---|---|
| Linguagem | HTML + CSS + JavaScript puro (ES modules) |
| Build | Nenhum: os arquivos são servidos como estão |
| Hospedagem | GitHub Pages (branch `main`, pasta raiz) |
| Dados | API pública não oficial da ESPN, chamada direto do navegador |
| Chaves/tokens | Nenhum |
| Roteamento | Hash: lista sem hash, jogo em `#game-{id}` (o Pages não faz rewrite de SPA) |
| Persistência | `localStorage` (time favorito) |

### Estrutura de arquivos

```
/
├── index.html
├── styles.css
├── js/
│   ├── app.js        # bootstrap, roteamento, polling
│   ├── api.js        # fetch + normalização dos dados da ESPN
│   ├── views/
│   │   ├── list.js   # lista de jogos
│   │   └── game.js   # detalhes do jogo
│   └── util.js       # datas, formatação, helpers de DOM
├── README.md
└── SPEC.md
```

---

## 3. Fonte de dados (ESPN, não oficial)

Base: `https://site.api.espn.com/apis/site/v2/sports/football/nfl`

| Uso | Endpoint |
|---|---|
| Jogos da semana atual | `GET /scoreboard` |
| Semana específica | `GET /scoreboard?seasontype={1\|2\|3}&week={n}&dates={ano}` (1 = pré, 2 = regular, 3 = playoffs) |
| Detalhes do jogo | `GET /summary?event={eventId}` |
| Lista de times | `GET /teams` |

Seahawks: abreviação `SEA` (id ESPN `26`; confira em `/teams`).

> ⚠️ A API não é documentada e pode mudar. Todo o acesso fica isolado em `api.js`, que devolve objetos normalizados (seção 4). Assim, se a ESPN mudar, só esse arquivo é ajustado.

### 3.1 Primeiro passo obrigatório: validar CORS

Antes de qualquer UI, abra a página no Pages (ou em `localhost`) e rode no console:

```js
fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard').then(r => r.json()).then(console.log)
```

- **Funcionou:** siga com o plano principal (fetch direto do navegador).
- **Bloqueado por CORS:** use o plano B (seção 9).

---

## 4. Modelo de dados normalizado

Os caminhos JSON abaixo são os esperados; confirme com uma resposta real antes de codar.

### Game (para a lista)

```js
{
  id,                 // events[].id
  date,               // events[].date (ISO, UTC)
  state,              // status.type.state: 'pre' | 'in' | 'post'
  statusText,         // status.type.shortDetail, ex: "Q3 4:12", "Final", "Sun 1:05 PM"
  isLive,             // state === 'in'
  venue,              // competitions[0].venue.fullName
  broadcast,          // competitions[0].broadcasts[0]?.names[0]
  possession,         // competitions[0].situation?.possession (team id), só ao vivo
  downDistance,       // competitions[0].situation?.shortDownDistanceText
  home: Team, away: Team
}
```

### Team

```js
{
  id, abbr,           // competitor.team.id / .abbreviation
  name,               // competitor.team.shortDisplayName
  logo,               // competitor.team.logo
  color,              // '#' + competitor.team.color
  score,              // Number(competitor.score) ou null se 'pre'
  record,             // competitor.records?.[0]?.summary, ex: "7-4"
  winner              // competitor.winner (bool, só em 'post')
}
```

### GameDetail (de `/summary`)

```js
{
  game: Game,                       // de header.competitions[0]
  linescores: { home: [..], away: [..] },   // competitors[].linescores[].displayValue
  scoringPlays: [{ period, clock, teamAbbr, text, homeScore, awayScore }],
  teamStats: [{ label, home, away }],       // boxscore.teams[].statistics[] (label/displayValue)
  leaders: [{ category, home: {name, value}, away: {name, value} }], // leaders[]
  drives: [...],                     // drives.previous[] (opcional, colapsado)
  winProb: [{ playId, home }]        // winprobability[] (opcional)
}
```

---

## 5. Telas

### 5.1 Lista (sem hash)

**Cabeçalho**
- Título "NFL" + seletor de semana (`‹ Semana 12 ›`), com o temporada/tipo vindo de `scoreboard.week` / `scoreboard.season`.
- Seletor de time favorito (ícone ⭐ abre um `<select>` com os 32 times).

**Ordem dos cards**
1. Jogo do favorito (card maior, borda na cor do time, label "Seu time"). Se o favorito estiver de folga (bye), mostre o card "SEA está de folga nesta semana".
2. Jogos ao vivo.
3. Próximos jogos, por data/hora.
4. Finalizados, do mais recente ao mais antigo.

Os jogos são agrupados por dia ("Domingo, 23 nov") dentro de cada bloco 3 e 4.

**Card de jogo**
- Logo + abreviação + record de cada time, com o placar alinhado à direita.
- Vencedor em negrito; o perdedor fica com opacidade reduzida quando o jogo está finalizado.
- Status: horário local (pré), "Q3 4:12" + ponto vermelho pulsante (ao vivo) ou "Final".
- Ao vivo: 🏈 ao lado de quem tem a posse + down & distance.
- O card inteiro é um link para `#game-{id}`.

### 5.2 Detalhe (`#game-{id}`)

1. **Header:** times grandes, placar, status e botão ← voltar.
2. **Placar por quarto:** tabela 1, 2, 3, 4, (OT) e T.
3. **Scoring plays:** lista cronológica com quarto, relógio, time, descrição e placar parcial.
4. **Líderes:** passe, corrida e recepção, lado a lado.
5. **Estatísticas do time:** tabela comparativa (first downs, jardas totais, turnovers, posse etc.).
6. **Drives** (colapsável, opcional).
7. **Info:** estádio, TV e horário.

Antes do jogo (`pre`), mostre só o header, a info e os records. As seções vazias não aparecem.

---

## 6. Comportamento

### Polling
| Situação | Intervalo |
|---|---|
| Algum jogo da semana está `in` | 30 s |
| Algum jogo começa nas próximas 2 h | 5 min |
| Nenhum dos dois | sem polling (só no load / troca de semana) |

- Pause quando `document.hidden` e retome com um fetch imediato no `visibilitychange`.
- Na tela de detalhe, faça polling só do `/summary` daquele jogo (mesmas regras).
- Não refaça a página inteira: re-renderize a lista e preserve o scroll.

### Time favorito
- Padrão `SEA`. Salvo em `localStorage['favTeam']`.
- A troca reordena a lista na hora e muda a cor de destaque (`--accent` = cor do time).

### Datas
- Sempre no fuso do navegador, com `Intl.DateTimeFormat('pt-BR', …)`.

### Erros e estados
- Carregando: skeleton dos cards.
- Erro de rede: um banner "Não foi possível atualizar. Tentando novamente…", mantendo os últimos dados na tela.
- Semana sem jogos: mensagem simples.

---

## 7. Visual

- Mobile-first, coluna única até 640 px; em telas largas, um grid de 2 colunas.
- Tema escuro por padrão, respeitando `prefers-color-scheme`.
- Fonte do sistema e números com `font-variant-numeric: tabular-nums`.
- Contraste AA, cards acessíveis por teclado e `aria-live="polite"` no placar ao vivo.
- Sem dependências externas. Os logos vêm da própria ESPN (CDN deles).

---

## 8. Deploy (GitHub Pages)

1. Crie um repo, ex: `nfl-scores`.
2. Faça push dos arquivos na `main`.
3. Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.
4. O site fica em `https://<usuario>.github.io/nfl-scores/`.
5. Use caminhos relativos (`./js/app.js`) para funcionar no subpath.

---

## 9. Plano B (se a ESPN bloquear CORS)

Continua sem backend próprio e sem tokens de API:

- Um **GitHub Action** com `schedule` (cron) baixa `scoreboard` e os `summary` dos jogos da semana via `curl` e faz commit em `data/*.json` no próprio repo.
- O front lê `./data/scoreboard.json` (mesmo domínio, sem CORS).
- Limitação: o cron do Actions roda a cada 5 min no mínimo (e às vezes atrasa), então o "ao vivo" fica com atraso. Só `api.js` muda: a URL base aponta para `./data/`.

---

## 10. Critérios de aceite

- [ ] A página carrega no GitHub Pages sem erros no console.
- [ ] O jogo do Seahawks aparece primeiro (ou o aviso de folga).
- [ ] A ordem do resto segue: ao vivo, próximos, finalizados.
- [ ] Os horários aparecem no fuso local.
- [ ] Trocar a semana funciona, inclusive na virada para os playoffs.
- [ ] Tocar num jogo abre o detalhe, e o voltar do navegador funciona.
- [ ] Durante um jogo ao vivo, o placar atualiza sozinho a cada ~30 s sem recarregar a página.
- [ ] Trocar o favorito persiste depois de recarregar.
- [ ] Usável em tela de 375 px.
- [ ] Nenhuma chave, token ou segredo no repositório.

---

## 11. POC (`index.html`): o que já está decidido

### Visual (aprovado)
- Fontes: **Barlow Condensed** 600/700 (siglas, placares, títulos) + **Inter** 400/500/600 (texto), via Google Fonts.
- Cores base (claro/escuro com `light-dark()`): fundo `#eef1f3`/`#0a1117`, card `#fff`/`#121c25`, texto `#0d1820`/`#e7edf1`, secundário `#5a6a76`/`#8c9ba7`, linhas `#dbe1e6`/`#213040`, ao vivo `#e0353b`.
- **Cor de destaque = cor do time favorito.** Use a cor principal; se a luminância for < 0.06 (muito escura, ex. Seahawks `#002244`), use a alternativa (Seahawks: verde `#69be28`). O texto sobre o destaque é escuro ou branco conforme a luminância. A tabela `TEAMS` da POC tem nome e as duas cores dos 32 times.
- Card do favorito: maior, fundo tingido com 15% da cor de destaque, borda de 2px e chip "Seu time".
- Placar ao vivo: ponto vermelho pulsante (desligado com `prefers-reduced-motion`). A posse de bola é um ponto na cor de destaque ao lado do time.
- Perdedor de jogo finalizado com opacidade de 0.5.

### Logos
- Use `team.logo` do scoreboard ou `team.logos[0].href` do summary.
- Fallback quando o campo não vier: `https://a.espncdn.com/i/teamlogos/nfl/500/{abbr minúsculo}.png`.
- Se a imagem falhar, troque por um círculo na cor do time com a sigla (handler global de `error` em fase de captura).

### Textos de status (ESPN → pt-BR)
| ESPN `shortDetail` | Exibir |
|---|---|
| `5:12 - 4th` | `4º Q · 5:12` |
| `Halftime` | `Intervalo` |
| `End of 3rd` | `Fim do 3º Q` |
| `Final` / `Final/OT` | `Final` / `Final · prorrogação` |
| pré-jogo, < 2 h | `Começa em 23 min` |
| pré-jogo | horário local (card do favorito: dia + horário) |

Down & distance (`1st & 10 at SF 42`) fica em inglês.

### Detalhe do jogo
- Labels das estatísticas pelo `name` da ESPN: `firstDowns` → First downs, `totalYards` → Jardas totais, `netPassingYards` → Jardas de passe, `rushingYards` → Jardas de corrida, `thirdDownEff` → 3ª descida, `turnovers` → Turnovers, `totalPenaltiesYards` → Penalidades, `possessionTime` → Posse de bola. Mostre só essas.
- Líderes: `passingYards` → Passe, `rushingYards` → Corrida, `receivingYards` → Recepção.
- Ordem visitante à esquerda, mandante à direita, em todo lugar (placar `visitante–mandante`).

### Comportamento extra
- Depois de um erro de rede, tente de novo em 60 s.
- Navegação de semanas: regular 1–18; depois da 18 vai para playoffs (1 Wild Card, 2 Divisional, 3 Final de conferência, 4 Pro Bowl, 5 Super Bowl); antes da 1 vai para pré-temporada 1–4.
- O botão Voltar usa `history.back()` se o usuário veio da lista; senão, limpa o hash.

### O que mudar ao levar para produção
1. **Modo demo:** na POC, se o fetch da ESPN falhar, a página cai em dados inventados (`DEMO`). Em produção isso **não pode** acontecer sozinho: uma falha mostra o banner de erro e mantém os últimos dados. Mantenha o `DEMO` só para desenvolvimento, ativado com `#demo` ou `?demo=1`.
2. Separar o arquivo único na estrutura da seção 2 (`api.js` com a normalização, `views/list.js`, `views/game.js`).
3. Os líderes do `DEMO` usam nomes genéricos (`QB · SEA`); os reais vêm de `athlete.displayName`.
4. Conferir com uma resposta real da ESPN os caminhos JSON usados em `normTeam`, `normGame` e `normDetail` (a POC só foi testada com os dados de exemplo).

---

## 12. Ordem de implementação sugerida

0. Partir do `index.html` da POC (seção 11).
1. Validar CORS (3.1).
2. `api.js`: `getScoreboard(week?)`, `getGame(id)`, `getTeams()` + normalização.
3. Lista estática (sem ordenação/polling).
4. Ordenação + favorito.
5. Roteamento + tela de detalhe.
6. Polling + visibilidade.
7. Navegação por semana.
8. Polimento visual, estados de erro/loading e deploy.
