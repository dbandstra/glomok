import React from 'react';

import {BOARD_CONFIG} from './board-config';
import {firebaseApp} from './firebase';
import {GameBackendFirebase} from './game-backend-firebase';

class LobbyComponent extends React.Component {
  constructor() {
    super();

    this.state = {
      newMatchName: '',
      matches: [],
    };
  }

  componentDidMount() {
    // TODO - lobby should be separate component.
    // so it ceases to exist when you enter a game.
    this.matchDataRef = firebaseApp.database().ref('/matchdata');
    this.matchDataCallback = this.matchDataRef.on('value', (snapshot) => {
      const val = snapshot.val();
      if (val) {
        this.setState({
          matches: Object.keys(val).map((key) => ({
            key,
            name: val[key]['info']['name'],
          })),
        });
      }
    });
  }

  componentWillUnmount() {
    this.matchDataRef.off('value', this.matchDataCallback);
  }

  render() {
    return (
      <div>
        <h3>Multiplayer lobby</h3>
        <button onClick={this.props.onGoToMainMenu}>Back to main menu</button>

        <h4>Create a match</h4>
        Match name:
        <input type="text" value={this.state.newMatchName} onChange={this.updateNewMatchName.bind(this)} />
        <button onClick={this.onClickCreate.bind(this)}>Create</button>

        <h4>Join a match</h4>
        {this.state.matches.map((match) =>
          <div key={match.key}>
            {match.name}
            <button onClick={this.onClickJoin.bind(this, match.key)}>Join</button>
          </div>
        )}
      </div>
    );
  }

  updateNewMatchName(event) {
    this.setState({
      newMatchName: event.target.value,
    });
  }

  onClickCreate() {
    if (this.state.newMatchName.length > 0) {
      const password = Math.random();

      firebaseApp.database().ref('/').push(null).then(({key}) => {
        firebaseApp.database().ref('/').update({
          ['matches/' + key]: {
            // this table will be private
            blackPassword: password,
            whitePassword: null,
            lastMoveBy: null,
          },
          ['matchdata/' + key + '/info']: {
            name: this.state.newMatchName,
            blackName: 'Somebody', // TODO - let user change his/her name
            whiteName: null,
            nextPlayer: 'black',
            nextMoveId: 1,
          },
        }).then(() => {
          const boardConfig = BOARD_CONFIG;

          const backend = new GameBackendFirebase({
            boardConfig,
            matchKey: key,
            myColour: 'black',
            password,
          });

          this.props.onEnterGame({
            boardConfig,
            matchParams: {
              key,
              backend,
              isHotseat: false,
            },
          });
        });
      });
    }
  }

  onClickJoin(matchKey) {
    const password = Math.random();

    firebaseApp.database().ref('/').update({
      ['matches/' + matchKey + '/whitePassword']: password,
      ['matchdata/' + matchKey + '/info/whiteName']: 'Somebody', // TODO - let user change his/her name
    }).then(() => {
      const boardConfig = BOARD_CONFIG;

      const backend = new GameBackendFirebase({
        boardConfig,
        matchKey,
        myColour: 'white',
        password,
      });

      this.props.onEnterGame({
        boardConfig,
        matchParams: {
          key: matchKey,
          backend,
          isHotseat: false,
        },
      });
    });
  }
};

export default LobbyComponent;
