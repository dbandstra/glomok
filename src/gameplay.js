class GameState {
  constructor({glCanvas}) {
    this.viewInfo = this._calcViewInfo('default', {glCanvas});
    this.mousePos = [0, 0];
    this.mouse_gridPos = null;
    this.nextPieceColour = 'black';
    this.status = 'new-game'; // other values: 'in-progress', 'game-over'

    this.gridState = new Array(boardConfig.numLines * boardConfig.numLines);

    for (let i = 0; i < this.gridState.length; i++) {
      this.gridState[i] = null;
    }
  }

  _calcViewInfo(cameraAngle, {glCanvas}) {
    const {proj, xmin, xmax, ymin, ymax, near} = getProjectionMatrix({glCanvas});

    const viewmtx = getViewMatrix(cameraAngle);

    const invviewmtx = mat4.create();
    mat4.invert(invviewmtx, viewmtx);

    return {
      proj, xmin, xmax, ymin, ymax, near,
      viewmtx,
      invviewmtx,
    };
  }

  getGameStatus() {
    return this.status;
  }

  getGridState(gx, gy) {
    return this.gridState[gy * boardConfig.numLines + gx] || null;
  }

  update(message, ...params) {
    switch (message) {
      case 'onMouseMove':
        return this._onMouseMove(...params);
      case 'onClick':
        return this._onClick(...params);
      case 'setCameraAngle':
        return this._setCameraAngle(...params);
      default:
        return [];
    }
  }

  _setCameraAngle(cameraAngle, {glCanvas}) {
    this.viewInfo = this._calcViewInfo(cameraAngle, {glCanvas});
    return [['repaint']];
  }

  _setGridState(gx, gy, value) {
    this.gridState[gy * boardConfig.numLines + gx] = value;
  }

  _onMouseMove(glCanvas, [mx, my]) {
    const commands = [];

    this.mousePos = [mx, my];

    const c = projectMousePos(this, {
      glCanvas,
      ...this.viewInfo,
    });

    const old_x = this.mouse_gridPos && this.mouse_gridPos[0];
    const old_y = this.mouse_gridPos && this.mouse_gridPos[1];

    this.mouse_gridPos = getGridPos(c[0], c[1]);

    const new_x = this.mouse_gridPos && this.mouse_gridPos[0];
    const new_y = this.mouse_gridPos && this.mouse_gridPos[1];

    if (old_x !== new_x || old_y !== new_y) {
      commands.push(['repaint']);
    }

    return commands;
  }

  _onClick() {
    const commands = [];
    if (this.mouse_gridPos !== null && this.nextPieceColour !== null) {
      const v = this.getGridState(this.mouse_gridPos[0], this.mouse_gridPos[1]);
      if (v === null) {
        this._setGridState(this.mouse_gridPos[0], this.mouse_gridPos[1], {
          colour: this.nextPieceColour,
          isGlowing: false,
        });
        if (this._checkVictory(this.mouse_gridPos[0], this.mouse_gridPos[1], this.nextPieceColour)) {
          commands.push(['setOverlayText', this.nextPieceColour + ' wins']);
          commands.push(['incrementWinCount', this.nextPieceColour]);
          this.nextPieceColour = null;
          this.status = 'game-over';
        } else {
          this.nextPieceColour = this.nextPieceColour === 'white' ? 'black' : 'white';
          this.status = 'in-progress';
        }
        commands.push(['repaint']);
      }
    }
    return commands;
  }

  // check for victory condition.
  // coords passed are the new piece placed (we only need to check around that)
  // TODO - also check if the board is full (draw)
  _checkVictory(gx, gy, colour) {
    // check horizontal
    let num = 0;
    for (let i = -4; i <= 5; i++) {
      const value = this.getGridState(gx + i, gy);
      if (value !== null && value.colour === colour) {
        num++;
      } else if (num >= 5) {
        i--;
        while (num-- > 0) {
          this.getGridState(gx + i - num, gy).isGlowing = true;
        }
        return true;
      } else {
        num = 0;
      }
    }
    // check vertical
    num = 0;
    for (let i = -4; i <= 5; i++) {
      const value = this.getGridState(gx, gy + i);
      if (value !== null && value.colour === colour) {
        num++;
      } else if (num >= 5) {
        i--;
        while (num-- > 0) {
          this.getGridState(gx, gy + i - num).isGlowing = true;
        }
        return true;
      } else {
        num = 0;
      }
    }
    // check bottomleft to topright
    num = 0;
    for (let i = -4; i <= 5; i++) {
      const value = this.getGridState(gx + i, gy + i);
      if (value !== null && value.colour === colour) {
        num++;
      } else if (num >= 5) {
        i--;
        while (num-- > 0) {
          this.getGridState(gx + i - num, gy + i - num).isGlowing = true;
        }
        return true;
      } else {
        num = 0;
      }
    }
    // check bottomright to topleft
    num = 0;
    for (let i = -4; i <= 5; i++) {
      const value = this.getGridState(gx - i, gy + i);
      if (value !== null && value.colour === colour) {
        num++;
      } else if (num >= 5) {
        i--;
        while (num-- > 0) {
          this.getGridState(gx - (i - num), gy + i - num).isGlowing = true;
        }
        return true;
      } else {
        num = 0;
      }
    }

    return false;
  }
}
