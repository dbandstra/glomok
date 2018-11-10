#!/bin/sh

set -e

npm run build:prod

if [ ! -e dist ]; then
  mkdir dist
elif [ ! -d dist ]; then
  echo "Error: dist is not a directory"
  exit 1
else
  rm -rf dist/*
fi

cp index.html dist/
cp style.css dist/
cp -r build/ dist/

git add dist
git commit -m "Build dist"
git subtree push --prefix dist origin gh-pages
