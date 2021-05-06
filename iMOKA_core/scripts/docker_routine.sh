#!/bin/bash

imoka_version=1.1
sudo docker build -t cloxd/imoka:${imoka_version} . && sudo docker push cloxd/imoka:${imoka_version} 


