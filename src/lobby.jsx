import React from 'react';

import {firebaseApp} from './firebase';
import {GameComponent} from './game';
import {GameBackendFirebase} from './game-backend-firebase';
import {GameBackendLocal} from './game-backend-local';

const boardConfig = {
  numLines: 15,
  imageDim: 512, // width/height of image
  imageMargin: 32, // number of pixels around the grid
  worldDim: 1, // world diameter of board (including margin)
};

class LobbyComponent extends React.Component {
  constructor() {
    super();

    this.state = {
      cameraAngle: 'default',
      matchParams: null,
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
    if (this.state.matchParams !== null) {
      return (
        // <MatchComponent
        //   matchKey={this.state.matchParams.key}
        //   password={this.state.matchParams.password}
        // />
        <GameComponent
          key={this.state.matchParams.key}
          backend={this.state.matchParams.backend}
          isHotseat={this.state.matchParams.isHotseat}
          myColour={this.state.matchParams.myColour}
          boardConfig={boardConfig}
          cameraAngle={this.state.cameraAngle}
        />
      );
    } else {
      return (
        <div>
          <h4>Play locally</h4>
          <button onClick={this.onClickPlayLocally.bind(this)}>Start</button>

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
  }

  onClickPlayLocally() {
    const key = '' + Math.random();

    const backend = new GameBackendLocal({
      boardConfig,
    });

    this.setState({
      matchParams: {
        key,
        backend,
        isHotseat: true,
      },
    });
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
          const backend = new GameBackendFirebase({
            boardConfig,
            matchKey: key,
            myColour: 'black',
            password,
          });

          this.setState({
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
      const backend = new GameBackendFirebase({
        boardConfig,
        matchKey,
        myColour: 'white',
        password,
      });

      this.setState({
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
