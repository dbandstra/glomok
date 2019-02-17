export class GameBackendLocal {
  constructor({boardConfig}) {
    this.boardConfig = boardConfig;
    this.myColour = 'black';
    this.gridState = new Array(boardConfig.numLines * boardConfig.numLines);
    for (let i = 0; i < this.gridState.length; i++) {
      this.gridState[i] = null;
    }
    this.gameOver = false;

    this.listener = null;
  }

  init({listener}) {
    this.listener = listener;

    this.listener({
      blackName: 'Black',
      whiteName: 'White',
      myColour: this.myColour,
      nextPlayer: this.myColour,
      nextMoveId: null,
      gridState: [...this.gridState],
    });
  }

  deinit() {
  }

  makeMove(cellIndex, moveId, isWinningMove) {
    if (this.gameOver) {
      return;
    }

    if (cellIndex >= 0 && cellIndex < this.gridState.length) {
      if (this.gridState[cellIndex] === null) {
        this.gridState[cellIndex] = this.myColour;

        if (isWinningMove) {
          // since it's local we can trust this without checking again
          this.gameOver = true;
        } else {
          // don't advance myColour if game ended
          this.myColour = this.myColour === 'black' ? 'white' : 'black';
        }

        this.listener({
          blackName: 'Black',
          whiteName: 'White',
          myColour: this.myColour,
          nextPlayer: isWinningMove ? null : this.myColour,
          nextMoveId: null,
          gridState: [...this.gridState],
        });
      }
    }
  }
}
