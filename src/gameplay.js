// check for victory condition.
// coords passed are the new piece placed (we only need to check around that)
function checkVictory(gx, gy, colour) {
  // check horizontal
  let num = 0;
  for (let x = gx - 4; x <= gx + 4; x++) {
    if (getGridState(x, gy) === colour) {
      if (++num === 5) {
        return true;
      }
    } else {
      num = 0;
    }
  }
  // check vertical
  num = 0;
  for (let y = gy - 4; y <= gy + 4; y++) {
    if (getGridState(gx, y) === colour) {
      if (++num === 5) {
        return true;
      }
    } else {
      num = 0;
    }
  }
  // check bottomleft to topright
  for (let i = -4; i <= 4; i++) {
    if (getGridState(gx + i, gy + i) === colour) {
      if (++num === 5) {
        return true;
      }
    } else {
      num = 0;
    }
  }
  // check bottomright to topleft
  for (let i = -4; i <= 4; i++) {
    if (getGridState(gx - i, gy + i) === colour) {
      if (++num === 5) {
        return true;
      }
    } else {
      num = 0;
    }
  }

  return false;
}
