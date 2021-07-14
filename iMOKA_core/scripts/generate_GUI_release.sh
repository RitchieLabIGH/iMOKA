#!/bin/bash

set -e
basedir=$(realpath ./ )
cd ../iMOKA
npm run build
npm run package
npm run make 
npm run make-win
npm run make-mac
mv ./out/make/zip/darwin/x64/imoka-darwin-x64-*.zip ${basedir}/images/imoka-darwin.zip
mv ./out/make/deb/x64/imoka*.deb ${basedir}/images/imoka.deb
mv ./out/make/rpm/x64/imoka*.rpm ${basedir}/images/imoka.rpm
mv ./out/make/squirrel.windows/x64/imoka*.exe ${basedir}/images/imoka.exe
rm -fr ./out
cd $basedir
