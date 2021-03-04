#!/bin/bash

cd ../iMOKA
rm -fr ./out
npm run make && \
npm run make-win && \
npm run make-mac && \
mv ./out/make/deb/x64/*.deb ../../iMOKA_core/images/ && \
mv ./out/make/*windows/x64/*.exe ../../iMOKA_core/images/ && \
mv ./out/make/zip/darwin/x64/*.zip ../../iMOKA_core/images/ 




