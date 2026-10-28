const COLORS = ['coral', 'gold', 'mint', 'blue', 'violet'];
const NAMES = ['First Light', 'Soft Landing', 'Color Theory', 'Good Timing', 'Clear Skies', 'Side Street', 'Little Detour', 'Bright Idea', 'On a Roll', 'Night Garden', 'Open Orbit', 'Crosswind', 'Half Moon', 'The Long Way', 'Starling', 'Thin Air', 'Side by Side', 'In Bloom', 'High Tide', 'Blue Hour', 'Firefly', 'Double Take', 'Slow Burn', 'Lucky Break', 'Moonrise', 'Wild Current', 'Orbit Shift', 'Afterglow', 'Deep Field', 'Constellation', 'Red Giant', 'Far Side', 'Sundial', 'Bright Matter', 'Skyline', 'Gravity Well', 'Solar Wind', 'Night Shift', 'Eventide', 'North Star', 'Supernova', 'Long Shadow', 'Starfall', 'The Crossing', 'Blue Comet', 'Dark Matter', 'Last Light', 'Beyond Reach', 'Full Circle', 'The Big Pop'];

function makeLayout(level) {
  const rows = Math.min(4 + Math.floor((level - 1) / 5), 10);
  const width = 5 + Math.min(Math.floor((level - 1) / 7), 4);
  const shape = Math.floor((level - 1) / 5) % 5;
  const layout = [];
  for (let row = 0; row < rows; row += 1) {
    const cells = [];
    for (let col = 0; col < 9; col += 1) {
      let filled = col >= Math.floor((9 - width) / 2) && col < Math.ceil((9 + width) / 2);
      if (shape === 1) filled &&= (row + col) % 4 !== 0;
      if (shape === 2) filled &&= row < Math.ceil(rows * 0.65) || col % 2 === row % 2;
      if (shape === 3) filled &&= col >= Math.floor((9 - width + row % 3) / 2) && col < 9 - Math.floor((9 - width + row % 3) / 2);
      if (shape === 4) filled &&= row < 2 || (row + col) % 3 !== 0;
      if (filled && (row * 5 + col * 3 + level * 7) % 13 === 0) filled = false;
      if (filled) cells.push({ row, col, color: COLORS[(row * 2 + col + level) % Math.min(level <= 5 ? 2 : level <= 10 ? 3 : level <= 20 ? 4 : 5, 5)] });
    }
    layout.push(...cells);
  }
  if (level >= 11) {
    const obstacleRow = Math.min(2, rows - 1);
    if (level % 3 === 0) layout.push({ row: obstacleRow, col: 0, type: 'stone' });
  }
  if (level >= 21) {
    const candidates = layout.filter((cell) => !cell.type && cell.row > 0);
    const special = candidates[(level * 7) % Math.max(candidates.length, 1)];
    if (special) special.type = level % 4 === 0 ? 'frozen' : level % 4 === 1 ? 'bomb' : 'line';
  }
  return layout;
}

export const LEVELS = Array.from({ length: 50 }, (_, index) => {
  const number = index + 1;
  const colors = COLORS.slice(0, number <= 5 ? 2 : number <= 10 ? 3 : number <= 20 ? 4 : 5);
  const layout = makeLayout(number);
  const target = layout.filter((cell) => !cell.type || cell.type === 'frozen').length;
  return {
    number,
    name: NAMES[index],
    difficulty: index < 5 ? 'Gentle' : index < 10 ? 'Easy' : index < 20 ? 'Steady' : index < 35 ? 'Tricky' : 'Brightly bold',
    colors,
    layout,
    target: Math.max(target, 1),
    maxShots: Math.min(60, 30 + Math.floor(index * 0.6)),
    stars: [target * 10, target * 12, target * 15],
    special: number < 11 ? null : number < 21 ? 'Stone obstacles' : 'Special bubbles'
  };
});
