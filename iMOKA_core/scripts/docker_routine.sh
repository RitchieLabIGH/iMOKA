#!/bin/bash

sudo docker build -t cloxd/imoka:1.0 . && sudo docker push cloxd/imoka:1.0 && sudo singularity build ./images/iMOKA docker://cloxd/imoka:1.0


