# iMOKA 
#### **i**nteractive **M**ulti **O**bjective **K**-mer **A**nalysis

iMOKA is a software that enables a comprehensive analysis of sequencing data from large cohorts to generate robust classification models or explore specific genetic elements associated with disease etiology. iMOKA uses a fast and accurate feature reduction step that combines a Naïve Bayes Classifier augmented by an adaptive Entropy filter and a graph-based filter to rapidly reduce the search space. By using a flexible file format and distributed indexing, iMOKA can easily integrate data from multiple experiments and also reduces disk space requirements.

## How to use the software
 **The iMOKA_core and iMOKA_GUI are downlodable from the [Release page of GitHub](https://github.com/RitchieLabIGH/iMOKA/releases) in the assets section.**
 
**Checkout the iMOKA video [presentation](https://youtu.be/KNrYGpEFm2k) and [tutorials](https://www.youtube.com/playlist?list=PLn1zt4v34Yz-AYvQRWc1QxwatYmXmWA3S)!**
 
The core software is distributed as [Singularity](https://sylabs.io/singularity/) image and need as only dependency singularity version 3 or higher ( currently available only on Linux distributions). 
The graphical user interface (GUI), that allows to visualize the results and to use the core software in local environment or in SLURM clusters, is a multiplatform application implemented using [Electron](https://www.electronjs.org/).



## How to contribute
The folders iMOKA_core and iMOKA contains the sources of the CLI and the GUI parts of the software, with dedicated README files, doxygen documentations (for the C++ component ) but, in case of doubt, don't hesitate to contact the maintainers.

### Authors: 

- Claudio Lorenzi <claudio.lorenzi@gmail.com>
- Sylvain Barriere <sylvain.barriere@igh.cnrs.fr>


## Acknowledgment

This project is founded by the University of Montpellier (France) as part of the initiative MUSE: Montpellier Université d'excellence.

 <img src="https://www.montpellier.archi.fr/wp-content/uploads/2019/02/Logo_MUSE_Original.png" alt="drawing" height="100"/>  <img src="https://muse.edu.umontpellier.fr/files/2017/09/LOGO_original_RVB.png" alt="drawing" height="100"/> <img src="https://muse.edu.umontpellier.fr/files/2017/09/CNRS_fr_quadri.png" alt="drawing" height="100"/>


#### Core:
- mlpack : https://github.com/mlpack/mlpack
- cxxopts : https://github.com/jarro2783/cxxopts
- nlohmann/json: https://github.com/nlohmann/json
- SimpSOM: https://github.com/fcomitani/SimpSOM
- sklearn: https://scikit-learn.org/


#### GUI:
- igvteam ( igv.js ): https://github.com/igvteam/igv.js/
- plotly ( plotly.js) : https://github.com/plotly/plotly.js/
- ideogram : https://github.com/eweitz/ideogram
- d3js :  https://github.com/d3
- electron : https://www.electronjs.org/
- angular : https://angular.io/
- angular-material : https://material.angular.io/






