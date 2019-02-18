import React from 'react';

import GameComponent from './game';
import LobbyComponent from './lobby';
import MainMenuComponent from './main-menu';

class AppComponent extends React.Component {
  constructor() {
    super();

    this.state = {
      page: 'main-menu',
      cameraAngle: 'default',
    };
  }

  render() {
    switch (this.state.page) {
      case 'main-menu':
        return (
          <MainMenuComponent
            onGoToLobby={this.goToLobby.bind(this)}
            onEnterGame={this.enterGame.bind(this)}
          />
        );
      case 'lobby':
        return (
          <LobbyComponent
            onGoToMainMenu={this.goToMainMenu.bind(this)}
            onEnterGame={this.enterGame.bind(this)}
          />
        );
      case 'game':
        return (
          <GameComponent
            key={this.state.matchParams.key}
            backend={this.state.matchParams.backend}
            isPlayerOne={this.state.matchParams.isPlayerOne}
            isHotseat={this.state.matchParams.isHotseat}
            boardConfig={this.state.boardConfig}
            cameraAngle={this.state.cameraAngle}
            onChangeCameraAngle={this.changeCameraAngle.bind(this)}
          />
        );
      default:
        throw new Error('AppComponent: bad page: ' + this.state.page);
    }
  }

  goToLobby() {
    this.setState({
      page: 'lobby',
      matchParams: null,
    });
  }

  goToMainMenu() {
    this.setState({
      page: 'main-menu',
      matchParams: null,
    });
  }

  enterGame({boardConfig, matchParams}) {
    this.setState({
      page: 'game',
      boardConfig,
      matchParams,
    });
  }

  changeCameraAngle(cameraAngle) {
    this.setState({
      cameraAngle,
    });
  }
};

export default AppComponent;
