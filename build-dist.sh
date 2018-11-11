#!/bin/sh

set -e

npm run build:prod

cp index.html dist/
cp style.css dist/
cp -r build/ dist/
