#!/bin/bash

cd ../iMOKA
npm run build && \
rm -fr ./packages/* && \
npm run p-all || exit 1
cd ./packages 
for d in ./iMOKA-* ; do  
    zip -r ${d}.zip $d
done
rm  -f ../../iMOKA_core/images/*.zip
mv ./*.zip ../../iMOKA_core/images/

