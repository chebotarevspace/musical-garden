/** Pixel-art plants on a 12×16 grid. Each letter is a colour from PALETTE, "." is empty. */
import type { Species } from '../../lib/garden';

export const PALETTE: Record<string, string> = {
  G: '#2f7d3a',
  g: '#4caf50',
  l: '#8bd16a',
  t: '#8d5a3b',
  T: '#6b4226',
  w: '#f3efe6',
  k: '#3a3a3a',
  b: '#6b95ef',
  B: '#3d63c9',
  y: '#f4c430',
  Y: '#ffde59',
  o: '#e8833a',
  r: '#d9483b',
  R: '#a83226',
  P: '#f6a9c8',
  Q: '#e57aa5',
  n: '#6b4428',
  N: '#4a2f1c',
  c: '#6fc3df',
  C: '#4aa3c4',
  '*': '#fffbe0',
  D: '#1f5e33',
  s: '#ffffff',
  O: '#c9601f',
  e: '#2a2a2a',
};

const TRUNK_BIRCH = ['....gwwg....', '.....wk.....', '.....ww.....', '.....kw.....', '.....ww.....', '.....wk.....', '.....ww.....', '.....ww.....', '....wwww....'];
const TRUNK_BROWN = ['....gttg....', '.....tt.....', '.....tt.....', '....ttt.....', '.....tt.....', '.....tt.....', '.....tT.....', '.....tt.....', '....tttt....'];

export const SPRITES: Record<Species | 'seed' | 'sprout', string[]> = {
  birch: ['....gglg....', '..gglggggg..', '.gglggglggg.', 'gglgggggglgg', 'ggggGgglgggG', '.gglggggGgg.', '..ggGggggg..', ...TRUNK_BIRCH],
  maple: ['.....or.....', '...orroro...', '..oroorroo..', '.orrooroorr.', 'orooRroorroo', '.roorroorRo.', '..oorroorr..', ...TRUNK_BROWN],
  oak: ['...GGggGG...', '.GGggGgggGG.', 'GGggggGggggG', 'GgggGgggGggG', 'GggggggggggG', 'GGgggGggggGG', '.GGggggggGG.', '...GGttGG...', '.....tt.....', '....ttt.....', '.....tt.....', '.....tt.....', '.....tt.....', '....tTtt....', '...tt..tt...', '............'],
  sakura: ['....PPQP....', '..PQPPPPQP..', '.PPPPQPPPPP.', 'PQPPPPPPQPPP', 'PPPPwPPPPPQP', '.PPQPPPQPPP.', '..PPPtPPPP..', '....Ptt.....', '.....tt.....', '.....tT.....', '....tt......', '.....tt.....', '.....tt.....', '.....tt.....', '.....tt.....', '....tttt....'],
  golden: ['....YYyY....', '..YyYYYYyY..', '.YYY*YYYYYY.', 'YyYYYYYY*YyY', 'YYYyYYYYYYYY', '.YY*YYyYYYY.', '..YYYYYYYY..', ...TRUNK_BROWN],
  bamboo: ['..l......l..', '.lgl....lgl.', '..g..l...g..', '..g.lgl..g..', '..G..g...G..', '..g..g...g..', '..g..G...g..', '.lg..g...gl.', '..G..g...G..', '..g..g...g..', '..g..G...g..', '..g..g..lg..', '..G..g...G..', '..g..g...g..', '..g..g...g..', '.ggg.g..ggg.'],
  bell: ['............', '............', '....g.......', '....g..g....', '...bbb.g....', '...bBb.bbb..', '...b.b.bBb..', '....g..b.b..', '....g...g...', '..bbbg..g...', '..bBb.g.g...', '..b.b.g.g...', '...g..gg....', '..lg..g.....', '...gg.g.l...', '....ggggg...'],
  sunflower: ['...y.y.y....', '..yyyyyyy...', '.yynnnnnyy..', '..ynnNnnyy..', '.yynnnnnyy..', '..yyyyyyy...', '...y.y.y....', '.....g......', '.....g.ll...', '.ll..g.lgl..', '.lgl.g..l...', '..l..g......', '.....g......', '.....g......', '.....g......', '....ggg.....'],
  fern: ['............', '............', '............', '.....l......', '....lgl.....', '..l.lgl.l...', '.lgl.g.lgl..', '..lglglgl...', 'l..lgggl..l.', 'lgl.lgl.lgl.', '.lgglgllgl..', '..lggggggl..', '...lgggggl..', '....ggggg...', '.....ggg....', '....ggggg...'],
  rose: ['............', '............', '....rrr.....', '...rRrRr....', '...rrRrr....', '....rrr.....', '.....g......', '...l.g......', '..lgl.g.....', '...l..g.l...', '......glgl..', '.....g..l...', '.....g......', '.....g......', '.....g......', '....ggg.....'],
  lotus: ['............', '............', '............', '............', '............', '............', '............', '.....P......', '....PQP.....', '...PPQPP....', '..PQPPPQP...', '.PPPPQPPPP..', '..PPPPPPP...', '.gGg.cc.gGg.', 'cccccccccccc', '.CcccCcccCc.'],
  poppy: ['............', '............', '...rrr......', '..rrRrr.....', '..rReRr.....', '..rrRrr.....', '...rrr..rr..', '....g..rRr..', '....g...rr..', '....g...g...', '..l.g...g...', '.lgl.g..g.l.', '..l..g.g.lgl', '.....g.g..l.', '.....ggg....', '....ggggg...'],
  spruce: ['.....D......', '....DGD.....', '....GDG.....', '...DGgGD....', '...GDGDG....', '..DGgGDGD...', '..GDGgDGG...', '.DGDgGDGDG..', '.GgDGDGgDG..', 'DGDGgGDGDGD.', 'GDgGDGDgGDG.', '....tt......', '....tt......', '....tt......', '...tttt.....', '............'],
  tulip: ['............', '............', '............', '....r.r.....', '....rrr.....', '....rRr.....', '....rrr.....', '.....g......', '.....g......', '...l.g......', '..lg.g......', '..lgg.......', '...lg.......', '.....g......', '.....g......', '....ggg.....'],
  chamomile: ['............', '...s.s......', '..ssyss.....', '...syys.....', '..ssyss.....', '...s.s.s.s..', '....g.ssyss.', '....g..sys..', '....g.ss.ss.', '....g...g...', '..l.g...g...', '.lglg..g....', '..l.g..g....', '....g.g.....', '....gg......', '...ggggg....'],
  pumpkin: ['............', '............', '............', '............', '............', '............', '............', '.....tg.....', '.....t.gl...', '..OooOooO...', '.OooOooOoO..', 'OooOooOooOo.', 'OooOooOooOo.', 'OooOooOooOo.', '.OooOooOoO..', '..OooOooO...'],
  iris: ['............', '............', '....bBb.....', '...bBbBb....', '..bBbYbBb...', '...bbBbb....', '....bBb.....', '.....g......', '..l..g......', '..lg.g......', '...lgg...l..', '.....g..lg..', '.....g.lg...', '.....ggl....', '.....g......', '....ggg.....'],
  magic: ['.....*......', '...*.Y.*....', '....YyY.....', '..*YQPQY*...', '...yPwPy....', '....YQY.....', '..*.yYy.*...', '.....g......', '.....g......', '...l.g.l....', '..lgggggl...', '...l.g.l....', '.....g......', '..*..g..*...', '.....g......', '....ggg.....'],
  lily: ['............', '............', '............', '.....s......', '....sss.....', '....s.s..s..', '.....g..sss.', '.....g..s.s.', '..s..g...g..', '.sss.g..g...', '.s.s.g.g....', '..g..gg..l..', '...g.g..lGl.', '....gg.lGGl.', '.....g.lGl..', '....ggg.....'],
  seed: ['............', '............', '............', '............', '............', '............', '............', '............', '............', '............', '............', '............', '............', '.....l......', '....nnnn....', '...nnnnnn...'],
  sprout: ['............', '............', '............', '............', '............', '............', '............', '............', '............', '....l.l.....', '...lgggl....', '.....g......', '.....g......', '.....g......', '....nnnn....', '...nnnnnn...'],
};

/** Horizontal runs of the same colour → fewer SVG rects. */
export function spriteRects(rows: string[]): { x: number; y: number; w: number; fill: string }[] {
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || !PALETTE[ch]) {
        x++;
        continue;
      }
      let w = 1;
      while (row[x + w] === ch) w++;
      out.push({ x, y, w, fill: PALETTE[ch] });
      x += w;
    }
  });
  return out;
}
