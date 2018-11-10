import {mat4, vec3} from 'gl-matrix';

import {getGridPos, getProjectionMatrix, unprojectMousePos} from './view';

export class GameState {
  constructor({cameraAngle, glCanvas, boardConfig}) {
    this.viewInfo = this._calcViewInfo({cameraAngle, glCanvas});
    this.mousePos = [0, 0];
    this.mouse_gridPos = null;
    this.nextPieceColour = 'black';
    this.status = 'new-game'; // other values: 'in-progress', 'game-over'
    this.boardConfig = boardConfig;

    this.gridState = new Array(boardConfig.numLines * boardConfig.numLines);

    for (let i = 0; i < this.gridState.length; i++) {
      this.gridState[i] = null;
    }
  }

  _calcViewInfo({cameraAngle, glCanvas}) {
    const proj = getProjectionMatrix({glCanvas});

    const viewmtx = mat4.create();
    if (cameraAngle === 'default') {
      mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, -0.57, 1.1));
      mat4.rotate(viewmtx, viewmtx, 25 * Math.PI / 180.0, vec3.fromValues(1, 0, 0));
    } else if (cameraAngle === 'straight-down') {
      mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, 0.03, 1.3));
    } else {
      mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, -0.85, 0.4));
      mat4.rotate(viewmtx, viewmtx, 60 * Math.PI / 180.0, vec3.fromValues(1, 0, 0));
    }

    const invviewmtx = mat4.create();
    mat4.invert(invviewmtx, viewmtx);

    return {
      proj,
      viewmtx,
      invviewmtx,
    };
  }

  getGameStatus() {
    return this.status;
  }

  getGridState(gx, gy) {
    return this.gridState[gy * this.boardConfig.numLines + gx] || null;
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

  _setCameraAngle({cameraAngle, glCanvas}) {
    this.viewInfo = this._calcViewInfo({cameraAngle, glCanvas});
    return [['repaint']];
  }

  _setGridState(gx, gy, value) {
    this.gridState[gy * this.boardConfig.numLines + gx] = value;
  }

  _onMouseMove(glCanvas, [mx, my]) {
    const old_gridPos = this.mouse_gridPos;

    this.mousePos = [mx, my];
    this.mouse_gridPos = getGridPos(this.boardConfig, ...unprojectMousePos(this.viewInfo, [
      this.mousePos[0] / (glCanvas.width - 1),
      this.mousePos[1] / (glCanvas.height - 1),
    ]));

    if ((old_gridPos && old_gridPos[0]) !== (this.mouse_gridPos && this.mouse_gridPos[0]) ||
        (old_gridPos && old_gridPos[1]) !== (this.mouse_gridPos && this.mouse_gridPos[1])) {
      return [['repaint']];
    } else {
      return [];
    }
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
          commands.push(['incrementWinCount', this.nextPieceColour]);
          this.nextPieceColour = null;
          this.status = 'game-over';
        } else {
          this.nextPieceColour = this.nextPieceColour === 'white' ? 'black' : 'white';
          this.status = 'in-progress';
          commands.push(['nextPlayer', this.nextPieceColour]);
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
    const check = (xstep, ystep) => {
      let num = 0;
      for (let i = -4; i <= 5; i++) {
        const value = this.getGridState(
          gx + i * xstep,
          gy + i * ystep,
        );
        if (value !== null && value.colour === colour) {
          num++;
        } else if (num >= 5) {
          i--;
          while (num-- > 0) {
            this.getGridState(
              gx + (i - num) * xstep,
              gy + (i - num) * ystep,
            ).isGlowing = true;
          }
          return true;
        } else {
          num = 0;
        }
      }
    };
    return check(1, 0) || // left to right
           check(0, 1) || // top to bottom
           check(1, 1) || // bottom-left to top-right
           check(-1, 1); // bottom-right to top-left
  }
}
