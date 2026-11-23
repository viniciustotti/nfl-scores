// Dados inventados, só para desenvolvimento: ative com #demo ou ?demo=1. Nunca é usado como fallback de erro.
import {TEAMS} from './util.js';

export const DEMO = (() => {
  const WEEK = 11, YEAR = 2026;
  // id, início (UTC), estado, detalhe, quarto, visitante, recorde, placar, mandante, recorde, placar, estádio, TV, posse, situação
  const G = [
    ['901','2026-11-20T01:15Z','post','Final',4,'NYJ','3-7',17,'NE','6-4',24,'Gillette Stadium','Prime Video'],
    ['902','2026-11-22T18:05Z','in','5:12 - 4th',4,'SF','6-4',20,'SEA','7-3',27,'Lumen Field','FOX','SEA','1st & 10 at SF 42'],
    ['903','2026-11-22T18:00Z','in','2:47 - 4th',4,'DET','8-2',24,'GB','6-4',21,'Lambeau Field','FOX','GB','3rd & 4 at DET 38'],
    ['904','2026-11-22T18:00Z','in','9:15 - 3rd',3,'BUF','7-3',13,'MIA','4-6',10,'Hard Rock Stadium','CBS','MIA','2nd & 7 at MIA 30'],
    ['905','2026-11-22T18:00Z','in','11:02 - 4th',4,'PIT','6-4',20,'BAL','6-4',20,'M&T Bank Stadium','CBS','BAL','1st & 10 at BAL 25'],
    ['906','2026-11-22T18:00Z','in','Halftime',2,'CAR','3-7',6,'ATL','5-5',17,'Mercedes-Benz Stadium','FOX'],
    ['907','2026-11-22T18:00Z','post','Final',4,'TEN','2-8',10,'IND','6-4',27,'Lucas Oil Stadium','CBS'],
    ['908','2026-11-22T21:05Z','pre','',0,'LAR','7-3',null,'LAC','6-4',null,'SoFi Stadium','CBS'],
    ['909','2026-11-22T21:25Z','pre','',0,'DAL','5-5',null,'PHI','8-2',null,'Lincoln Financial Field','FOX'],
    ['910','2026-11-22T21:25Z','pre','',0,'KC','8-2',null,'DEN','6-4',null,'Empower Field at Mile High','FOX'],
    ['911','2026-11-23T01:20Z','pre','',0,'MIN','7-3',null,'CHI','5-5',null,'Soldier Field','NBC'],
    ['912','2026-11-24T01:15Z','pre','',0,'HOU','6-4',null,'JAX','4-6',null,'EverBank Stadium','ESPN']];
  const comp = r => {
    const [id, date, state, detail, period, aw, ar, as, hm, hr, hs, venue, tv, poss, dd] = r;
    const c = (ab, rec, sc, side) => ({homeAway:side, team:{id:ab, abbreviation:ab, shortDisplayName:TEAMS[ab][0], color:TEAMS[ab][1]},
      score:sc == null ? '' : String(sc), records:[{summary:rec}], winner:state === 'post' && sc > (side === 'home' ? as : hs)});
    return {id, date, status:{period, type:{state, shortDetail:detail}}, venue:{fullName:venue}, broadcasts:[{names:[tv]}],
      situation:poss ? {possession:poss, downDistanceText:dd} : undefined, competitors:[c(hm, hr, hs, 'home'), c(aw, ar, as, 'away')]};
  };
  const ri0 = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const split = s => { let n7 = Math.floor(s / 7), r = s - 7 * n7; while (r % 3 && n7 > 0) { n7--; r += 7; }
    return [...Array(n7).fill(7), ...(r % 3 === 0 ? Array(r / 3).fill(3) : [r])].filter(Boolean); };
  return {
    standings(){
      const D = {'AFC East':'BUF MIA NE NYJ','AFC North':'BAL CIN CLE PIT','AFC South':'HOU IND JAX TEN','AFC West':'DEN KC LV LAC',
        'NFC East':'DAL NYG PHI WSH','NFC North':'CHI DET GB MIN','NFC South':'ATL CAR NO TB','NFC West':'ARI LAR SF SEA'};
      const R = rng(2026), conf = {AFC:[], NFC:[]};
      const divs = Object.entries(D).map(([name, ab]) => ({name, teams:ab.split(' ').map(a => { const w = ri0(R, 2, 9), l = 10 - w;
        const t = {a, w, l, pct:w / 10, pf:ri0(R, 160, 300), pa:ri0(R, 160, 300)}; conf[name.slice(0, 3)].push(t); return t; }).sort((x, y) => y.pct - x.pct)}));
      Object.values(conf).forEach(ts => { const lead = new Set(divs.filter(d => d.teams[0] && ts.includes(d.teams[0])).map(d => d.teams[0]));
        [...ts].sort((x, y) => (lead.has(y) - lead.has(x)) || (y.pct - x.pct)).forEach((t, i) => { t.seed = i + 1; }); });
      const entry = t => ({team:{id:t.a, abbreviation:t.a, shortDisplayName:TEAMS[t.a][0], logos:[{href:`https://a.espncdn.com/i/teamlogos/nfl/500/${t.a.toLowerCase()}.png`}]},
        stats:Object.entries({overall:`${t.w}-${t.l}`, winPercent:t.pct.toFixed(3).slice(1), pointsFor:t.pf, pointsAgainst:t.pa, differential:(t.pf - t.pa >= 0 ? '+' : '') + (t.pf - t.pa),
          streak:(t.w > 5 ? 'W' : 'L') + ri0(R, 1, 4), Home:'3-2', Road:'2-3', 'vs. Div.':'2-1', 'vs. Conf.':'5-3', playoffSeed:t.seed}).map(([name, v]) => ({name, displayValue:String(v)}))});
      return {season:{year:YEAR, displayName:String(YEAR)}, children:['AFC', 'NFC'].map(c => ({abbreviation:c, name:c, children:divs.filter(d => d.name.startsWith(c))
        .map(d => ({name:d.name, standings:{entries:d.teams.map(entry)}}))}))};
    },
    scoreboard({type, week} = {}){
      if ((week && week !== WEEK) || (type && type !== 2)) return {events:[], week:{number:week}, season:{type, year:YEAR}};
      return {events:G.map(r => { const c = comp(r); return {id:c.id, date:c.date, status:c.status, competitions:[c]}; }),
        week:{number:WEEK}, season:{type:2, year:YEAR}};
    },
    summary(id){
      const r = G.find(x => x[0] === id); if (!r) throw new Error('jogo não encontrado');
      const c = comp(r), R = rng(+id * 7919), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
      const state = r[2], period = state === 'post' ? 4 : state === 'in' ? r[4] : 0;
      const cm = String(r[3]).match(/^(\d+):(\d+)/), curSec = cm ? +cm[1] * 60 + +cm[2] : 0;
      const ev = [];
      c.competitors.forEach(t => split(Number(t.score) || 0).forEach(pts => {
        const q = ri(1, Math.max(1, period)), lo = state === 'in' && q === period ? curSec : 0;
        ev.push({ab:t.team.abbreviation, side:t.homeAway, pts, q, sec:ri(lo, 899)});
      }));
      ev.sort((a, b) => a.q - b.q || b.sec - a.sec);
      const run = {home:0, away:0}, ls = {home:[], away:[]};
      for (let q = 0; q < period; q++) { ls.home[q] = 0; ls.away[q] = 0; }
      const scoringPlays = period ? ev.map(e => {
        run[e.side] += e.pts; ls[e.side][e.q - 1] += e.pts;
        const text = e.pts === 7 ? (R() < .6 ? `TD em passe de ${ri(3, 45)} jardas` : `TD em corrida de ${ri(1, 25)} jardas`) + ' (PAT bom)'
          : e.pts === 3 ? `Field goal de ${ri(22, 54)} jardas` : `${e.pts} pontos`;
        return {period:{number:e.q}, clock:{displayValue:`${Math.floor(e.sec / 60)}:${String(e.sec % 60).padStart(2, '0')}`},
          team:{abbreviation:e.ab}, text, homeScore:run.home, awayScore:run.away};
      }) : [];
      const stats = () => { const p = ri(150, 320), ru = ri(60, 160);
        return [['firstDowns', ri(14, 26)], ['totalYards', p + ru], ['netPassingYards', p], ['rushingYards', ru],
          ['thirdDownEff', `${ri(3, 7)}-${ri(10, 14)}`], ['turnovers', ri(0, 2)], ['totalPenaltiesYards', `${ri(3, 8)}-${ri(20, 70)}`],
          ['possessionTime', `${ri(26, 33)}:${String(ri(0, 59)).padStart(2, '0')}`]].map(([name, v]) => ({name, displayValue:String(v)})); };
      const players = ab => { const cat = (name, labels, rows, totals) => ({name, labels, totals,
          athletes:rows.map((st, i) => ({athlete:{displayName:`${name} ${i + 1} · ${ab}`, jersey:String(ri(1, 99))}, stats:st.map(String)}))});
        return [cat('passing', ['C/ATT', 'YDS', 'AVG', 'TD', 'INT', 'SACKS', 'QBR', 'RTG'], [[`${ri(15, 26)}/${ri(27, 38)}`, ri(170, 320), '6.8', ri(0, 3), ri(0, 2), '2-14', '55.2', '92.4']], ['20/30', '230', '6.8', '2', '1', '2-14', '--', '92.4']),
          cat('rushing', ['CAR', 'YDS', 'AVG', 'TD', 'LONG'], [[ri(10, 20), ri(40, 110), '4.1', ri(0, 2), ri(8, 30)], [ri(2, 8), ri(5, 40), '3.2', 0, 9]], ['20', '120', '4.0', '1', '30']),
          cat('receiving', ['REC', 'YDS', 'AVG', 'TD', 'LONG', 'TGTS'], [[ri(4, 9), ri(50, 120), '11.4', ri(0, 2), ri(15, 40), ri(6, 12)], [ri(2, 6), ri(20, 70), '9.1', 0, 22, 6]], ['14', '170', '11.2', '2', '40', '18']),
          cat('defensive', ['TOT', 'SOLO', 'SACKS', 'TFL', 'PD', 'QB HTS', 'TD'], [[ri(5, 12), ri(3, 8), ri(0, 2), 1, 0, 1, 0], [ri(3, 8), 2, 0, 0, 1, 0, 0]], ['62', '38', '2', '4', '3', '2', '0']),
          cat('interceptions', ['INT', 'YDS', 'TD'], [[1, 12, 0]], ['1', '12', '0']),
          cat('fumbles', ['FUM', 'LOST', 'REC'], [[1, 1, 0]], ['1', '1', '0']),
          cat('kicking', ['FG', 'PCT', 'LONG', 'XP', 'PTS'], [['2/2', '100.0', '44', '3/3', 9]], ['2/2', '100.0', '44', '3/3', '9']),
          cat('punting', ['NO', 'YDS', 'AVG', 'TB', 'In 20', 'LONG'], [[3, 140, '46.7', 0, 1, 52]], ['3', '140', '46.7', '0', '1', '52'])]; };
      const teams = c.competitors.map(t => t.team.abbreviation);
      return {
        header:{id, competitions:[{...c, competitors:c.competitors.map(t => ({...t, linescores:ls[t.homeAway].map(v => ({displayValue:String(v)}))}))}]},
        scoringPlays,
        boxscore:{teams:period ? teams.map(ab => ({team:{abbreviation:ab}, statistics:stats()})) : [], players:period ? teams.map(ab => ({team:{abbreviation:ab}, statistics:players(ab)})) : []},
        leaders:period ? teams.map(ab => ({team:{abbreviation:ab}, leaders:[
          {name:'passingYards', leaders:[{athlete:{displayName:`QB · ${ab}`}, displayValue:`${ri(15, 26)}/${ri(27, 38)}, ${ri(170, 320)} jds, ${ri(0, 3)} TD`}]},
          {name:'rushingYards', leaders:[{athlete:{displayName:`RB · ${ab}`}, displayValue:`${ri(10, 24)} corridas, ${ri(40, 130)} jds`}]},
          {name:'receivingYards', leaders:[{athlete:{displayName:`WR · ${ab}`}, displayValue:`${ri(4, 9)} recepções, ${ri(50, 140)} jds`}]}]})) : [],
        gameInfo:{venue:c.venue}
      };
    }
  };
})();
