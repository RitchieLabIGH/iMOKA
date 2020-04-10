/*
 * Analysis.h
 *
 *  Created on: Mar 5, 2019
 *      Author: claudio
 */

#ifndef PROCESS_AGGREGATION_H_
#define PROCESS_AGGREGATION_H_
#include "Process.h"
#include "../Graphs/KmerGraphSet.h"
#include "../Utils/Mapper.h"

namespace imoka {
namespace process {
/**
 * Aggreagate k-mers that overlaps and are indicators of the same biological event.
 */
class Aggregation : public Process{
public:
	Aggregation(std::streambuf * ostream):Process(ostream){};
	virtual ~Aggregation(){};
	bool run(int argc, char** argv);
	bool redundancyFilter(std::string in_matrix, std::string out_file,
			std::string count_matrix, std::string blat_config, uint64_t overlap,
			double threshold, double final_thr, double coverage_limit, double corr);
	void print_conf(std::string where);
private:
	const std::string default_config =
			std::string(
					R"(
{
 "aligner": {
  "command": "gmap",
  "flag_in": " ",
  "flag_multi_thread": "-t",
  "flag_out": ">",
  "options": "-f samse -K 100000000 -d hg38 -D /home/claudio/Utils/hg38/gmap/ ",
  "output_type": "sam",
  "parallel": -1
 },
 "annotation": {
	"name" : "DefaultAnnotation" , 
  	"file": "/home/claudio/Utils/hg38/gencode.v29.annotation.noIR.gtf"
 }
}

	)");
	json def_conf = json::parse(default_config);
};

} /* namespace kma */
}
#endif /* PROCESS_AGGREGATION_H_ */
