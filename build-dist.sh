#!/bin/sh

set -e

npm run build:prod

mkdir docs
cp index.html docs/
cp style.css docs/
cp -r build/ docs/
