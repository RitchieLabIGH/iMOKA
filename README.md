![enter image description here](https://i.ibb.co/vXTDs9c/iMOKA.png)


iMOKA (**i**nteractive **M**ulti **O**bjective **K**-mer **A**nalysis
) is a software that enables a comprehensive analysis of sequencing data from large cohorts to generate robust classification models or explore specific genetic elements associated with disease etiology. iMOKA uses a fast and accurate feature reduction step that combines a Naïve Bayes Classifier augmented by an adaptive Entropy filter and a graph-based filter to rapidly reduce the search space. By using a flexible file format and distributed indexing, iMOKA can easily integrate data from multiple experiments and also reduces disk space requirements.

## How to use the software
The core software is distributed as [Singularity](https://sylabs.io/singularity/) image and need as only dependency singularity version 3 or higher ( currently available only on Linux distributions). 
The graphical user interface (GUI), that allows to visualize the results and to use the core software in local environment or in SLURM clusters, is a multiplatform application implemented using [Electron](https://www.electronjs.org/).

The iMOKA_core and iMOKA_GUI are downlodable from the [Release page of GitHub](https://github.com/RitchieLabIGH/iMOKA/releases).

## How to contribute
The folders iMOKA_core and iMOKA contains the sources of the CLI and the GUI parts of the software, with dedicated README files, doxygen documentations (for the C++ component ) but, in case of doubt, don't hesitate to contact the maintainers.

## Acknowledgment

#### Core:
- mlpack : https://github.com/mlpack/mlpack
- cxxopts : https://github.com/jarro2783/cxxopts
- nlohmann/json: https://github.com/nlohmann/json
- SimpSOM: https://github.com/fcomitani/SimpSOM
- sklearn: https://scikit-learn.org/


#### GUI:
- igvteam ( igv.js ): https://github.com/igvteam/igv.js/
- plotly ( plotly.js) : https://github.com/plotly/plotly.js/
- d3js :  https://github.com/d3
- electron : https://www.electronjs.org/
- angular : https://angular.io/
- angular-material : https://material.angular.io/





