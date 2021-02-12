#!/bin/bash

### functions
usage()
{
    echo $1
    echo -e "
	██╗███╗   ███╗ ██████╗ ██╗  ██╗ █████╗ 
	╚═╝████╗ ████║██╔═══██╗██║ ██╔╝██╔══██╗
	██╗██╔████╔██║██║   ██║█████╔╝ ███████║
	██║██║╚██╔╝██║██║   ██║██╔═██╗ ██╔══██║
	██║██║ ╚═╝ ██║╚██████╔╝██║  ██╗██║  ██║
	╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
    "
    echo -e "\niMOKA Preprocessing: from reads to k-mer counts, using KMC3"
    echo -e "\nusage: \n\tpreprocess.sh -i input_file -o output_dir -k kmer_length -l [fr|rf] [-K][-h][-t int][-r int][q][-m int][-c int][-h]\n"
    echo -e "\t-i|--input-file STR\t A tab separated value file containing in the first column the sample name, \n\t\t\t\t in the second the group and in the third the file location. \n\t\t\t\t This last can be local, http, ftp or SRR/ERR.\n\t\t\t\t If it's a list, it has to be column (;) separated"
    echo -e "\n\t-o|--output-dir STR\t The output directory. If doesn't exists, it will be created. Default \"./preprocess/\""
    echo -e "\n\t-m|--min-counts INT\t Don't consider k-mer present less than the given threshold. Default 5"    
    echo -e "\n\t-c|--counter-val INT\t Kmc counter value. Suggest to keep the default 4294967295, that is also the maximum available."    
    echo -e "\n\t-k|--kmer-length INT\t The length of the k-mer. Default 31"
    echo -e "\n\t-l|--library-type [NULL|fr|rf|ff|rr]\n\t\t\t\t The type of stranded library. In case of presence of one or more \"r\" file, it will be converted to its complementary reverse."
    echo -e "\n\t-t|--threads INT\t Number of threads to use. Default 1"   
    echo -e "\n\t-r|--ram INT\t\t Max ram used by kmc in Gb. Default 12"
    echo -e "\n\t-K|--keep-files\t\t Keep the intermediate files."
    echo -e "\n\t-q|--use-fastqc\t\t Assert the quality of the fastq files using fastqc."    
    echo -e "\n\t-h|--help\t\t Show this help.\n\n"    
    [[ "$2" != "" ]] && exit $2
}

rc_read(){
    $1 $2 | seqkit seq -p -r -j $threads
}

print_info(){
    echo -e "\n\n   Kmer Analysis Preprocessing\n"
    echo -e "\tInput: \t\t\t${input_file}"
    echo -e "\tOutput: \t\t${outputDir}"
    echo -e "\tLibrary type: \t\t${library_type}"    
    echo -e "\tKeep files: \t\t${keepFiles}"
    echo -e "\tMin Counts: \t\t${minCounts}"
    echo -e "\tKmer length: \t\t${kmer_len}"    
    echo -e "\tUse fastqc: \t\t${use_fastqc}"
    echo -e "\tThreads: \t\t${threads}"
    echo -e "\tKMC Max memory: \t\t${maxRam}"
    echo -e "\tKMC counter max value: \t${kmcCounterVal}\n\n"
}

run_till_success(){
	prev_count_success="0"
    count_success="1"
    command_to_run=$@
	while [[ ${prev_count_success} -ne ${count_success} ]]; do
   	    echo -n "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] running $command_to_run "
   	    prev_count_success=$count_success
        $command_to_run || count_success=$(( count_success + 1)) ;
        if [[ ${prev_count_success} -ne ${count_success} ]]; then
       		echo "failed. Trying again with attempt ${count_success}"
        else
        	echo "succeeded."
        fi
    done
}

### params

input_file="NONE"
outputDir=$(realpath ./preprocess/)
library_type="NULL"
keepFiles="F"
minCounts="5"
kmer_len="31"
threads="1"
use_fastqc="F"
maxRam="12"
kmcCounterVal="4294967295"
samflag="NONE"
matrix_file=$(realpath ./create_matrix.tsv)

while [ "$1" != "" ]; do
    case $1 in
        -i | --input-file )     shift
                                input_file=$1
                                ;;
        -o | --output-dir )     shift
                                outputDir=$1
                                ;;
        -ol | --output-list )   shift
                                matrix_file=$1
                                ;;
        -k | --kmer-length )    shift
                                kmer_len=$1
                                ;;
        -t | --threads )        shift
                                threads=$1
                                ;;
        -r | --ram )            shift
                                maxRam=$1
                                ;;
        -K | --keep-files )     keepFiles="T"
                                ;;
        -l | --library-type )   shift
                                library_type=$1
                                ;;
        -q | --use-fastqc )     use_fastqc="T"
                                ;;

        -m | --min-counts )     shift
                                minCounts=$1
                                ;;
        -c | --counter-val )     shift
                                kmcCounterVal=$1
                                ;;
		-f | --flags)			shift
								samflag=$1
								;;	                                
        -h | --help )           usage "" 0
                                exit
                                ;;
        * )                     usage "Parameter $1 unrecognized" 1
    esac
    shift
done

### Check the arguments 

[[ "${input_file}" == "NONE" ]] &&  usage "ERROR! Give the input file using -i" 1 
[ ! -f "${input_file}" ] &&  usage "ERROR! Give a valid input file using -i" 1 


### Initial message 

print_info

### Main

start_time=$(date +%s)

outputDir=$(realpath ${outputDir})
input_file=$(realpath ${input_file})
mkdir -p ${outputDir}
currDir=$(realpath ./ )


grep -v "^#" ${input_file} > ${input_file}.tmp
input_file_tmp=$(realpath ${input_file}.tmp)
cd ${outputDir}

line_n=0
total_line=$(wc -l ${input_file}.tmp | awk '{print $1}')

while read line; do
    line_n=$(( line_n + 1 ))
    partial_time=$(date +%s)
    s_name=$(echo -e "${line}" | awk -F "\t" '{print $1}' )
    s_class=$(echo -e "${line}" | awk -F "\t" '{print $2}' )
    s_links=$(echo -e "${line}" | awk -F "\t" '{gsub(";", " ", $3); print $3}' )
    s_files=""
    o_files=""
    downloaded="F"
    mkdir -p ./${s_name} 
    cd ./${s_name}
    mkdir -p ./tmp_dir/
    mkdir -p ./logs
    logdir=$(realpath ./logs)
    echo -e "\n######################################################################"
    echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] Processing ${s_name}  ( ${line_n} / ${total_line} )"
    for f in $s_links; do
        fname=$(echo $f | awk -F "/" '{print $NF}')
        if [[ "${f}" =~ ^(http|ftp).*$ ]]; then
            echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] DOWNLOADING ${fname}"
            mkdir -p ./fastq
            cd ./fastq
            run_till_success wget ${f} -O $fname -q 2> ${logdir}/wget.err > ${logdir}/wget.out
            f=$(realpath ./${fname})
            cd ..
            downloaded="T"
        elif [[ "${f}" =~ ^[SE]RR[0-9]+$ ]]; then
            echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] DOWNLOADING ${fname}"
            mkdir -p ./fastq
            cd ./fastq
            vdb-config --set /repository/user/cache-disabled=true
            run_till_success fastq-dump --skip-technical --clip --dumpbase --split-3 ${f} 2> ${logdir}/fastqdump.err > ${logdir}/fastqdump.out
            f=$(realpath ./${f}*.fastq )
            cd ..
            downloaded="T"
        else  
            [ ! -f "${f}" ] &&  usage "ERROR! File $f not found!" 1 
        fi
        s_files="${s_files} ${f}"
    done
    f_files=""
    samflag= $(echo "${samflag}" | awk '/[0-9]+/ {print "-f " $1}')
    for f in $s_files ; do
        if [[ "${f}" =~ bam$ ]]; then
	    	echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] Extracting ${fname}"
			mkdir -p ./fasta
			cd ./fasta
			if [ ! -f ${fname}_0.fa ]; then
				samtools fastq $samflag -@ ${threads} -0 ${fname}_0.fq -1 ${fname}_1.fq -2 ${fname}_2.fq ${f} 2> ${logdir}/samtools.err > ${logdir}/samtools.out
			fi
			f=""
			for fa in ${fname}_0.fq ${fname}_1.fq ${fname}_2.fq ; do
				if [ $(ls -s $fa | awk '{print $1}') -gt 0 ]; then
					f="${f} $(realpath ${fa})"
				fi
			done
	        cd ..
        fi
        f_files="${f_files} ${f}"
    done
    s_files=$(echo "$f_files" | xargs )
    paired=$(echo "$s_files" | awk '{if (NF == 2) { print "T" } else { print "F" } }')
    if [[ "${use_fastqc}" == "T" ]]; then
        echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] running fastqc ${fname}"
        mkdir ./fastqc
        fastqc -o ./fastqc -d ./tmp_dir -t ${threads} ${s_files} 2> ${logdir}/fastqc.err > ${logdir}/fastqc.out || ( echo "###[ERROR][$(date +%y-%m-%d-%H:%M:%S)] fastqc failed for ${s_files}" )
        
    fi
    ## detect if the first file is compressed
    read_files=$(echo ${s_files} | awk '{ if ( $1 ~/.gz$|.zip$/ ) { print "zcat" } else { print "cat" } }' )
    file_type=$($read_files ${s_files} | head -n 1 | awk 'NR==1 { if ($0 ~ /^>/) { print "fm" } else { print "fq" } }')
    ## detect if there is a file to convert to rc
    if [[ "${paired}" == "T" && "${library_type}" != "NULL" ]]; then
        echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] Detected paired"
        file_1=$(echo ${s_files} | awk  'BEGIN {RS=" "} /[_]?[R_]1[\._]/ {print}')
        file_2=$(echo ${s_files} | awk  'BEGIN {RS=" "} /[_]?[R_]2[\._]/ {print}')
        if [[ "${file_1}" == "" ]] || [[ "${file_1}" == "" ]] ; then
            file_1=$(echo ${s_files} | awk  'BEGIN {RS=" "} NR==1 {print}')
            file_2=$(echo ${s_files} | awk  'BEGIN {RS=" "} NR==2 {print}')
        fi
        if [[ "${library_type}" == "rf" ]]; then
            echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] Converting "
            fname=$(echo $file_1 | awk -F "/" '{print $NF}' | xargs)
            rc_read ${read_files} ${file_1} > "./tmp_dir/${fname}.rc.${file_type}"
            o_files="${o_files} $file_1"
            file_1=$(realpath "./tmp_dir/${fname}.rc.${file_type}") 
        fi 
        if [[ "${library_type}" == "fr" ]]; then
            echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] Converting ${read_files} ${file_2} "
            fname=$(echo $file_2 | awk -F "/" '{print $NF}' | xargs)
            rc_read ${read_files} ${file_2} > "./tmp_dir/${fname}.rc.${file_type}"
            o_files="${o_files} $file_2"
            file_2=$(realpath "./tmp_dir/${fname}.rc.${file_type}") 
        fi 
        s_files="${file_1} ${file_2}"
    fi
    echo ${s_files} | awk '{for (i=1; i<= NF; i++) { print $i } }' > ./tmp_dir/kmc_input
    prev_count_success="0"
    count_success="1"
    while [[ ${prev_count_success} -ne ${count_success} ]]; do
   	    echo -n "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] running KMC "
	    mkdir -p ./working_dir/
   	    prev_count_success=$count_success
        kmc -k${kmer_len} -t${threads} -m${maxRam} -cs${kmcCounterVal} -ci${minCounts} -b -${file_type} @./tmp_dir/kmc_input ./tmp_dir/tmp.kmc ./working_dir/ 2>> ${logdir}/kmc.err >> ${logdir}/kmc.out  || count_success=$(( count_success + 1)) ;
        rm -fr ./working_dir
        if [[ ${prev_count_success} -ne ${count_success} ]]; then
       		echo "failed. Trying again with attempt ${count_success}"
        else
        	echo "succeeded."
        fi
    done
    echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] running KMC dump"    
	kmc_tools transform ./tmp_dir/tmp.kmc dump -s ./tmp_dir/tmp.txt 2>> ${logdir}/kmc_tools.err >> ${logdir}/kmc_tools.out
    echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] formatting the file"    
	awk '{print $1 "\t" $2}' ./tmp_dir/tmp.txt > ./${s_name}.tsv
	count_file=$(realpath ./${s_name}.tsv)
    echo -e "${count_file}\t${s_name}\t${s_class}" > ./tmp_dir/kma.input
    echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] creating the binary file"    
    iMOKA_core create -i ./tmp_dir/kma.input -o "./${s_name}.json" -r 1 2>> ${logdir}/imoka_create.err >> ${logdir}/imoka_create.out
    cat ./tmp_dir/kma.input >> $matrix_file
    if [[ "${keepFiles}" == "F" ]]; then
        rm ./${s_name}.tsv
        rm -fr ./fasta ./fastq
    fi
    rm -fr ./tmp_dir/
    cd ..
    runtime=$(( $(date +%s) - partial_time ))
    echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] Done in $runtime"
done < ${input_file}.tmp

rm ${input_file_tmp}

runtime=$(( $(date +%s) - start_time ))

echo "###[MESSAGE][$(date +%y-%m-%d-%H:%M:%S)] completed in $runtime"


