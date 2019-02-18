import React from 'react';

import {BOARD_CONFIG} from './board-config';
import {GameBackendLocal} from './game-backend-local';

class MainMenuComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      playerOneName: 'Player 1',
      playerTwoName: 'Player 2',
    };
  }

  render() {
    return (
      <div>
        <h3>Main menu</h3>

        <h4>Play locally</h4>
        <form onSubmit={this.onClickPlayLocally.bind(this)}>
          Player 1 name:{' '}
          <input type="text" value={this.state.playerOneName} onChange={this.updatePlayerOneName.bind(this)} />
          <br />
          Player 2 name:{' '}
          <input type="text" value={this.state.playerTwoName} onChange={this.updatePlayerTwoName.bind(this)} />
          <br />
          <button>Start</button>
        </form>

        <h4>Play online</h4>
        <button onClick={this.props.onGoToLobby}>Go to lobby</button>
      </div>
    );
  }

  updatePlayerOneName(event) {
    this.setState({
      playerOneName: event.target.value,
    });
  }

  updatePlayerTwoName(event) {
    this.setState({
      playerTwoName: event.target.value,
    });
  }

  onClickPlayLocally() {
    const boardConfig = BOARD_CONFIG;

    this.props.onEnterGame({
      boardConfig,
      matchParams: {
        key: '' + Math.random(),
        backend: new GameBackendLocal({
          boardConfig,
          playerOneName: this.state.playerOneName,
          playerTwoName: this.state.playerTwoName,
        }),
        isHotseat: true,
        isPlayerOne: null, // meaningless for hot seat gameplay
      },
    });
  }
};

export default MainMenuComponent;
