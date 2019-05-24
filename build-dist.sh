#!/bin/sh

set -e

npm run build:prod

mkdir dist
cp index.html dist/
cp style.css dist/
cp -r build/ dist/
