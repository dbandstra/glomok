import {mat4, vec3} from 'gl-matrix';
import React from 'react';

import {drawScene} from './draw';
import {drawSetup} from './draw-setup';
import {getGridPos, getProjectionMatrix, unprojectMousePos} from './view';

class GameComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      viewInfo: null, // set in componentDidMount()
      mousePos: [0, 0],
      mouse_gridPos: null,
      nextPieceColour: 'black',
      gridState: new Array(this.props.boardConfig.numLines * this.props.boardConfig.numLines),
    };

    for (let i = 0; i < this.state.gridState.length; i++) {
      this.state.gridState[i] = null;
    }

    this.canvasRef = React.createRef();
  }

  componentDidMount() {
    const glCanvas = this.canvasRef.current;
    const gl = glCanvas.getContext('webgl');

    // try to make canvas full width of browser window
    const fullWidth = (() => {
      // https://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window
      const w = window;
      const d = document;
      const e = d.documentElement;
      const g = d.getElementsByTagName('body')[0];
      const x = w.innerWidth || e.clientWidth || g.clientWidth;
      return x;
    })();
    if (fullWidth > glCanvas.width) {
      glCanvas.width = fullWidth;
    }

    this.renderState = drawSetup(glCanvas, gl, this.props.boardConfig);

    const viewInfo = this._calcViewInfo({cameraAngle: this.props.cameraAngle, glCanvas});
    this.setState({viewInfo});

    drawScene(this.renderState, {...this.state, viewInfo, getGridState: this.getGridState.bind(this)}, this.props.boardConfig);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.cameraAngle !== nextProps.cameraAngle) {
      this.setState({
        viewInfo: this._calcViewInfo({
          cameraAngle: nextProps.cameraAngle,
          glCanvas: this.canvasRef.current,
        }),
      });
      this.repaint();
    }
  }

  repaint() {
    window.requestAnimationFrame(() => {
      drawScene(this.renderState, {...this.state, getGridState: this.getGridState.bind(this)}, this.props.boardConfig);
    });
  }

  render() {
    return (
      <canvas className="glcanvas" width="700" height="600" ref={this.canvasRef}
              onMouseMove={this.onCanvasMouseMove.bind(this)}
              onMouseDown={this.onCanvasMouseDown.bind(this)}>
        Canvas not supported.
      </canvas>
    );
  }

  onCanvasMouseMove(event) {
    this._onMouseMove(getNoPaddingNoBorderCanvasRelativeMousePosition(event));
  }

  onCanvasMouseDown() {
    this._onClick();
  }

  _calcViewInfo({cameraAngle, glCanvas}) {
    const proj = getProjectionMatrix({glCanvas});

    const viewmtx = mat4.create();
    if (cameraAngle === 'default') {
      mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, -0.57, 1.1));
      mat4.rotate(viewmtx, viewmtx, 25 * Math.PI / 180.0, vec3.fromValues(1, 0, 0));
    } else if (cameraAngle === 'straight-down') {
      mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, 0.03, 1.3));
    } else {
      mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, -0.85, 0.4));
      mat4.rotate(viewmtx, viewmtx, 60 * Math.PI / 180.0, vec3.fromValues(1, 0, 0));
    }

    const invviewmtx = mat4.create();
    mat4.invert(invviewmtx, viewmtx);

    return {
      proj,
      viewmtx,
      invviewmtx,
      cameraAngle,
    };
  }

  getGridState(gridState, gx, gy) {
    return gridState[gy * this.props.boardConfig.numLines + gx] || null;
  }

  _onMouseMove([mx, my]) {
    const glCanvas = this.canvasRef.current;

    const old_gridPos = this.state.mouse_gridPos;
    const new_gridPos = getGridPos(this.props.boardConfig, ...unprojectMousePos(this.state.viewInfo, [
      mx / (glCanvas.width - 1),
      my / (glCanvas.height - 1),
    ]));

    this.setState({
      mousePos: [mx, my],
      mouse_gridPos: new_gridPos,
    });

    if ((old_gridPos && old_gridPos[0]) !== (new_gridPos && new_gridPos[0]) ||
        (old_gridPos && old_gridPos[1]) !== (new_gridPos && new_gridPos[1])) {
      this.repaint();
    }
  }

  _onClick() {
    if (this.state.mouse_gridPos === null || this.state.nextPieceColour === null) {
      return;
    }

    const v = this.getGridState(this.state.gridState, this.state.mouse_gridPos[0], this.state.mouse_gridPos[1]);

    if (v === null) {
      const [gx, gy] = this.state.mouse_gridPos;

      const newGridState = [...this.state.gridState];
      newGridState[gy * this.props.boardConfig.numLines + gx] = {
        colour: this.state.nextPieceColour,
        isGlowing: false,
      };

      if (this._checkVictory(newGridState, gx, gy, this.state.nextPieceColour)) {
        this.props.onGameOver(this.state.nextPieceColour);
        this.setState({
          gridState: newGridState,
          nextPieceColour: null,
        });
      } else {
        const nextPieceColour = this.state.nextPieceColour === 'white' ? 'black' : 'white';
        this.props.onMoveMade(nextPieceColour);
        this.setState({
          gridState: newGridState,
          nextPieceColour,
        });
      }

      this.repaint();
    }
  }

  // check for victory condition.
  // coords passed are the new piece placed (we only need to check around that)
  // TODO - also check if the board is full (draw)
  _checkVictory(gridState, gx, gy, colour) {
    const check = (xstep, ystep) => {
      let num = 0;
      for (let i = -4; i <= 5; i++) {
        const value = this.getGridState(gridState,
          gx + i * xstep,
          gy + i * ystep,
        );
        if (value !== null && value.colour === colour) {
          num++;
        } else if (num >= 5) {
          i--;
          while (num-- > 0) {
            this.getGridState(gridState,
              gx + (i - num) * xstep,
              gy + (i - num) * ystep,
            ).isGlowing = true;
          }
          return true;
        } else {
          num = 0;
        }
      }
    };
    return check(1, 0) || // left to right
           check(0, 1) || // top to bottom
           check(1, 1) || // bottom-left to top-right
           check(-1, 1); // bottom-right to top-left
  }
}

export default GameComponent;

/////////////////////////////

// these two functions from here:
// https://stackoverflow.com/questions/42309715/how-to-correctly-pass-mouse-coordinates-to-webgl
function getRelativeMousePosition(event, target) {
  target = target || event.target;
  var rect = target.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

// assumes target or event.target is canvas
function getNoPaddingNoBorderCanvasRelativeMousePosition(event, target) {
  target = target || event.target;
  const pos = getRelativeMousePosition(event, target);

  return [
    pos.x * target.width  / target.clientWidth,
    pos.y * target.height / target.clientHeight,
  ];
}
