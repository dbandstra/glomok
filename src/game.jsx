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
      gameId: null,
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
      let winningPieces = prevState.winningPieces || [];

      if (prevState.gameId !== newBackendState.gameId) {
        winningPieces = [];
      }

      // call checkVictory on all pieces that have newly appeared since the
      // previous gridState. add 'winning pieces' to the existing winningPieces
      // array (these are the pieces that will be highlighted in red)
      for (let gy = 0; gy < boardConfig.numLines; gy++) {
        for (let gx = 0; gx < boardConfig.numLines; gx++) {
          const ofs = gy * boardConfig.numLines + gx;

          if (prevState.backendState === null || prevState.backendState.gridState[ofs] !== newBackendState.gridState[ofs]) {
            const newWinningPieces = checkVictory({boardConfig, gridState: newBackendState.gridState, gx, gy}) || [];

            for (const nwp of newWinningPieces) {
              if (!winningPieces.find((wp) => wp[0] === nwp[0] && wp[1] === nwp[1])) {
                winningPieces.push(nwp);
              }
            }
          }
        }
      }

      return {
        backendState: newBackendState,
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

      const {gridState, isPlayerOneBlack, nextPlayer, playerTwoName} = this.state.backendState;

      const myColour =
        this.props.isHotseat
          ? nextPlayer
          : (this.props.isPlayerOne === isPlayerOneBlack ? 'black' : 'white');

      drawScene(this.renderState, {
        viewInfo: this.state.viewInfo,
        boardConfig: this.props.boardConfig,
        myColour,
        getColourAtGridPos: this.getGridState.bind(this, gridState),
        winningPieces: this.state.winningPieces,
        hoverGridPos:
          SECURITY_TEST || (nextPlayer !== null && nextPlayer === myColour && playerTwoName !== null)
            ? this.state.mouse_gridPos
            : null,
      });
    });
  }

  render() {
    let isMessageHighlighted = false;
    let message = 'Please wait...';

    if (this.state.backendState !== null) {
      const {isPlayerOneBlack, nextPlayer, playerOneName, playerTwoName, winner} = this.state.backendState;

      const blackName = isPlayerOneBlack ? playerOneName : playerTwoName;
      const whiteName = isPlayerOneBlack ? playerTwoName : playerOneName;

      if (this.props.isHotseat) {
        // hot seat mode
        if (nextPlayer === null) {
          isMessageHighlighted = true;
          if (winner === 'white') {
            message = whiteName + ' wins';
          } else if (winner === 'black') {
            message = blackName + ' wins';
          } else {
            // this should never happen
          }
        } else if (nextPlayer === 'white') {
          message = whiteName + '’s turn (white)';
        } else if (nextPlayer === 'black') {
          message = blackName + '’s turn (black)';
        } else {
          // this should never happen
        }
      } else {
        // opponent is remote
        const myColour = this.props.isPlayerOne === isPlayerOneBlack ? 'black' : 'white';

        if (playerTwoName === null) {
          message = 'Waiting for opponent to join';
        } else if (nextPlayer === null) {
          isMessageHighlighted = true;
          if (winner === myColour) {
            message = 'You win';
          } else if (winner !== null) {
            message = 'Opponent wins';
          } else {
            // this should never happen
          }
        } else if (nextPlayer === myColour) {
          message = 'Your turn (' + nextPlayer + ')';
        } else if (nextPlayer !== null) {
          message = 'Opponent’s turn (' + nextPlayer + ')';
        } else {
          // this should be never happen
        }
      }
    }

    const renderNumWins = (n) => n === 1 ? '1 win' : n + ' wins';

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
        {this.state.backendState !== null && this.state.backendState.playerTwoName !== null ? (
          <>
            <div className="start-new-game-container">
              <button type="button" onClick={this.onClickStartNewGame.bind(this)}>
                {this.state.backendState.nextPlayer !== null ? 'Forfeit game' : 'Play again'}
              </button>
            </div>
            <div className="stats">
              Wins:
              <br />
              {this.state.backendState.playerOneName}:{' '}
              {renderNumWins(this.state.backendState.playerOneWins)}
              <br />
              {this.state.backendState.playerTwoName}:{' '}
              {renderNumWins(this.state.backendState.playerTwoWins)}
            </div>
          </>
        ) : ''}
        <div className="camera-angle-container">
          Camera angle:{' '}
          <select value={this.state.cameraAngle} onChange={(e) => this.props.onChangeCameraAngle(e.target.value)}>
            <option value="default">default</option>
            <option value="straight-down">straight down</option>
            <option value="too-steep">too steep</option>
          </select>
        </div>
      </>
    );
  }

  onClickStartNewGame() {
    if (this.state.backendState !== null && this.state.backendState.nextPlayer !== null) {
      if (confirm('Really forfeit the game? It will be counted as a win for your opponent.')) {
        this.backend.forfeitGame();
      }
    } else {
      this.backend.startNextGame();
    }
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
      const {isPlayerOneBlack, nextPlayer, playerTwoName} = this.state.backendState;
      const myColour =
        this.props.isHotseat
          ? nextPlayer
          : (this.props.isPlayerOne === isPlayerOneBlack ? 'black' : 'white');

      if (nextPlayer === null || nextPlayer !== myColour || playerTwoName === null) {
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
    const {gridState, isPlayerOneBlack, nextPlayer, playerTwoName} = this.state.backendState;
    const myColour =
      this.props.isHotseat
        ? nextPlayer
        : (this.props.isPlayerOne === isPlayerOneBlack ? 'black' : 'white');
    if (!SECURITY_TEST) {
      if (nextPlayer === null || nextPlayer !== myColour || playerTwoName === null) {
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

    this.backend.makeMove(cellIndex, myColour, this.state.backendState.nextMoveId, isWinningMove);
  }
}

export default GameComponent;
