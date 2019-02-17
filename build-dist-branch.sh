#!/bin/sh

set -e

mkdir -p dist/branch

npm run build:prod

cp index.html dist/branch/
cp style.css dist/branch/
cp -r build/ dist/branch/
