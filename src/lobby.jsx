import React from 'react';

import {firebaseApp} from './firebase';
import {GameComponent} from './game';
// import MatchComponent from './match';

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
            name: val[key].name,
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
          matchKey={this.state.matchParams.key}
          myColour={this.state.matchParams.myColour}
          password={this.state.matchParams.password}
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
    this.setState({
      isMatchActive: true,
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
            black: password,
            white: null,
            lastMoveBy: null,
          },
          ['matchdata/' + key]: {
            name: this.state.newMatchName,
            nextPlayer: 'black',
          },
        }).then(() => {
          this.setState({
            matchParams: {
              key,
              password,
              myColour: 'black',
            },
          });
        });
      });
    }
  }

  onClickJoin(matchKey) {
    const password = Math.random();

    firebaseApp.database().ref('/matches/' + matchKey).update({
      white: password,
    }).then(() => {
      this.setState({
        matchParams: {
          key: matchKey,
          password,
          myColour: 'white',
        },
      });
    });
  }
};

export default LobbyComponent;
