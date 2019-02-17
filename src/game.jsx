import {mat4, vec3} from 'gl-matrix';
import React from 'react';

import {checkVictory} from './check-victory';
import {getNoPaddingNoBorderCanvasRelativeMousePosition} from './util';
import {drawScene} from './draw/draw';
import {drawSetup} from './draw/draw-setup';
import {getGridPos, getProjectionMatrix, unprojectMousePos} from './draw/view';

// if true, disable some client-side checks and let the backend block illegal moves
const SECURITY_TEST = false;

class GameComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      backendState: null,
      winner: null,
      winningPieces: null,
      viewInfo: null, // set in componentDidMount()
      mouse_gridPos: null,
    };

    this.backend = this.props.backend;

    this.canvasRef = React.createRef();
  }

  // FIXME - gracefully handle pieces disappearing or changing... (so that we
  // don't get winning piece glitches in SECURITY_TEST mode)
  // unless that's another bug at work. it seems weird that i get glowing red
  // pieces when clicking wildly even with a pretty empty board
  onBackendUpdate(newBackendState) {
    const boardConfig = this.props.boardConfig;

    this.setState((prevState) => {
      const winningPieces = prevState.winningPieces || [];
      let winner = prevState.winner;

      // call checkVictory on all pieces that have newly appeared since the
      // previous gridState. add 'winning pieces' to the existing winningPieces
      // array (these are the pieces that will be highlighted in red)
      for (let gy = 0; gy < boardConfig.numLines; gy++) {
        for (let gx = 0; gx < boardConfig.numLines; gx++) {
          const ofs = gy * boardConfig.numLines + gx;

          if (prevState.backendState === null || prevState.backendState.gridState[ofs] !== newBackendState.gridState[ofs]) {
            const newWinningPieces = checkVictory({boardConfig, gridState: newBackendState.gridState, gx, gy}) || [];

            for (const nwp of newWinningPieces) {
              if (winner === null) {
                winner = newBackendState.gridState[ofs];
              }
              if (!winningPieces.find((wp) => wp[0] === nwp[0] && wp[1] === nwp[1])) {
                winningPieces.push(nwp);
              }
            }
          }
        }
      }

      return {
        backendState: newBackendState,
        winner,
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

    this.backend.init({
      listener: this.onBackendUpdate.bind(this),
    });
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
      if (this.state.backendState === null) {
        return;
      }
      const {gridState, myColour, nextPlayer, whiteName} = this.state.backendState;
      drawScene(this.renderState, {
        viewInfo: this.state.viewInfo,
        boardConfig: this.props.boardConfig,
        myColour,
        getColourAtGridPos: this.getGridState.bind(this, gridState),
        winningPieces: this.state.winningPieces,
        hoverGridPos:
          SECURITY_TEST || (nextPlayer !== null && nextPlayer === myColour && whiteName !== null)
            ? this.state.mouse_gridPos
            : null,
      });
    });
  }

  render() {
    let isMessageHighlighted = false;
    let message = 'Please wait...';

    if (this.state.backendState !== null) {
      const {blackName, myColour, nextPlayer, whiteName} = this.state.backendState;

      if (this.props.isHotseat) {
        // hot seat mode
        if (this.state.winner === 'white') {
          isMessageHighlighted = true;
          message = whiteName + ' wins';
        } else if (this.state.winner === 'black') {
          isMessageHighlighted = true;
          message = blackName + ' wins';
        } else if (nextPlayer === 'white') {
          message = whiteName + ' - white';
        } else if (nextPlayer === 'black') {
          message = blackName + ' - black';
        } else {
          // this should never happen
        }
      } else {
        // opponent is remote
        if (whiteName === null) {
          message = 'Waiting for opponent to join';
        } else if (this.state.winner === myColour) {
          isMessageHighlighted = true;
          message = 'You win';
        } else if (this.state.winner !== null) {
          isMessageHighlighted = true;
          message = 'Opponent wins';
        } else if (nextPlayer === myColour) {
          message = 'Your turn (' + nextPlayer + ')';
        } else if (nextPlayer !== null) {
          message = 'Opponent’s turn (' + nextPlayer + ')';
        } else {
          // this should be never happen
        }
      }
    }

    return (
      <>
        <div className="message-container">
          <div className={ 'message' + (isMessageHighlighted ? ' highlighted' : '')}>
            { message }
          </div>
        </div>
        <canvas className="glcanvas" width="700" height="600" ref={this.canvasRef}
                onMouseMove={this.onCanvasMouseMove.bind(this)}
                onMouseOut={this.onCanvasMouseOut.bind(this)}
                onMouseDown={this.onCanvasMouseDown.bind(this)}>
          Canvas not supported.
        </canvas>
        <div className="camera-angle-container">
          Camera angle:
          <select value={this.state.cameraAngle} onChange={(e) => this.props.onChangeCameraAngle(e.target.value)}>
            <option value="default">default</option>
            <option value="straight-down">straight down</option>
            <option value="too-steep">too steep</option>
          </select>
        </div>
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

    if (this.state.backendState === null) {
      return;
    }
    if (!SECURITY_TEST) {
      const {myColour, nextPlayer, whiteName} = this.state.backendState;
      if (nextPlayer === null || nextPlayer !== myColour || whiteName === null) {
        return;
      }
    }

    if ((old_gridPos && old_gridPos[0]) !== (new_gridPos && new_gridPos[0]) ||
        (old_gridPos && old_gridPos[1]) !== (new_gridPos && new_gridPos[1])) {
      this.repaint();
    }
  }

  _onClick() {
    if (this.state.backendState === null) {
      return;
    }
    if (this.state.mouse_gridPos === null) {
      return;
    }
    const {gridState, myColour, nextPlayer, whiteName} = this.state.backendState;
    if (!SECURITY_TEST) {
      if (nextPlayer === null || nextPlayer !== myColour || whiteName === null) {
        return;
      }
    }

    const [gx, gy] = this.state.mouse_gridPos;

    if (!SECURITY_TEST) {
      if (this.getGridState(gridState, gx, gy) !== null) {
        return;
      }
    }

    // is this a winning move?
    const cellIndex = gy * this.props.boardConfig.numLines + gx;
    const newGridState = [...gridState];
    newGridState[cellIndex] = myColour;

    const isWinningMove = checkVictory({
      boardConfig: this.props.boardConfig,
      gridState: newGridState,
      gx,
      gy,
    }) !== null;

    this.backend.makeMove(cellIndex, this.state.backendState.nextMoveId, isWinningMove);
  }
}

export default GameComponent;
