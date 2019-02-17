import React from 'react';

import {BOARD_CONFIG} from './board-config';
import {GameBackendLocal} from './game-backend-local';

class MainMenuComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      blackName: 'Player 1',
      whiteName: 'Player 2',
    };
  }

  render() {
    return (
      <div>
        <h3>Main menu</h3>

        <h4>Play locally</h4>
        <form onSubmit={this.onClickPlayLocally.bind(this)}>
          Black name:{' '}
          <input type="text" value={this.state.blackName} onChange={this.updateBlackName.bind(this)} />
          <br />
          White name:{' '}
          <input type="text" value={this.state.whiteName} onChange={this.updateWhiteName.bind(this)} />
          <br />
          <button>Start</button>
        </form>

        <h4>Play online</h4>
        <button onClick={this.props.onGoToLobby}>Go to lobby</button>
      </div>
    );
  }

  updateBlackName(event) {
    this.setState({
      blackName: event.target.value,
    });
  }

  updateWhiteName(event) {
    this.setState({
      whiteName: event.target.value,
    });
  }

  onClickPlayLocally() {
    const boardConfig = BOARD_CONFIG;

    this.props.onEnterGame({
      boardConfig,
      matchParams: {
        key: '' + Math.random(),
        backend: new GameBackendLocal({
          blackName: this.state.blackName,
          whiteName: this.state.whiteName,
          boardConfig,
        }),
        isHotseat: true,
      },
    });
  }
};

export default MainMenuComponent;
