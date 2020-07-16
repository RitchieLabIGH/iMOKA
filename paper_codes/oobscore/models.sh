#!/bin/bash
#SBATCH -n 8                    # Number of cores. For now 56 is the number max of core available
#SBATCH --mem=8000      # allocated memory
#SBATCH -o ./reports/models_%A_%a.out      # File to which STDOUT will be written (! create slurmlog folder before)
#SBATCH -e ./reports/models_%A_%a.err      # File to which STDERR will be written (! create slurmlog folder before)
#SBATCH -t 2-10:20              # Runtime in D-HH:MM


export OMP_NUM_THREADS=$SLURM_NTASKS
export SINGULARITY_BINDPATH="/work/clorenzi/"
module purge
module load system/singularity-3.0.1
singularity_image="/work/clorenzi/iMOKA"


out_dir="./models/"

mkdir -p ${out_dir}

rounds=10
threads=${OMP_NUM_THREADS}
cv=5
test_set=0.25
n_feat=20
n_trees=100

task_n="$SLURM_ARRAY_TASK_ID"

if [[ "${task_n}" == "" ]]; then
    task_n=$1
fi
if [[ "${threads}" == "" ]] ; then
    threads=1
fi

f=$(awk -v linen="${task_n}" 'NR == linen { print $1 }' ./todo )

cp $singularity_image ./tmp_img_${task_n}

echo $f
fname=$( echo $f |  awk -F "/" '{print $NF}' )
if [[ $(wc -l $f | awk '{print $1}' ) -gt 3 ]]; then
	singularity exec ./tmp_img_${task_n} ./rf_train_cv.py ${f} ${out_dir}/${fname}.results -p ${test_set} -t ${threads} -n ${n_trees} -r ${rounds} -c ${cv} -m ${n_feat}
fi

rm ./tmp_img_${task_n}
