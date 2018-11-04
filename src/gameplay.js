function getInitialGameState() {
  const gridState = new Array(boardConfig.numLines * boardConfig.numLines);

  for (let i = 0; i < gridState.length; i++) {
    gridState[i] = null;
  }

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
  return gs.gridState[gy * boardConfig.numLines + gx] || null;
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
      setGridState(gs, gs.mouse_gridPos[0], gs.mouse_gridPos[1], {
        colour: gs.nextPieceColour,
        isGlowing: false,
      });
      if (checkVictory(gs, gs.mouse_gridPos[0], gs.mouse_gridPos[1], gs.nextPieceColour)) {
        setOverlayText(gs.nextPieceColour + ' wins', gs.nextPieceColour);
        setSmallMessage('Refresh page to start a new game.');
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
// TODO - also check if the board is full (draw)
function checkVictory(gs, gx, gy, colour) {
  // check horizontal
  let num = 0;
  for (let i = -4; i <= 5; i++) {
    const value = getGridState(gs, gx + i, gy);
    if (value !== null && value.colour === colour) {
      num++;
    } else if (num >= 5) {
      i--;
      while (num-- > 0) {
        getGridState(gs, gx + i - num, gy).isGlowing = true;
      }
      return true;
    } else {
      num = 0;
    }
  }
  // check vertical
  num = 0;
  for (let i = -4; i <= 5; i++) {
    const value = getGridState(gs, gx, gy + i);
    if (value !== null && value.colour === colour) {
      num++;
    } else if (num >= 5) {
      i--;
      while (num-- > 0) {
        getGridState(gs, gx, gy + i - num).isGlowing = true;
      }
      return true;
    } else {
      num = 0;
    }
  }
  // check bottomleft to topright
  num = 0;
  for (let i = -4; i <= 5; i++) {
    const value = getGridState(gs, gx + i, gy + i);
    if (value !== null && value.colour === colour) {
      num++;
    } else if (num >= 5) {
      i--;
      while (num-- > 0) {
        getGridState(gs, gx + i - num, gy + i - num).isGlowing = true;
      }
      return true;
    } else {
      num = 0;
    }
  }
  // check bottomright to topleft
  num = 0;
  for (let i = -4; i <= 5; i++) {
    const value = getGridState(gs, gx - i, gy + i);
    if (value !== null && value.colour === colour) {
      num++;
    } else if (num >= 5) {
      i--;
      while (num-- > 0) {
        getGridState(gs, gx - (i - num), gy + i - num).isGlowing = true;
      }
      return true;
    } else {
      num = 0;
    }
  }

  return false;
}
