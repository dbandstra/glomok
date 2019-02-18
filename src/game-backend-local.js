// note fake lag is kind of meaningless... firebase won't have this kind of lag
// even on a slow connection, because it updates a local cache. but at least
// this lets me make sure the "awaiting snapshot" pause at the start renders
// correctly
const FAKE_LAG = null;//1000;

// local hot-seat gameplay
export class GameBackendLocal {
  constructor({boardConfig, playerOneName, playerTwoName}) {
    this.playerOneName = playerOneName;
    this.playerTwoName = playerTwoName;
    this.playerOneWins = 0;
    this.playerTwoWins = 0;
    this.isPlayerOneBlack = true;
    this.nextPlayer = 'black';
    this.winner = null;
    this.gameId = 1;
    this.boardConfig = boardConfig;
    this.gridState = new Array(boardConfig.numLines * boardConfig.numLines);
    this.gridState.fill(null);

    this.listener = null;
  }

  init({listener}) {
    this.listener = listener;

    this._updateListener();
  }

  deinit() {
  }

  makeMove(cellIndex, myColour, moveId, isWinningMove) {
    if (this.nextPlayer === null) {
      return;
    }

    if (cellIndex >= 0 && cellIndex < this.gridState.length) {
      if (this.gridState[cellIndex] === null) {
        this.gridState[cellIndex] = this.nextPlayer;

        if (isWinningMove) {
          if ((this.nextPlayer === 'black') === this.isPlayerOneBlack) {
            this.playerOneWins++;
          } else {
            this.playerTwoWins++;
          }
          this.winner = this.nextPlayer;
          this.nextPlayer = null;
        } else {
          this.nextPlayer = this.nextPlayer === 'black' ? 'white' : 'black';
        }

        this._updateListener();
      }
    }
  }

  forfeitGame() {
    if (this.nextPlayer === (this.isPlayerOneBlack ? 'black' : 'white')) {
      this.playerTwoWins++;
    } else if (this.nextPlayer === (this.isPlayerOneBlack ? 'white' : 'black')) {
      this.playerOneWins++;
    } else {
      return;
    }

    this.winner = this.nextPlayer === 'black' ? 'white' : 'black';
    this.nextPlayer = null;

    this._updateListener();
  }

  startNextGame() {
    if (this.nextPlayer !== null) {
      return;
    }

    this.gridState.fill(null);
    this.gameId++;
    this.isPlayerOneBlack = !this.isPlayerOneBlack;
    this.winner = null;
    this.nextPlayer = 'black';

    this._updateListener();
  }

  _updateListener() {
    const newBackendState = {
      playerOneName: this.playerOneName,
      playerTwoName: this.playerTwoName,
      gameId: this.gameId,
      isPlayerOneBlack: this.isPlayerOneBlack,
      playerOneWins: this.playerOneWins,
      playerTwoWins: this.playerTwoWins,
      winner: this.winner,
      nextPlayer: this.nextPlayer,
      nextMoveId: null,
      gridState: [...this.gridState],
    };

    if (FAKE_LAG) {
      window.setTimeout(() => this.listener(newBackendState), FAKE_LAG);
    } else {
      this.listener(newBackendState);
    }
  }
}
