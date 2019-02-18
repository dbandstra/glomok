const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp();

exports.createMatch = functions.https.onCall((data) => {
  const {matchName, password, playerName} = data;

  if (typeof matchName !== 'string' || matchName === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing matchName');
  }
  if (typeof password !== 'string' || password === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing password');
  }
  if (typeof playerName !== 'string' || playerName === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing playerName');
  }

  const matchKey = admin.database().ref('/').push().key;

  return admin.database().ref('/').update({
    [`matches/${matchKey}`]: {
      // this table will be private
      playerOnePassword: password,
      playerTwoPassword: null,
      lastMoveBy: null,
    },
    [`matchdata/${matchKey}/info`]: {
      name: matchName,
      playerOneName: playerName,
      playerTwoName: null,
      playerOneWins: 0,
      playerTwoWins: 0,
      numDraws: 0,
      gameId: 1,
      isPlayerOneBlack: true,
      winner: null,
      nextPlayer: 'black',
      nextMoveId: 1,
    },
  }).then(() => {
    return {
      matchKey,
    };
  });
});

exports.joinMatch = functions.https.onCall((data) => {
  const {matchKey, password, playerName} = data;

  if (typeof matchKey !== 'string' || matchKey === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing matchKey');
  }
  if (typeof password !== 'string' || password === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing password');
  }
  if (typeof playerName !== 'string' || playerName === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing playerName');
  }

  return admin.database().ref(`matches/${matchKey}/playerTwoPassword`).once('value').then((snapshot) => {
    if (snapshot.val() !== null) {
      throw new functions.https.HttpsError('failed-precondition', 'Cannot join full match');
    }

    return admin.database().ref('/').update({
      [`matches/${matchKey}/playerTwoPassword`]: password,
      [`matchdata/${matchKey}/info/playerTwoName`]: playerName,
    }).then(() => {
      return {
        ok: true,
      };
    });
  });
});

exports.makeMove = functions.https.onCall((data) => {
  const {cellIndex, isWinningMove, matchKey, moveId, myColour, password} = data;

  if (typeof cellIndex !== 'string' || !cellIndex.match(/^[0-9a-e]{2}$/)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing cellIndex');
  }
  if (typeof isWinningMove !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing isWinningMove');
  }
  if (typeof matchKey !== 'string' || matchKey === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing matchKey');
  }
  if (typeof moveId !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing moveId');
  }
  if (typeof myColour !== 'string' || (myColour !== 'black' && myColour !== 'white')) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing myColour');
  }
  if (typeof password !== 'string' || password === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing password');
  }

  return Promise.all([
    admin.database().ref(`matches/${matchKey}/playerOnePassword`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matches/${matchKey}/playerTwoPassword`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matchdata/${matchKey}/info/playerOneWins`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matchdata/${matchKey}/info/playerTwoWins`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matchdata/${matchKey}/info/isPlayerOneBlack`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matchdata/${matchKey}/info/nextMoveId`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matchdata/${matchKey}/board/${cellIndex}`).once('value').then((snapshot) => snapshot.val()),
  ]).then(([playerOnePassword, playerTwoPassword, playerOneWins, playerTwoWins, isPlayerOneBlack, nextMoveId, currentPieceState]) => {
    const blackPassword = isPlayerOneBlack ? playerOnePassword : playerTwoPassword;
    const whitePassword = isPlayerOneBlack ? playerTwoPassword : playerOnePassword;

    if (myColour === 'black' && password !== blackPassword) {
      throw new functions.https.HttpsError('failed-precondition', 'Wrong password for black player');
    }
    if (myColour === 'white' && password !== whitePassword) {
      throw new functions.https.HttpsError('failed-precondition', 'Wrong password for white player');
    }
    if (currentPieceState !== null) {
      throw new functions.https.HttpsError('failed-precondition', 'A piece is already in that spot');
    }
    if (nextMoveId !== moveId) {
      throw new functions.https.HttpsError('failed-precondition', 'Incorrect moveId');
    }

    const payload = {
      [`matchdata/${matchKey}/board/${cellIndex}`]: myColour,
      [`matchdata/${matchKey}/moves/${moveId}`]: cellIndex,
      [`matchdata/${matchKey}/info/winner`]: isWinningMove ? myColour : null,
      [`matchdata/${matchKey}/info/nextPlayer`]:
        isWinningMove ? null :
        myColour === 'black' ? 'white' : 'black',
      [`matchdata/${matchKey}/info/nextMoveId`]: moveId + 1,
      [`matches/${matchKey}/lastMoveBy`]: password,
    };

    if (isWinningMove) {
      if (password === playerOnePassword) {
        payload[`matchdata/${matchKey}/info/playerOneWins`] = playerOneWins + 1;
      }
      if (password === playerTwoPassword) {
        payload[`matchdata/${matchKey}/info/playerTwoWins`] = playerTwoWins + 1;
      }
    }

    return admin.database().ref('/').update(payload).then(() => {
      return {
        ok: true,
      };
    });
  });
});

exports.forfeitGame = functions.https.onCall((data) => {
  const {matchKey, password} = data;

  if (typeof matchKey !== 'string' || matchKey === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing matchKey');
  }
  if (typeof password !== 'string' || password === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing password');
  }

  return Promise.all([
    admin.database().ref(`matches/${matchKey}/playerOnePassword`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matches/${matchKey}/playerTwoPassword`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matchdata/${matchKey}/info/playerOneWins`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matchdata/${matchKey}/info/playerTwoWins`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matchdata/${matchKey}/info/nextPlayer`).once('value').then((snapshot) => snapshot.val()),
  ]).then(([playerOnePassword, playerTwoPassword, playerOneWins, playerTwoWins, nextPlayer]) => {
    if (nextPlayer === null) {
      throw new functions.https.HttpsError('failed-precondition', 'Game is already over');
    }

    const payload = {
      [`matchdata/${matchKey}/info/winner`]: nextPlayer === 'black' ? 'white' : 'black',
      [`matchdata/${matchKey}/info/nextPlayer`]: null,
    };

    if (password === playerOnePassword) {
      payload[`matchdata/${matchKey}/info/playerTwoWins`] = playerTwoWins + 1;
    } else if (password === playerTwoPassword) {
      payload[`matchdata/${matchKey}/info/playerOneWins`] = playerOneWins + 1;
    } else {
      throw new functions.https.HttpsError('failed-precondition', 'Wrong password');
    }

    return admin.database().ref('/').update(payload).then(() => {
      return {
        ok: true,
      };
    });
  });
});

exports.startNextGame = functions.https.onCall((data) => {
  const {matchKey, password} = data;

  if (typeof matchKey !== 'string' || matchKey === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing matchKey');
  }
  if (typeof password !== 'string' || password === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid/missing password');
  }

  return Promise.all([
    admin.database().ref(`matches/${matchKey}/playerOnePassword`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matches/${matchKey}/playerTwoPassword`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matchdata/${matchKey}/info/gameId`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matchdata/${matchKey}/info/isPlayerOneBlack`).once('value').then((snapshot) => snapshot.val()),
    admin.database().ref(`matchdata/${matchKey}/info/nextPlayer`).once('value').then((snapshot) => snapshot.val()),
  ]).then(([playerOnePassword, playerTwoPassword, gameId, isPlayerOneBlack, nextPlayer]) => {
    if (password !== playerOnePassword && password !== playerTwoPassword) {
      throw new functions.https.HttpsError('failed-precondition', 'Wrong password');
    }
    if (nextPlayer !== null) {
      throw new functions.https.HttpsError('failed-precondition', 'Game is not over');
    }

    const payload = {
      [`matchdata/${matchKey}/board`]: null,
      [`matchdata/${matchKey}/moves`]: null,
      [`matchdata/${matchKey}/info/gameId`]: gameId + 1,
      [`matchdata/${matchKey}/info/isPlayerOneBlack`]: !isPlayerOneBlack,
      [`matchdata/${matchKey}/info/winner`]: null,
      [`matchdata/${matchKey}/info/nextPlayer`]: 'black',
      [`matchdata/${matchKey}/info/nextMoveId`]: 1,
      [`matches/${matchKey}/lastMoveBy`]: null,
    };

    return admin.database().ref('/').update(payload).then(() => {
      return {
        ok: true,
      };
    });
  });
});
