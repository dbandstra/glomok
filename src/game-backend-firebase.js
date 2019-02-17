import {firebaseApp} from './firebase';

export class GameBackendFirebase {
  constructor({boardConfig, matchKey, myColour, password}) {
    this.boardConfig = boardConfig;
    this.matchKey = matchKey;
    this.myColour = myColour;
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
          blackName: getInfoField('blackName'),
          whiteName: getInfoField('whiteName'),
          nextPlayer: getInfoField('nextPlayer'),
          nextMoveId: getInfoField('nextMoveId'),
          gridState,
          myColour: this.myColour,
        });
      }
    });
  }

  deinit() {
    this.matchDataRef.off('value', this.matchDataCallback);
  }

  makeMove(cellIndex, moveId, isWinningMove) {
    const encodedCellIndex = encodeCellIndex(cellIndex);
    const payload = {
      ['matchdata/' + this.matchKey + '/board/' + encodedCellIndex]: this.myColour,
      ['matchdata/' + this.matchKey + '/moves/' + moveId]: encodedCellIndex,
      ['matchdata/' + this.matchKey + '/info/nextPlayer']:
        isWinningMove ? null :
        this.myColour === 'black' ? 'white' : 'black',
      ['matchdata/' + this.matchKey + '/info/nextMoveId']: moveId + 1,
      ['matches/' + this.matchKey + '/lastMoveBy']: this.password,
    };
    console.log(payload);
    firebaseApp.database().ref('/').update(payload);
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
