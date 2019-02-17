import React from 'react';

import GameComponent from './game';
import LobbyComponent from './lobby';
import MainMenuComponent from './main-menu';

class AppComponent extends React.Component {
  constructor() {
    super();

    this.state = {
      page: 'main-menu',
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
            isHotseat={this.state.matchParams.isHotseat}
            myColour={this.state.matchParams.myColour}
            boardConfig={this.state.boardConfig}
            cameraAngle={this.state.cameraAngle}
          />
        );
      default:
        throw new Error('AppComponent: bad page: ' + this.state.page);
    }
  }

  goToLobby() {
    this.setState({page: 'lobby'});
  }

  goToMainMenu() {
    this.setState({page: 'main-menu'});
  }

  enterGame({boardConfig, matchParams}) {
    this.setState({
      page: 'game',
      boardConfig,
      cameraAngle: 'default',
      matchParams,
    });
  }
};

export default AppComponent;
