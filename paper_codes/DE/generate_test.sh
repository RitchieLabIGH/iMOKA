#!/bin/bash
#SBATCH -n 8                   # Number of cores. For now 56 is the number max of core available
#SBATCH --mem=48G      # allocated memory
#SBATCH -o ./generate_test.out      # File to which STDOUT will be written (! create slurmlog folder before)
#SBATCH -e ./generate_test.err      # File to which STDERR will be written (! create slurmlog folder before)
#SBATCH -t 1-00:00              # Runtime in D-HH:MM



export OMP_NUM_THREADS=$SLURM_NTASKS
threads=$SLURM_NTASKS

export SINGULARITY_BINDPATH="/nfs/work/td/,/lustre/lorenzic/"


module purge
module load singularity/3.3



script_name=$(realpath ./generate_test_tables.R )
source_file=$(realpath ../test.tsv )
results_folder=$(realpath ../../salmon_counts )
output_folder=$(realpath ./TEST_MATRIX )
tx2genes=$(realpath ../../tx2gene.gencode.v29.tsv )
singularity_image=$(realpath /nfs/work/td/DE.img )
mkdir -p ${output_folder} 

singularity exec $singularity_image ${script_name} ${source_file} ${results_folder} ${output_folder}/test ${tx2genes}




