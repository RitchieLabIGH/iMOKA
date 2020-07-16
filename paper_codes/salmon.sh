#!/bin/bash
#SBATCH -n 2                    # Number of cores. For now 56 is the number max of core available
#SBATCH --mem=8G      # allocated memory
#SBATCH -o ./reports/salmon_%A_%a.out      # File to which STDOUT will be written (! create slurmlog folder before)
#SBATCH -e ./reports/salmon_%A_%a.err      # File to which STDERR will be written (! create slurmlog folder before)
#SBATCH -t 1-10:20              # Runtime in D-HH:MM

export OMP_NUM_THREADS=$SLURM_NTASKS
threads=$SLURM_NTASKS

export SINGULARITY_BINDPATH="/nfs/work/td/,/lustre/lorenzic/"



time_track=$(realpath ./times_timetest.tsv ) 

function mytime(){
	format_str="$1\t%e\t%S\t%U\t%M\t%K\t%P\t%x"
	if [[ ! -f ${time_track} ]]; then
		echo -e "ID\tRealTimeSec\tSystemTimeSec\tUserTimeSec\tMaxMemKb\tAvgMemKb\tCPUUsage\tExitStatus" >> ${time_track}
	fi
	shift
	/usr/bin/time --format="${format_str}" -a -o ${time_track} $@
}
 
task_n="$SLURM_ARRAY_TASK_ID"

module purge
module load singularity/3.3


input_file=$(realpath ./todo_${task_n})
salmon_index=$(realpath /nfs/work/td/BEAUTY/Salmon/Salmon )


while read line; do
	sample_name=$(echo $line | awk '{print $1 }' )
	bam_file=$(echo $line | awk '{print $3 }' )
	if [[ -f ${bam_file}_1.fq ]]; then
		echo "skipping bam extraction for ${sample_name}"
	else
		echo "processing $sample_name"
		singularity exec /nfs/work/td/iMOKA samtools fastq -@ ${threads} -0 ${bam_file}_0.fq -1 ${bam_file}_1.fq -2 ${bam_file}_2.fq ${bam_file} 
	fi		
	file_1=$(realpath ${bam_file}_1.fq )
	file_2=$(realpath ${bam_file}_2.fq )
	mkdir -p ./salmon_counts/${sample_name}
	mytime "Salmon_${task_n}" singularity exec salmon_1.1.0.sif salmon quant --validateMappings --allowDovetail -l "IU" -p ${threads} -o ./salmon_counts/${sample_name}/  -i ${salmon_index}  -1 ${file_1} -2 ${file_2}
		rm $file_1 $file_2
done < ${input_file}


