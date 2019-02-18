import {firebaseApp} from './firebase';

export class GameBackendFirebase {
  constructor({boardConfig, matchKey, password}) {
    this.boardConfig = boardConfig;
    this.matchKey = matchKey;
    this.password = password;
    this.listener = null;
  }

  init({listener}) {
    this.listener = listener;

    this.matchDataRef = firebaseApp.database().ref('/matchdata/' + this.matchKey);
    this.matchDataCallback = this.matchDataRef.on('value', (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const gridState = new Array(this.boardConfig.numLines * this.boardConfig.numLines);
        for (let i = 0; i < gridState.length; i++) {
          const encodedCellIndex = encodeCellIndex(i);
          gridState[i] = val['board'] && val['board'][encodedCellIndex] || null;
        }
        const getInfoField = (fieldName) => {
          return val['info'] && typeof val['info'][fieldName] !== 'undefined' ? val['info'][fieldName] : null;
        };
        this.listener({
          playerOneName: getInfoField('playerOneName'),
          playerTwoName: getInfoField('playerTwoName'),
          gameId: getInfoField('gameId'),
          isPlayerOneBlack: getInfoField('isPlayerOneBlack'),
          playerOneWins: getInfoField('playerOneWins'),
          playerTwoWins: getInfoField('playerTwoWins'),
          winner: getInfoField('winner'),
          nextPlayer: getInfoField('nextPlayer'),
          nextMoveId: getInfoField('nextMoveId'),
          gridState,
        });
      }
    });
  }

  deinit() {
    this.matchDataRef.off('value', this.matchDataCallback);
  }

  makeMove(cellIndex, myColour, moveId, isWinningMove) {
    const encodedCellIndex = encodeCellIndex(cellIndex);
    firebaseApp.functions().httpsCallable('makeMove')({
      cellIndex: encodedCellIndex,
      isWinningMove,
      matchKey: this.matchKey,
      moveId,
      myColour,
      password: this.password,
    });
    // const payload = {
    //   ['matchdata/' + this.matchKey + '/board/' + encodedCellIndex]: this.myColour,
    //   ['matchdata/' + this.matchKey + '/moves/' + moveId]: encodedCellIndex,
    //   ['matchdata/' + this.matchKey + '/info/nextPlayer']:
    //     isWinningMove ? null :
    //     this.myColour === 'black' ? 'white' : 'black',
    //   ['matchdata/' + this.matchKey + '/info/nextMoveId']: moveId + 1,
    //   ['matches/' + this.matchKey + '/lastMoveBy']: this.password,
    // };
    // console.log(payload);
    // firebaseApp.database().ref('/').update(payload);
  }

  forfeitGame() {
    firebaseApp.functions().httpsCallable('forfeitGame')({
      matchKey: this.matchKey,
      password: this.password,
    });
  }

  startNextGame() {
    firebaseApp.functions().httpsCallable('startNextGame')({
      matchKey: this.matchKey,
      password: this.password,
    });
  }
}

// encodes into a 15-base number, from '00' to 'ee'.
function encodeCellIndex(cellIndex) {
  let result = cellIndex.toString(15);
  if (result.length === 1) {
    result = '0' + result;
  }
  return result;
}

// function decodeCellIndex(encodedCellIndex) {
//   return parseInt(encodedCellIndex, 15);
// }
