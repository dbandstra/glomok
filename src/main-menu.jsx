import React from 'react';

import {BOARD_CONFIG} from './board-config';
import {GameBackendLocal} from './game-backend-local';

class MainMenuComponent extends React.Component {
  render() {
    return (
      <div>
        <h3>Main menu</h3>

        <h4>Play locally</h4>
        <button onClick={this.onClickPlayLocally.bind(this)}>Start</button>

        <h4>Play online</h4>
        <button onClick={this.props.onGoToLobby}>Go to lobby</button>
      </div>
    );
  }

  onClickPlayLocally() {
    const boardConfig = BOARD_CONFIG;

    this.props.onEnterGame({
      boardConfig,
      matchParams: {
        key: '' + Math.random(),
        backend: new GameBackendLocal({
          boardConfig,
        }),
        isHotseat: true,
      },
    });
  }
};

export default MainMenuComponent;
