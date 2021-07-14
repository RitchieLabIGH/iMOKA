/*
 * ClassificationMatrix.h
 *
 *  Created on: Mar 5, 2019
 *      Author: claudio
 */

#ifndef PROCESS_CLASSIFICATION_H_
#define PROCESS_CLASSIFICATION_H_

#include "Process.h"
#include "../Utils/MLpack.h"
#include "../Matrix/BinaryMatrix.h"
#include "../Matrix/TextMatrix.h"

#include "../Utils/openga.hpp"



namespace imoka {
namespace process {

class Classification : public Process {
public:
	Classification(std::streambuf * messagebuf):Process(messagebuf){};
	bool run(int argc, char** argv);
	bool classificationFilterMulti(std::string file_in, std::string file_out, int min , uint64_t entropy_evaluation , uint64_t cv,double sd, double acc, double perc_training, std::vector<double> adjustments, uint64_t stable);
	bool geneticAlgorithm(std::string list_of_kmers, std::string matrix_file, std::string output_json, std::string method, uint64_t cross_validation,double sd,  double train_perc, uint64_t max_dimension,uint64_t population ,
			uint64_t generation_max, double CO_fraction , double MUT_rate, double GENE_MUT_rate ,  uint64_t ELITE_count,uint64_t total_runs, uint64_t numTrees,uint64_t minLeaf, uint64_t best_stall_max, uint64_t average_stall_max);
	bool clusterizationFilter(std::string file_in, std::string file_out, uint64_t nbins, double sigthr);
};
}
} /* namespace kma */

#endif /* PROCESS_CLASSIFICATION_H_ */
