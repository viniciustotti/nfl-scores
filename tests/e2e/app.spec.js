import {test, expect} from '@playwright/test';
import {mockEspn, watchErrors, noHScroll, fixture} from './helpers.js';

const NOON = new Date('2026-11-22T20:00:00Z');

test.beforeEach(async ({page}) => { await page.clock.install({time: NOON}); });

test('lista: logotipo centralizado, folga do Seahawks, blocos e linhas em ordem', async ({page}) => {
  const errors = watchErrors(page); await mockEspn(page);
  await page.goto('/');
  await expect(page.locator('.bye')).toHaveText('Os Seahawks estão de folga nesta semana.');
  await expect(page).toHaveTitle('SEA Scores');
  await expect(page.locator('.masthead img')).toBeVisible();
  const [logo, col] = await page.evaluate(() => { const a = document.querySelector('.masthead img').getBoundingClientRect(), b = document.querySelector('main').getBoundingClientRect();
    return [a.left + a.width / 2, b.left + b.width / 2]; });
  expect(Math.abs(logo - col)).toBeLessThan(2);
  await expect(page.locator('h2')).toHaveText(['Ao vivo', 'Próximos', 'Finalizados']);
  await expect(page.locator('a.g')).toHaveCount(4);
  await expect(page.locator('.status.live')).toHaveCount(1);
  await expect(page.locator('#wk')).toHaveText('Semana 11');
  expect(errors).toEqual([]);
});

test('favorito: trocar para o SF mostra o cartão do jogo e persiste ao recarregar', async ({page}) => {
  await mockEspn(page);
  await page.goto('/');
  await page.selectOption('#fav', 'SF');
  await expect(page.locator('a.g.fav')).toContainText('SF');
  await expect(page.locator('a.g.fav')).toHaveAttribute('aria-label', /^Seu time: /);
  await page.reload();
  await expect(page.locator('#fav')).toHaveValue('SF');
  await expect(page.locator('a.g.fav')).toHaveCount(1);
});

test('detalhe: abre o jogo, mostra as duas cores no topo, abas e o botão voltar', async ({page}) => {
  const errors = watchErrors(page); await mockEspn(page);
  await page.goto('/');
  await page.locator('a[href="#game-401873071"]').click();
  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.locator('.hero .abbr')).toHaveText(['NO', 'CHI']);
  await expect(page.locator('.tabs button')).toHaveText(['Resumo', 'Jogadores']);
  await expect(page.getByRole('heading', {name: 'Placar por quarto'})).toBeVisible();
  await page.getByRole('tab', {name: 'Jogadores'}).click();
  await expect(page.getByRole('heading', {name: 'Passe'})).toBeVisible();
  await page.locator('[data-pteam="home"]').click();
  await expect(page.locator('.seg .on')).toHaveText('CHI');
  await page.locator('#back').click();
  await expect(page).toHaveURL(/\/#?$/);
  await expect(page.locator('a.g')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('detalhe: pré-jogo não tem abas nem placar por quarto', async ({page}) => {
  await mockEspn(page);
  await page.goto('/#game-401873078');
  await expect(page.getByRole('heading', {name: 'Informações'})).toBeVisible();
  await expect(page.locator('.tabs')).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Placar por quarto'})).toHaveCount(0);
});

test('classificação: divisões, favorito destacado, conferência com linha de playoffs', async ({page}) => {
  const errors = watchErrors(page); await mockEspn(page);
  await page.goto('/');
  await page.getByRole('link', {name: 'Classificação'}).click();
  await expect(page.locator('.card h3')).toHaveText(['NFC Leste', 'NFC Norte', 'NFC Sul', 'NFC Oeste']);
  await expect(page.locator('.stand tr.me')).toContainText('SEA');
  await page.locator('[data-sview="conf"]').click();
  await expect(page.locator('.stand tbody tr')).toHaveCount(16);
  await expect(page.locator('.stand tbody tr').nth(7)).toHaveClass(/cut/);
  await page.locator('[data-sconf="AFC"]').click();
  await expect(page.locator('.card h3')).toHaveText('Classificação da AFC');
  await page.getByRole('link', {name: 'Jogos', exact: true}).click();
  await expect(page.locator('a.g')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('troca de semana pede a semana certa e a lista volta a carregar', async ({page}) => {
  const urls = []; await mockEspn(page);
  page.on('request', r => { if (r.url().includes('/scoreboard')) urls.push(r.url()); });
  await page.goto('/');
  await page.locator('#prev').click();
  await expect.poll(() => urls.some(u => /week=10/.test(u))).toBe(true);
});

test('erro de rede: banner de erro e nenhum dado inventado', async ({page}) => {
  await mockEspn(page, {fail: true});
  await page.goto('/');
  await expect(page.locator('.notice.err')).toContainText('Não foi possível atualizar');
  await expect(page.locator('a.g')).toHaveCount(0);
  await expect(page.locator('.notice:not(.err)')).toHaveCount(0);   // nada de "Modo demo" sozinho
});

test('erro de rede depois de carregar: mantém a lista e mostra a hora dos últimos dados', async ({page}) => {
  const m = await mockEspn(page);
  await page.goto('/');
  await expect(page.locator('a.g')).toHaveCount(4);
  m.state.fail = true;
  await page.clock.runFor(30_000 + 2_000);
  await expect(page.locator('.notice.err')).toContainText('Mostrando dados de');
  await expect(page.locator('a.g')).toHaveCount(4);
});

test('atualização automática: com jogo ao vivo a lista busca de novo em 30 s', async ({page}) => {
  const m = await mockEspn(page);
  await page.goto('/');
  await expect(page.locator('a.g')).toHaveCount(4);
  const before = m.calls.scoreboard;
  await page.clock.runFor(30_000 + 2_000);
  await expect.poll(() => m.calls.scoreboard).toBeGreaterThan(before);
});

test('sem jogo ao vivo e com o próximo jogo longe: acorda sozinho quando a janela de 2 h se aproxima', async ({page}) => {
  const sb = fixture('scoreboard');
  sb.events = sb.events.filter(e => e.status.type.state !== 'in');   // sem jogo ao vivo
  const m = await mockEspn(page, {scoreboard: sb});
  await page.clock.setSystemTime(new Date('2026-11-23T10:00:00Z'));   // pré-jogo é 2026-11-24T01:15Z: bem adiante
  await page.goto('/');
  await expect(page.locator('a.g')).toHaveCount(3);
  const before = m.calls.scoreboard;
  // O timer é de 30 min. Avançar além disso estoura o limite de 8 s da requisição (que também usa o relógio falso) antes da resposta chegar.
  await page.clock.runFor(30 * 60_000 + 2_000);
  await expect.poll(() => m.calls.scoreboard).toBeGreaterThan(before);
});

test.describe('celular 375 px', () => {
  test.use({viewport: {width: 375, height: 700}});
  test('lista, detalhe e classificação sem rolagem horizontal, logotipo e navegação visíveis', async ({page}) => {
    const errors = watchErrors(page); await mockEspn(page);
    await page.goto('/');
    await expect(page.locator('a.g')).toHaveCount(4);
    expect(await noHScroll(page)).toBe(true);
    await expect(page.locator('.masthead img')).toBeVisible();
    await expect(page.getByRole('link', {name: 'Classificação'})).toBeVisible();
    await page.locator('a[href="#game-401873071"]').click();
    await expect(page.locator('.hero')).toBeVisible();
    expect(await noHScroll(page)).toBe(true);
    await page.getByRole('tab', {name: 'Jogadores'}).click();
    await expect(page.getByRole('heading', {name: 'Passe'})).toBeVisible();
    expect(await noHScroll(page)).toBe(true);
    await page.goto('/#standings');
    await expect(page.locator('.stand').first()).toBeVisible();
    expect(await noHScroll(page)).toBe(true);
    await expect(page.locator('.stand th.s').first()).toBeHidden();   // colunas secundárias somem no celular
    expect(errors).toEqual([]);
  });
});

test('service worker: instala, guarda o logotipo e o app abre da cache com a rede desligada', async ({page, context}) => {
  await mockEspn(page);
  await page.goto('/');
  await expect(page.locator('a.g')).toHaveCount(4);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.evaluate(() => new Promise(r => { if (navigator.serviceWorker.controller) r(); else navigator.serviceWorker.addEventListener('controllerchange', r); }));
  const cached = await page.evaluate(async () => (await (await caches.open(await (async () => (await caches.keys())[0])())).keys()).map(r => new URL(r.url).pathname));
  expect(cached).toEqual(expect.arrayContaining(['/js/logic.js', '/img/logo-light.png', '/styles.css']));
  await context.setOffline(true);
  const res = await page.evaluate(async () => (await fetch('/js/app.js')).status);
  expect(res).toBe(200);
});
