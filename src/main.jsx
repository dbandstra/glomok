import React from 'react';
import ReactDOM from 'react-dom';

import {drawScene} from './draw';
import {drawSetup} from './draw-setup';
import {GameState} from './gameplay';

const boardConfig = {
  numLines: 15,
  imageDim: 512, // width/height of image
  imageMargin: 32, // number of pixels around the grid
  worldDim: 1, // world diameter of board (including margin)
};

class App extends React.Component {
  constructor() {
    super();

    this.state = {
      blackPlayer: 'Player 1',
      whitePlayer: 'Player 2',
      wins: {
        'Player 1': 0,
        'Player 2': 0,
      },
      message: '',
      isMessageHighlighted: false,
      cameraAngle: 'default',
    };

    this.canvasRef = React.createRef();
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

    this.renderState = drawSetup(glCanvas, gl, boardConfig);

    this.gameState = new GameState({cameraAngle: this.state.cameraAngle, glCanvas, boardConfig});

    this.runCommands([['nextPlayer', 'black']]);
    drawScene(this.renderState, this.gameState, boardConfig);
  }

  render() {
    const renderNumWins = (n) => n === 1 ? '1 win' : n + ' wins';

    return (
      <div>
        <div className="message-container">
          <div className={ 'message' + (this.state.isMessageHighlighted ? ' highlighted' : '')}>
            { this.state.message }
          </div>
        </div>
        <canvas className="glcanvas" width="700" height="600" ref={this.canvasRef}
                onMouseMove={this.onCanvasMouseMove.bind(this)}
                onMouseDown={this.onCanvasMouseDown.bind(this)}>
          Canvas not supported.
        </canvas>
        <div className="start-new-game-container">
          <button type="button" onClick={this.onClickStartNewGame.bind(this)}>
            Start new game
          </button>
        </div>
        <div className="stats">
          Wins:
          <br />
          Player 1: { renderNumWins(this.state.wins['Player 1']) }
          <br />
          Player 2: { renderNumWins(this.state.wins['Player 2']) }
        </div>
        <div className="camera-angle-container">
          Camera angle:
          <select value={this.state.cameraAngle} onChange={this.changeCameraAngle.bind(this)}>
            <option value="default">default</option>
            <option value="straight-down">straight down</option>
            <option value="too-steep">too steep</option>
          </select>
        </div>
      </div>
    );
  }

  onCanvasMouseMove(event) {
    const commands = this.gameState.update('onMouseMove', this.canvasRef.current, getNoPaddingNoBorderCanvasRelativeMousePosition(event));
    this.runCommands(commands);
  }

  onCanvasMouseDown() {
    const commands = this.gameState.update('onClick');
    this.runCommands(commands);
  }

  onClickStartNewGame() {
    let switchColours = true;
    switch (this.gameState.getGameStatus()) {
      case 'new-game':
        break;
      case 'in-progress':
        if (!confirm('Really start new game?')) {
          break;
        }
        switchColours = false;
      case 'game-over':
        if (switchColours) {
          this.setState((prevState) => {
            const tmp = prevState.blackPlayer;
            return {
              blackPlayer: prevState.whitePlayer,
              whitePlayer: tmp,
            };
          });
        }
        const glCanvas = this.canvasRef.current;
        this.gameState = new GameState({cameraAngle: this.state.cameraAngle, glCanvas, boardConfig});
        this.runCommands([
          ['repaint'],
          ['nextPlayer', 'black'],
        ]);
        break;
    }
  }

  changeCameraAngle(event) {
    const cameraAngle = event.target.value;
    this.setState({cameraAngle});

    const commands = this.gameState.update('setCameraAngle', {cameraAngle, glCanvas: this.canvasRef.current});
    this.runCommands(commands);
  }

  runCommands(commands) {
    const self = this;

    const commandHandlers = {
      repaint() {
        window.requestAnimationFrame(() => {
          drawScene(self.renderState, self.gameState, boardConfig);
        });
      },
      nextPlayer(colour) {
        switch (colour) {
          case 'black':
            self.setState({
              message: self.state.blackPlayer + ' - black',
              isMessageHighlighted: false,
            });
            break;
          case 'white':
            self.setState({
              message: self.state.whitePlayer + ' - white',
              isMessageHighlighted: false,
            });
            break;
        }
      },
      incrementWinCount(colour) {
        let playerId;
        switch (colour) {
          case 'black':
            playerId = self.state.blackPlayer;
            break;
          case 'white':
            playerId = self.state.whitePlayer;
            break;
          default:
            throw new Error('bad colour');
        }
        switch (playerId) {
          case 'Player 1':
            self.setState((prevState) => ({
              wins: {
                ...prevState.wins,
                [playerId]: prevState.wins[playerId] + 1,
              },
              message: 'Player 1 wins',
              isMessageHighlighted: true,
            }));
            break;
          case 'Player 2':
            self.setState({
              wins: {
                ...prevState.wins,
                [playerId]: prevState.wins[playerId] + 1,
              },
              message: 'Player 2 wins',
              isMessageHighlighted: true,
            });
            break;
          default:
            throw new Error('bad playerid');
        }
      }
    };

    for (let [cmd, ...cmdArgs] of commands) {
      // TODO don't repaint multiple times?
      if (cmd in commandHandlers) {
        commandHandlers[cmd](...cmdArgs);
      }
    }
  }
};

ReactDOM.render(<App />, document.getElementById('app'));

/////////////////////////////

// these two functions from here:
// https://stackoverflow.com/questions/42309715/how-to-correctly-pass-mouse-coordinates-to-webgl
function getRelativeMousePosition(event, target) {
  target = target || event.target;
  var rect = target.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

// assumes target or event.target is canvas
function getNoPaddingNoBorderCanvasRelativeMousePosition(event, target) {
  target = target || event.target;
  const pos = getRelativeMousePosition(event, target);

  return [
    pos.x * target.width  / target.clientWidth,
    pos.y * target.height / target.clientHeight,
  ];
}
