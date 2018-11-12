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
export function getNoPaddingNoBorderCanvasRelativeMousePosition(event, target) {
  target = target || event.target;
  const pos = getRelativeMousePosition(event, target);

  return [
    pos.x * target.width  / target.clientWidth,
    pos.y * target.height / target.clientHeight,
  ];
}
