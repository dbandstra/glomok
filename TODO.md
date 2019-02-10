bugs:
* the 'black/white wins' message doesn't show up on ipad?

features:
* keyboard control
* better mobile support (don't rely on mouse hover effect)
* update canvas width on resize
* add a license
* networked multiplayer (firebase?)
* option to turn off board lines. it looks slicker that way
* try drawing board lines with GL_LINES, see if it will look sharper?
* some kind of (optional) animation when you reset the game. pieces fade out or sink through the board or something
* option to throw the board if you lose (animate board and pieces flying)

## Barebones build system for development
Building is really slow with Webpack, especially on my laptop. I would like to have a barebones build system for development, taking advantage of the fact that most browsers support ES2015 imports etc. All it should need to do is transpile JSX. But I couldn't quite get it working.

I can use Babel by itself (`@babel/cli`) to transform JSX and do nothing else:

`babel src --presets @babel/preset-react --out-dir built`

Then I would presumably add a bunch of `<script type="module">` listing each of my source files in index.html.

But I can't figure out how to get it to import node_modules such as `react`...

React's docs (https://reactjs.org/docs/add-react-to-a-website.html) include some examples of using React without any build step, but I don't think they're using imports/exports. Just including React from a CDN and then having the whole app in a single JS/JSX file.
