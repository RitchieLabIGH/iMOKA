#!/bin/bash

imoka_version=1.1
### parameters
basefolder="$PWD"
singularity_final_name="${basefolder}/images/iMOKA"
singularity_extended_recipe="${basefolder}/recipe/singularity_extended.recipe"
singularity_extended_name="${basefolder}/images/iMOKA_extended"


cd ${basefolder}

awk -v base_img="${singularity_final_name}" '{if ($1 == "From:" ) {line=$1 " " base_img } else {line=$0 } ; print line}'  ${singularity_extended_recipe} > ${singularity_extended_recipe}.tmp
sudo singularity build -F ${singularity_final_name} docker://cloxd/imoka:${imoka_version} && sudo singularity build -F ${singularity_extended_name} ${singularity_extended_recipe}.tmp
rm ${singularity_extended_recipe}.tmp




