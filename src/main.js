import {drawScene} from './draw';
import {drawSetup} from './draw-setup';
import {GameState} from './gameplay';

const boardConfig = {
  numLines: 15,
  imageDim: 512, // width/height of image
  imageMargin: 32, // number of pixels around the grid
  worldDim: 1, // world diameter of board (including margin)
};

const persistentState = {
  cameraAngle: 'default',
  blackPlayer: 'Player 1',
  whitePlayer: 'Player 2',
  wins: {
    'Player 1': 0,
    'Player 2': 0,
  },
};

///////

window.addEventListener('load', startup, false);

function startup() {
  const glCanvas = document.getElementById('glcanvas');
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

  const renderState = drawSetup(glCanvas, gl, boardConfig);

  let gameState = new GameState({cameraAngle: persistentState.cameraAngle, glCanvas, boardConfig});

  glCanvas.addEventListener('mousemove', (event) => {
    const commands = gameState.update('onMouseMove', glCanvas, getNoPaddingNoBorderCanvasRelativeMousePosition(event));
    runCommands(renderState, gameState, commands);
  });
  glCanvas.addEventListener('mousedown', () => {
    const commands = gameState.update('onClick');
    runCommands(renderState, gameState, commands);
  });
  // firefox doesn't reset selected option on refresh, so do it manually
  document.getElementById('camera-angle-control').value = 'default';
  document.getElementById('camera-angle-control').addEventListener('change', (e) => {
    persistentState.cameraAngle = e.target.value;
    const commands = gameState.update('setCameraAngle', {cameraAngle: e.target.value, glCanvas});
    runCommands(renderState, gameState, commands);
  });
  document.getElementById('start-new-game-button').addEventListener('click', () => {
    let switchColours = true;
    switch (gameState.getGameStatus()) {
      case 'new-game':
        break;
      case 'in-progress':
        if (!confirm('Really start new game?')) {
          break;
        }
        switchColours = false;
      case 'game-over':
        if (switchColours) {
          let tmp = persistentState.blackPlayer;
          persistentState.blackPlayer = persistentState.whitePlayer;
          persistentState.whitePlayer = tmp;
        }
        gameState = new GameState({cameraAngle: persistentState.cameraAngle, glCanvas, boardConfig});
        runCommands(renderState, gameState, [
          ['repaint'],
          ['nextPlayer', 'black'],
        ]);
        break;
    }
  });
  // TODO - update canvas width on resize

  runCommands(renderState, gameState, [['nextPlayer', 'black']]);
  drawScene(renderState, gameState, boardConfig);
}

function runCommands(renderState, gameState, commands) {
  const commandHandlers = {
    repaint() {
      window.requestAnimationFrame(() => {
        drawScene(renderState, gameState, boardConfig);
      });
    },
    nextPlayer(colour) {
      const el = document.getElementById('message');
      el.className = '';
      switch (colour) {
        case 'black':
          el.innerText = persistentState.blackPlayer + ' - black';
          break;
        case 'white':
          el.innerText = persistentState.whitePlayer + ' - white';
          break;
      }
    },
    incrementWinCount(colour) {
      let playerId;
      switch (colour) {
        case 'black':
          playerId = persistentState.blackPlayer;
          break;
        case 'white':
          playerId = persistentState.whitePlayer;
          break;
        default:
          throw new Error('bad colour');
      }
      const n = ++persistentState.wins[playerId];
      let el = document.getElementById('message');
      el.className = 'highlighted';
      switch (playerId) {
        case 'Player 1':
          el.innerText = 'Player 1 wins';
          el = document.getElementById('player-1-wins');
          break;
        case 'Player 2':
          el.innerText = 'Player 2 wins';
          el = document.getElementById('player-2-wins');
          break;
        default:
          throw new Error('bad playerid');
      }
      el.innerText = n === 1 ? '1 win' : n + ' wins';
    }
  };

  for (let [cmd, ...cmdArgs] of commands) {
    // TODO don't repaint multiple times?
    if (cmd in commandHandlers) {
      commandHandlers[cmd](...cmdArgs);
    }
  }
}

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
