import React from 'react';

import GameComponent from './game';

const boardConfig = {
  numLines: 15,
  imageDim: 512, // width/height of image
  imageMargin: 32, // number of pixels around the grid
  worldDim: 1, // world diameter of board (including margin)
};

class MatchComponent extends React.Component {
  constructor() {
    super();

    this.state = {
      gameStatus: 'new-game',
      blackPlayer: 'Player 1',
      whitePlayer: 'Player 2',
      wins: {
        'Player 1': 0,
        'Player 2': 0,
      },
      message: 'Player 1 - black',
      isMessageHighlighted: false,
      cameraAngle: 'default',
      gameId: 1,
    };
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
        <GameComponent
          key={this.state.gameId}
          boardConfig={boardConfig}
          cameraAngle={this.state.cameraAngle}
          onMoveMade={this.onMoveMade.bind(this)}
          onGameOver={this.onGameOver.bind(this)}
        />
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

  onClickStartNewGame() {
    let switchColours = true;
    switch (this.state.gameStatus) {
      case 'new-game':
        break;
      case 'in-progress':
        if (!confirm('Really start new game?')) {
          break;
        }
        switchColours = false;
      case 'game-over':
        this.setState((prevState) => ({
          gameStatus: 'new-game',
          gameId: prevState.gameId + 1,
          blackPlayer: switchColours ? prevState.whitePlayer : prevState.blackPlayer,
          whitePlayer: switchColours ? prevState.blackPlayer : prevState.whitePlayer,
          message: (switchColours ? prevState.whitePlayer : prevState.blackPlayer) + ' - black',
          isMessageHighlighted: false,
        }));
        break;
    }
  }

  changeCameraAngle(event) {
    this.setState({cameraAngle: event.target.value});
  }

  onMoveMade(nextPieceColour) {
    switch (nextPieceColour) {
      case 'black':
        this.setState((prevState) => ({
          gameStatus: 'in-progress',
          message: prevState.blackPlayer + ' - black',
          isMessageHighlighted: false,
        }));
      case 'white':
        this.setState((prevState) => ({
          gameStatus: 'in-progress',
          message: prevState.whitePlayer + ' - white',
          isMessageHighlighted: false,
        }));
    }
  }

  onGameOver(winnerColour) {
    this.setState((prevState) => {
      let playerId;
      switch (winnerColour) {
        case 'black': playerId = prevState.blackPlayer; break;
        case 'white': playerId = prevState.whitePlayer; break;
        default:
          throw new Error('bad colour');
      }
      switch (playerId) {
        case 'Player 1':
          return {
            gameStatus: 'game-over',
            wins: {
              ...prevState.wins,
              [playerId]: prevState.wins[playerId] + 1,
            },
            message: 'Player 1 wins',
            isMessageHighlighted: true,
          };
        case 'Player 2':
          return {
            gameStatus: 'game-over',
            wins: {
              ...prevState.wins,
              [playerId]: prevState.wins[playerId] + 1,
            },
            message: 'Player 2 wins',
            isMessageHighlighted: true,
          };
        default:
          throw new Error('bad playerid');
      }
    });
  }
};

export default MatchComponent;
