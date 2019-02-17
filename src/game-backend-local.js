// note fake lag is kind of meaningless... firebase won't have this kind of lag
// even on a slow connection, because it updates a local cache. but at least
// this lets me make sure the "awaiting snapshot" pause at the start renders
// correctly
const FAKE_LAG = null;//1000;

// local hot-seat gameplay
export class GameBackendLocal {
  constructor({boardConfig}) {
    this.boardConfig = boardConfig;
    this.myColour = 'black';
    this.gridState = new Array(boardConfig.numLines * boardConfig.numLines);
    for (let i = 0; i < this.gridState.length; i++) {
      this.gridState[i] = null;
    }

    this.listener = null;
  }

  init({listener}) {
    this.listener = listener;

    this._updateListener();
  }

  deinit() {
  }

  makeMove(cellIndex, moveId, isWinningMove) {
    if (this.myColour === null) {
      return;
    }

    if (cellIndex >= 0 && cellIndex < this.gridState.length) {
      if (this.gridState[cellIndex] === null) {
        this.gridState[cellIndex] = this.myColour;

        if (isWinningMove) {
          // since it's local we can trust this without checking again
          this.myColour = null;
        } else {
          // don't advance myColour if game ended
          this.myColour = this.myColour === 'black' ? 'white' : 'black';
        }

        this._updateListener();
      }
    }
  }

  _updateListener() {
    const newBackendState = {
      blackName: 'Player 1',
      whiteName: 'Player 2',
      myColour: this.myColour,
      nextPlayer: this.myColour,
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
