// check for victory condition.
// coords passed are the new piece placed (we only need to check around that)
// TODO - also check if the board is full (meaning it's a draw)
export function checkVictory({boardConfig, gridState, gx, gy}) {
  const getGridState = (x, y) => {
    return gridState[y * boardConfig.numLines + x] || null;
  }

  const colour = getGridState(gx, gy);

  const check = (xstep, ystep) => {
    let num = 0;

    for (let i = -4; i <= 5; i++) {
      const hereColour = getGridState(gx + i * xstep, gy + i * ystep);

      if (hereColour === colour) {
        num++;
      } else if (num >= 5) {
        i--;

        const winningPieces = [];

        while (num-- > 0) {
          winningPieces.push([
            gx + (i - num) * xstep,
            gy + (i - num) * ystep,
          ]);
        }

        return winningPieces;
      } else {
        num = 0;
      }
    }

    return null;
  };

  return check(1, 0) || // left to right
         check(0, 1) || // top to bottom
         check(1, 1) || // bottom-left to top-right
         check(-1, 1); // bottom-right to top-left
}
