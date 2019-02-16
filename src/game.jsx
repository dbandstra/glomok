import {mat4, vec3} from 'gl-matrix';
import React from 'react';

import {GameBackend} from './game-backend';
import {getNoPaddingNoBorderCanvasRelativeMousePosition} from './util';
import {drawScene} from './draw/draw';
import {drawSetup} from './draw/draw-setup';
import {getGridPos, getProjectionMatrix, unprojectMousePos} from './draw/view';

const SECURITY_TEST = true;

export class GameComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      blackName: null,
      whiteName: null,
      nextPlayer: null, // 'black' | 'white' | null. null means game over
      winningPieces: null,
      ///////////////
      viewInfo: null, // set in componentDidMount()
      mouse_gridPos: null,
      gridState: new Array(this.props.boardConfig.numLines * this.props.boardConfig.numLines),
    };

    for (let i = 0; i < this.state.gridState.length; i++) {
      this.state.gridState[i] = null;
    }

    this.backend = new GameBackend({
      boardConfig: this.props.boardConfig,
      matchKey: this.props.matchKey,
      myColour: this.props.myColour,
      password: this.props.password,
      listener: this.onBackendUpdate.bind(this),
    })

    this.canvasRef = React.createRef();
  }

  // FIXME - gracefully handle pieces disappearing or changing... (so that we
  // don't get winning piece glitches in SECURITY_TEST mode)
  // unless that's another bug at work. it seems weird that i get glowing red
  // pieces when clicking wildly even with a pretty empty board
  onBackendUpdate({blackName, whiteName, nextPlayer, nextMoveId, gridState}) {
    this.setState((prevState) => {
      const winningPieces = prevState.winningPieces || [];

      // call _checkVictory on all pieces that have newly appeared since the
      // previous gridState. add 'winning pieces' to the existing winningPieces
      // array (these are the pieces that will be highlighted in red)
      for (let y = 0; y < this.props.boardConfig.numLines; y++) {
        for (let x = 0; x < this.props.boardConfig.numLines; x++) {
          const ofs = y * this.props.boardConfig.numLines + x;
          if (prevState.gridState[ofs] !== gridState[ofs]) {
            const newWinningPieces = this._checkVictory(gridState, x, y) || [];
            newWinningPieces.forEach((nwp) => {
              if (!winningPieces.find((wp) => wp[0] === nwp[0] && wp[1] === nwp[2])) {
                winningPieces.push(nwp);
              }
            });
          }
        }
      }

      return {
        blackName,
        whiteName,
        nextPlayer,
        nextMoveId,
        gridState,
        winningPieces: winningPieces.length > 0 ? winningPieces : null,
      };
    });

    this.repaint();
  }

  componentDidMount() {
    const glCanvas = this.canvasRef.current;
    const gl = glCanvas.getContext('webgl');

    // try to make canvas full width of browser window
    const fullWidth = (() => {
      // https://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window
      const w = window;
      const d = document;
      const e = d.documentElement;
      const g = d.getElementsByTagName('body')[0];
      const x = w.innerWidth || e.clientWidth || g.clientWidth;
      return x;
    })();
    if (fullWidth > glCanvas.width) {
      glCanvas.width = fullWidth;
    }

    this.renderState = drawSetup(glCanvas, gl, this.props.boardConfig);

    const viewInfo = this._calcViewInfo({cameraAngle: this.props.cameraAngle, glCanvas});
    this.setState({viewInfo});

    drawScene(this.renderState, {
      viewInfo,
      boardConfig: this.props.boardConfig,
      myColour: this.props.myColour,
      getColourAtGridPos: this.getGridState.bind(this, this.state.gridState),
      winningPieces: this.state.winningPieces,
      hoverGridPos: null,
    });

    this.backend.init();
  }

  componentWillUnmount() {
    this.backend.deinit();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.cameraAngle !== nextProps.cameraAngle) {
      this.setState({
        viewInfo: this._calcViewInfo({
          cameraAngle: nextProps.cameraAngle,
          glCanvas: this.canvasRef.current,
        }),
      });
      this.repaint();
    }
  }

  repaint() {
    window.requestAnimationFrame(() => {
      drawScene(this.renderState, {
        viewInfo: this.state.viewInfo,
        boardConfig: this.props.boardConfig,
        myColour: this.props.myColour,
        getColourAtGridPos: this.getGridState.bind(this, this.state.gridState),
        winningPieces: this.state.winningPieces,
        hoverGridPos:
          SECURITY_TEST || (this.state.nextPlayer === this.props.myColour && this.state.whiteName !== null)
            ? this.state.mouse_gridPos
            : null,
      });
    });
  }

  render() {
    return (
      <>
        <div>You are {this.props.myColour}.</div>
        <div>
          {this.state.nextPlayer === null ? 'The game is over.' :
           this.state.whiteName === null ? 'Waiting for opponent to join.' :
           this.state.nextPlayer === this.props.myColour ? 'It\'s your turn.' :
           'It\'s your opponent\'s turn.'}
        </div>
        <canvas className="glcanvas" width="700" height="600" ref={this.canvasRef}
                onMouseMove={this.onCanvasMouseMove.bind(this)}
                onMouseOut={this.onCanvasMouseOut.bind(this)}
                onMouseDown={this.onCanvasMouseDown.bind(this)}>
          Canvas not supported.
        </canvas>
      </>
    );
  }

  onCanvasMouseMove(event) {
    this._onMouseMove(getNoPaddingNoBorderCanvasRelativeMousePosition(event));
  }

  onCanvasMouseOut() {
    if (this.state.mouse_gridPos !== null) {
      this.setState({mouse_gridPos: null});
      this.repaint();
    }
  }

  onCanvasMouseDown() {
    this._onClick();
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
      cameraAngle,
    };
  }

  getGridState(gridState, gx, gy) {
    return gridState[gy * this.props.boardConfig.numLines + gx] || null;
  }

  // TODO - also need to repaint your mouseover tile, when the opponent just played and
  // now it's your turn - even if you haven't moved the mouse
  _onMouseMove([mx, my]) {
    const glCanvas = this.canvasRef.current;

    const old_gridPos = this.state.mouse_gridPos;
    const new_gridPos = getGridPos(this.props.boardConfig, ...unprojectMousePos(this.state.viewInfo, [
      mx / (glCanvas.width - 1),
      my / (glCanvas.height - 1),
    ]));

    this.setState({
      mouse_gridPos: new_gridPos,
    });

    if (!SECURITY_TEST) {
      if (this.state.nextPlayer !== this.props.myColour || this.state.whiteName === null) {
        return;
      }
    }

    if ((old_gridPos && old_gridPos[0]) !== (new_gridPos && new_gridPos[0]) ||
        (old_gridPos && old_gridPos[1]) !== (new_gridPos && new_gridPos[1])) {
      this.repaint();
    }
  }

  _onClick() {
    if (this.state.mouse_gridPos === null) {
      return;
    }
    if (!SECURITY_TEST) {
      if (this.state.nextPlayer !== this.props.myColour || this.state.whiteName === null) {
        return;
      }
    }

    const [gx, gy] = this.state.mouse_gridPos;

    if (!SECURITY_TEST) {
      if (this.getGridState(this.state.gridState, gx, gy) !== null) {
        return;
      }
    }

    // is this a winning move? if so we'll set nextPlayer to null
    const cellIndex = gy * this.props.boardConfig.numLines + gx;

    const newGridState = [...this.state.gridState];
    newGridState[cellIndex] = this.props.myColour;
    const isWinningMove = this._checkVictory(newGridState, gx, gy) !== null;

    this.backend.makeMove(cellIndex, this.state.nextMoveId, isWinningMove);
  }

  // check for victory condition.
  // coords passed are the new piece placed (we only need to check around that)
  // TODO - also check if the board is full (draw)
  _checkVictory(gridState, gx, gy) {
    const colour = this.getGridState(gridState, gx, gy);

    const check = (xstep, ystep) => {
      let num = 0;
      for (let i = -4; i <= 5; i++) {
        const hereColour = this.getGridState(gridState,
          gx + i * xstep,
          gy + i * ystep,
        );
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
}
