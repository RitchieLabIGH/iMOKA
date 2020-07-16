#!/bin/bash
#SBATCH -n 8                    # Number of cores. For now 56 is the number max of core available
#SBATCH --mem=32G      # allocated memory
#SBATCH -o ./imoka_%j.out      # File to which STDOUT will be written (! create slurmlog folder before)
#SBATCH -e ./imoka_%j.err      # File to which STDERR will be written (! create slurmlog folder before)
#SBATCH -t 1-10:20              # Runtime in D-HH:MM

export OMP_NUM_THREADS=$SLURM_NTASKS
threads=$SLURM_NTASKS

export SINGULARITY_BINDPATH="/nfs/work/td/,/lustre/lorenzic/"


module purge
module load singularity/3.3

imoka_img=$(realpath /lustre/lorenzic/iMOKA/.singularity/iMOKA )
imoka_config=$(realpath /nfs/work/td/iMOKA_config.json)
grep -f ../training.tsv ../../create_matrix.tsv > ./training_matrix.tsv
grep -f ../test.tsv ../../create_matrix.tsv > ./test_matrix.tsv

cp $imoka_img ./tmp_img
imoka_img=$(realpath ./tmp_img)

singularity exec ${imoka_img} iMOKA_core create -i training_matrix.tsv -o matrix.json
singularity exec ${imoka_img} iMOKA_core create -i test_matrix.tsv -o test_matrix.json
singularity exec ${imoka_img} iMOKA_core reduce -i matrix.json -o reduced.matrix -t 0.15
singularity exec ${imoka_img} iMOKA_core aggregate -i reduced.matrix -o aggregated -m $imoka_config -c matrix.json -t 75 -T 65 -w 1 

rm $imoka_img



