bugs:
* the 'black/white wins' message doesn't show up on ipad?

features:
* keyboard control
* better scoreboard widget - show which player is you, and who is black/white
* better mobile support (don't rely on mouse hover effect)
* update canvas width on resize
* add a license
* option to turn off board lines. it looks slicker that way
* try drawing board lines with GL_LINES, see if it will look sharper?
* some kind of (optional) animation when you reset the game. pieces fade out or sink through the board or something
* option to throw the board if you lose (animate board and pieces flying)
* dark mode
* get firebase config out of the src folder?
* write tests for firebase security rules. their emulator requires java, but i could probably get started just with a new project and a bunch of curl commands or something
* starting a new game should require agreement from both players
* turn time limits
* games in lobby should expire (and don't show full games)
* lobby should be a separate table in the db with only essential info, updated by db triggers

## Multiplayer
I've reimplemented the multiplayer using cloud functions for everything (no write access to the db at all). I would like to get rid of at least the `makeMove` function and reimplement it with direct db access / security rules (though I'll probably have to make a new function `claimVictory`). Make sure the password-based security still works.

## Barebones build system for development
Building is really slow with Webpack, especially on my laptop. I would like to have a barebones build system for development, taking advantage of the fact that most browsers support ES2015 imports etc. All it should need to do is transpile JSX. But I couldn't quite get it working.

I can use Babel by itself (`@babel/cli`) to transform JSX and do nothing else:

`babel src --presets @babel/preset-react --out-dir built`

Then I would presumably add a bunch of `<script type="module">` listing each of my source files in index.html.

But I can't figure out how to get it to import node_modules such as `react`...

React's docs (https://reactjs.org/docs/add-react-to-a-website.html) include some examples of using React without any build step, but I don't think they're using imports/exports. Just including React from a CDN and then having the whole app in a single JS/JSX file.

## Multiplayer notes
when you create a match, a random number is generated on the client,
and sent to firebase, belonging to the match.
the random number is not readable to anyone. it will only be used in security rules.
this is a password for Player 1.

when you join a match, you send another random number, password for Player 2.

when you make a move, the password is the payload...
like, you set grid AxB to 'password'.
the security rules should be able to secure this.

the passwords also enforce that only 2 people can join a match

i won't be able to prevent people from watching matches they don't belong to
(if they somehow find the key), but i can prevent them from writing anything.


to make a move
you must simultaneously write your password to one location, and your
move to the public location...
security rules will fail the whole write if the password part is denied...
in the private area, we can have 'lastMoveBy' set to the password
of whoever made the last move.
to make your move you simply set that to your own password.
if possible(?!), the move would be denied if it's already set to your password...
