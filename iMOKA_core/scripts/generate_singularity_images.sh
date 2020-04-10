#!/bin/bash

### parameters
basefolder="$PWD"
singularity_base_name="${basefolder}/images/iMOKA_base"
singularity_base_recipe="${basefolder}/recipe/singularity_base.recipe"
singularity_final_name="${basefolder}/images/iMOKA"
singularity_final_recipe="${basefolder}/recipe/singularity.recipe"
singularity_extended_recipe="${basefolder}/recipe/singularity_extended.recipe"
singularity_extended_name="${basefolder}/images/iMOKA_extended"

force_build="F"
extended_build="F"


while [ "$1" != "" ]; do
    case $1 in
    	-f )	 
    		force_build="T"
    		;;
    	-e )	 
    		extended_build="T"
    		;;
 	esac
    shift
done

cd ${basefolder}

if [[ "${force_build}" == "T" || ! -f ${singularity_base_name} ]]; then
	mkdir -p ${basefolder}/images
	sudo singularity build -F ${singularity_base_name} ${singularity_base_recipe}
fi

awk -v base_img="${singularity_base_name}" '{if ($1 == "From:" ) {line=$1 " " base_img } else {line=$0 } ; print line}'  ${singularity_final_recipe} > ${singularity_final_recipe}.tmp

sudo singularity build -F ${singularity_final_name} ${singularity_final_recipe}.tmp
rm ${singularity_final_recipe}.tmp


if [[ "${extended_build}" == "T" ]]; then
	awk -v base_img="${singularity_final_name}" '{if ($1 == "From:" ) {line=$1 " " base_img } else {line=$0 } ; print line}'  ${singularity_extended_recipe} > ${singularity_extended_recipe}.tmp
	sudo singularity build -F ${singularity_extended_name} ${singularity_extended_recipe}.tmp
	rm ${singularity_extended_recipe}.tmp
fi




