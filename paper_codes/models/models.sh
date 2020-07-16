#!/bin/bash
#SBATCH -n 2                    # Number of cores. For now 56 is the number max of core available
#SBATCH --mem=8G      # allocated memory
#SBATCH -o ./reports/report_%A_%a.out      # File to which STDOUT will be written (! create slurmlog folder before)
#SBATCH -e ./reports/report_%A_%a.err      # File to which STDERR will be written (! create slurmlog folder before)
#SBATCH -t 1-10:20              # Runtime in D-HH:MM

export OMP_NUM_THREADS=$SLURM_NTASKS
threads=$SLURM_NTASKS

export SINGULARITY_BINDPATH="/nfs/work/td/,/lustre/lorenzic/"

module purge
module load singularity/3.3

imoka_img=$(realpath /lustre/lorenzic/iMOKA/.singularity/iMOKA )
output_file=$(realpath ./accuracies.tsv)


task_n=$1
if [[ "${task_n}" == "" ]]; then
    task_n="$SLURM_ARRAY_TASK_ID"
fi
if [[ "${task_n}" == "" ]]; then
    exit
fi

cp $imoka_img ./tmp_img_${task_n}
imoka_img=$(realpath ./tmp_img_${task_n} )
line_n=1

mkdir -p ./results/

while read fname; do
    if (( line_n == task_n )); then
        mat_id=$(echo $fname | awk -F "/" '{gsub(".matrix", "" ); gsub(".tsv", "");print $NF}')
        test_matrix=$(awk -v lnum="${line_n}" 'NR == lnum {print}' ./test.ls ) 
        echo "Test matrix: ${test_matrix}"
        echo "Training matrix: ${fname}"
        n_lines=$(wc -l $fname | awk '{print $1}')
        if (( n_lines > 2 )); then
           singularity exec $imoka_img ./random_forest.py $fname ${test_matrix} ./results/${mat_id}.accuracies.tsv -r 3 -t ${threads} -n 1000 -m 20
        fi
    fi
    line_n=$(( line_n + 1 ))
done < ./training.ls

rm $imoka_img


