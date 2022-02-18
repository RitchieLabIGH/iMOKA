//====================================
// Name : iMOKA_core - interactive Multi Objective K-mer Analysis
// Author : Claudio Lorenzi ( claudio.lorenzi@gmail.com )
// Copyright:
//    This software is governed by the CeCILL  license under French law and
//    abiding by the rules of distribution of free software.  You can  use,
//    modify and/ or redistribute the software under the terms of the CeCILL
//    license as circulated by CEA, CNRS and INRIA at the following URL
//                       "http://www.cecill.info".
//
//    As a counterpart to the access to the source code and  rights to copy,
//    modify and redistribute granted by the license, users are provided only
//    with a limited warranty  and the software's author,  the holder of the
//    economic rights,  and the successive licensors  have only  limited
//    liability.
//
//    In this respect, the user's attention is drawn to the risks associated
//    with loading,  using,  modifying and/or developing or reproducing the
//    software by the user in light of its specific status of free software,
//    that may mean  that it is complicated to manipulate,  and  that  also
//    therefore means  that it is reserved for developers  and  experienced
//    professionals having in-depth computer knowledge. Users are therefore
//    encouraged to load and test the software's suitability as regards their
//    requirements in conditions enabling the security of their systems and/or
//    data to be ensured and,  more generally, to use and operate it in the
//    same conditions as regards security.
//
//    The fact that you are presently reading this means that you have had
//    knowledge of the CeCILL license and that you accept its terms.
//



/** \mainpage
 * Welcome to iMOKA! \n
 * This software aims to detect set of k-mers whose expression can be used to classify cohorts
 * of clinical data. \n
 * The software is organized in three main processes:
 *  -# imoka::process::BinaryMatrixHandler : generate, dump and query matrices in binary format
 *  -# imoka::process::Classification : use machine learning classification techniques to
 *   - Reduce the k-mer space ( imoka::process::Classification::classificationFilter )
 *   - Identify subsets of features able to classify your cohorts ( imoka::process::Classification::geneticAlgorithm )
 *  -# imoka::process::Aggregation : aggregate the k-mers that overlap the same biological event and keep only one rapresentative to reduce the redundancy
 *
 */

#include <iostream>

#include "Process/Aggregation.h"
#include "Process/Classification.h"
#include "Process/BinaryMatrixHandler.h"
#include "Process/SingleCellDecomposition.h"


std::string help() {
	std::stringstream ss;
	ss << "\n\t" << "██╗███╗   ███╗ ██████╗ ██╗  ██╗ █████╗\n\t"
			<< "╚═╝████╗ ████║██╔═══██╗██║ ██╔╝██╔══██╗\n\t"
			<< "██╗██╔████╔██║██║   ██║█████╔╝ ███████║\n\t"
			<< "██║██║╚██╔╝██║██║   ██║██╔═██╗ ██╔══██║\n\t"
			<< "██║██║ ╚═╝ ██║╚██████╔╝██║  ██╗██║  ██║\n\t"
			<< "╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ \n";
	ss
			<< "  \e[1miMOKA\e[0m: \e[1mi\e[0mnteractive \e[1mm\e[0multi \e[1mo\e[0mbjective \e[1mk\e[0m-mer \e[1ma\e[0mnalysis.\n\n"
			<< "Possible actions: \n";
	std::vector<std::string> acts =
			{ "\e[1mhelp\e[0m: show this help",
					"\e[1mcreate\e[0m: create a matrix json file, converting the text formats when needed",
					"\e[1mextract\e[0m: query a matrix file to extract k-mer counts",
					"\e[1mdump\e[0m: extract all the k-mer counts in alphabetical order",
					"\e[1mstable\e[0m: extract the k-mers stable across the samples, useful to normalize independent counts",
					"\e[1mreduce\e[0m: Reduce a k-mer matrix in according to the clusterization power of each k-mer"
							"\e[1mcluster\e[0m: filter a k-mer matrix in according to their underlying clusters ",
					"\e[1maggregate\e[0m: reduce the number of k-mers aggregating the redundant ones",
					"\e[1mconfig\e[0m: print the configuration file necessary for the mapping and annotation procedures",
					"\e[1msc_learn\e[0m: learn the k-mer composition of the clusters in scRNA-seq data",
					"\e[1msc_decompose\e[0m: decompose a FASTQ file into single cell clusters",
					 };
	for (auto s : acts)
		ss << "  - " << s << "\n";
	ss << "\n";
	return ss.str();
}

int main(int argc, char** argv) {
	std::string action = "help";
	bool done = false;
	if (argc > 1) {
		action = argv[1];
	}
	if (action == "help" || action == "--help" || action == "-h"
			|| action == "h") {
		std::cout << help() << "\n";
		return 0;
	}
	mlpack::math::RandomSeed(123);
	std::streambuf * logStreamBuff = std::cout.rdbuf();
	std::ofstream logfile;
	if (getenv("IMOKA_LOG_FILE")) {
		logfile.open(getenv("IMOKA_LOG_FILE"));
		logStreamBuff = logfile.rdbuf();
	}
	if (! getenv("OMP_NUM_THREADS")){
		omp_set_num_threads(1);
		std::cerr << "Environmental var OMP_NUM_THREADS is not defined. Using 1 thread.\nTo use a different number of thread, export the variable before running iMOKA:\nexport OMP_NUM_THREADS=4 \n";
	}
	if ( ! getenv("IMOKA_MAX_MEM_GB")){
		std::cerr << "Environmental var IMOKA_MAX_MEM_GB is not defined. Using 2 Gb as default.\nTo use a different thershold, export the variable before running iMOKA:\nexport IMOKA_MAX_MEM_GB=2\n";
		setenv("IMOKA_MAX_MEM_GB", "2", 1);
	}
	auto start = std::chrono::high_resolution_clock::now();
	if (action == "create" || action == "extract" || action == "dump" || action=="stable" )
		done = imoka::process::BinaryMatrixHandler(logStreamBuff).run(argc,
				argv);
	else if (action == "reduce" ||  action == "cluster")
		done = imoka::process::Classification(logStreamBuff).run(argc, argv);
	else if (action == "aggregate" || action == "config")
		done = imoka::process::Aggregation(logStreamBuff).run(argc, argv);
	else if (action == "sc_learn" || action == "sc_decompose")
			done = imoka::process::SingleCellDecomposition(logStreamBuff).run(argc, argv);
	else if (action == "test") {
		imoka::matrix::BinaryMatrix matrix(argv[2]);
		imoka::matrix::KmerMatrixLine<double> line;
		matrix.getLine(line);
		imoka::matrix::Kmer kmer=line.getKmer();
		int n=1000;
		std::vector<imoka::matrix::Kmer> partitions = matrix.getPartitions(n);
		for (int i=0; i< n ;i++ ){
			matrix.go_to(partitions[i]);
			matrix.getLine(line);
			if ( line.getKmer().str() != partitions[i].str() ){
				std::cerr << i << " line: " << line.getKmer() << " target= " << partitions[i] <<  " !"<< "\n";
			}

		}
		done=true;
	} else {
		std::ostream logStream(logStreamBuff);
		logStream << help() << "\n     -----------------\n" << "Action "
				<< action << " not recognized.\n\n";
		return 1;
	}
	if (done) {
		auto time = std::chrono::duration_cast<std::chrono::seconds>(
				std::chrono::high_resolution_clock::now() - start).count();
		if (time >= 2) {
			std::ostream logStream(logStreamBuff);
			logStream << "Completed in " << IOTools::format_time_human(time)
					<< ".\nGood luck!\n";
		}
	}
	if (logfile.is_open())
		logfile.close();
	return 0;
}
