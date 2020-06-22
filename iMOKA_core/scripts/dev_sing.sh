#!/bin/bash

### parameters
basefolder="$PWD"
singularity_final_name="${basefolder}/images/iMOKA_dev"

cd ${basefolder}

sudo singularity build -F ${singularity_final_name} docker://cloxd/dev_imoka:1.0





