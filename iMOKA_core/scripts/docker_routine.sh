#!/bin/bash

imoka_version=1.1

sudo docker build -t cloxd/imoka:${imoka_version} . 
 

if [[ "${1}" == "prod" ]] ; then
	sudo docker push cloxd/imoka:${imoka_version}
fi


