import {firebaseApp} from './firebase';

export class GameBackend {
  constructor({boardConfig, matchKey, myColour, password, listener}) {
    this.boardConfig = boardConfig;
    this.matchKey = matchKey;
    this.myColour = myColour;
    this.password = password;
    this.listener = listener;
  }

  init() {
    this.matchDataRef = firebaseApp.database().ref('/matchdata/' + this.matchKey);
    this.matchDataCallback = this.matchDataRef.on('value', (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const gridState = new Array(this.boardConfig.numLines * this.boardConfig.numLines);
        for (let i = 0; i < gridState.length; i++) {
          gridState[i] = null;
        }
        Object.keys(val.board || {}).forEach((key) => {
          const matches = key.match(/^(\d+)_(\d+)$/);
          if (matches !== null) {
            const x = +matches[1];
            const y = +matches[2];
            gridState[y * this.boardConfig.numLines + x] = val.board[key];
          }
        });
        this.listener({
          blackName: typeof val.blackName !== 'undefined' ? val.blackName : null,
          whiteName: typeof val.whiteName !== 'undefined' ? val.whiteName : null,
          nextPlayer: typeof val.nextPlayer !== 'undefined' ? val.nextPlayer : null,
          gridState,
        });
      }
    });
  }

  deinit() {
    this.matchDataRef.off('value', this.matchDataCallback);
  }

  makeMove(gx, gy, isWinningMove) {
    firebaseApp.database().ref('/').update({
      ['matchdata/' + this.matchKey + '/nextPlayer']:
        isWinningMove ? null :
        this.myColour === 'black' ? 'white' : 'black',
      ['matchdata/' + this.matchKey + '/board/' + gx + '_' + gy]: this.myColour,
      ['matches/' + this.matchKey + '/lastMoveBy']: this.password,
    });
  }
}
