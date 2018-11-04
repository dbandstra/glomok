function getInitialGameState() {
  const gridState = new Array(boardConfig.numLines * boardConfig.numLines);

  for (let i = 0; i < gridState.length; i++) {
    gridState[i] = null;
  }

      // setGridState(5, 9, 'white');
      // setGridState(5, 10, 'black');

  return {
    gridState,
    mousePos: [0, 0],
    mouse_gridPos: null,
    viewInfo: null,
    nextPieceColour: 'black',
  };
}

function calcViewInfo(gs, {glCanvas}) {
  const {proj, xmin, xmax, ymin, ymax, near} = getProjectionMatrix({glCanvas});

  const viewmtx = getViewMatrix();

  const invviewmtx = mat4.create();
  mat4.invert(invviewmtx, viewmtx);

  gs.viewInfo = {
    proj, xmin, xmax, ymin, ymax, near,
    viewmtx,
    invviewmtx,
  };
}

function getGridState(gs, gx, gy) {
  return gs.gridState[gy * boardConfig.numLines + gx];
}

function setGridState(gs, gx, gy, value) {
  gs.gridState[gy * boardConfig.numLines + gx] = value;
}

function mouseMove(gameState, glCanvas, [mx, my]) {
  gameState.mousePos = [mx, my];

  if (gameState.viewInfo !== null) {
    const c = projectMousePos(gameState, {
      glCanvas,
      ...gameState.viewInfo,
    });

    const old_x = gameState.mouse_gridPos && gameState.mouse_gridPos[0];
    const old_y = gameState.mouse_gridPos && gameState.mouse_gridPos[1];

    gameState.mouse_gridPos = getGridPos(c[0], c[1]);

    const new_x = gameState.mouse_gridPos && gameState.mouse_gridPos[0];
    const new_y = gameState.mouse_gridPos && gameState.mouse_gridPos[1];

    if (old_x !== new_x || old_y !== new_y) {
      repaint();
    }
  }
}

function clickEvent(gs) {
  if (gs.mouse_gridPos !== null && gs.nextPieceColour !== null) {
    const v = getGridState(gs, gs.mouse_gridPos[0], gs.mouse_gridPos[1]);
    if (v === null) {
      setGridState(gs, gs.mouse_gridPos[0], gs.mouse_gridPos[1], gs.nextPieceColour);
      if (checkVictory(gs, gs.mouse_gridPos[0], gs.mouse_gridPos[1], gs.nextPieceColour)) {
        setOverlayText(gs.nextPieceColour + ' wins', gs.nextPieceColour);
        gs.nextPieceColour = null;
      } else {
        gs.nextPieceColour = gs.nextPieceColour === 'white' ? 'black' : 'white';
      }
      repaint();
    }
  }
}

// check for victory condition.
// coords passed are the new piece placed (we only need to check around that)
function checkVictory(gs, gx, gy, colour) {
  // check horizontal
  let num = 0;
  for (let x = gx - 4; x <= gx + 4; x++) {
    if (getGridState(gs, x, gy) === colour) {
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
    if (getGridState(gs, gx, y) === colour) {
      if (++num === 5) {
        return true;
      }
    } else {
      num = 0;
    }
  }
  // check bottomleft to topright
  for (let i = -4; i <= 4; i++) {
    if (getGridState(gs, gx + i, gy + i) === colour) {
      if (++num === 5) {
        return true;
      }
    } else {
      num = 0;
    }
  }
  // check bottomright to topleft
  for (let i = -4; i <= 4; i++) {
    if (getGridState(gs, gx - i, gy + i) === colour) {
      if (++num === 5) {
        return true;
      }
    } else {
      num = 0;
    }
  }

  return false;
}
