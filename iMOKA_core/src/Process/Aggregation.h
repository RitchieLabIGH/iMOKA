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
			double threshold, double final_thr, double coverage_limit, double corr, bool perfect_match);
	void print_conf(std::string where);
private:
	const std::string default_config =
			std::string(
					R"(
{
 "aligner": {
  "command": "blat",
  "flag_in": " ",
  "flag_multi_thread": "",
  "io_order" : "io" ,
  "flag_out": " ",
  "options": " -out=pslx -stepSize=5 -repMatch=2253 -minScore=30 -minIdentity=90 /blat_ref/hg38.2bit ",
  "parallel": -1,
  "output_type": "pslx"
 },
 "annotation": {
	"name" : "DefaultAnnotation" , 
  	"file": "/blat_ref/gencode.v29.annotation.noIR.gtf"
 }
}

	)");
	json def_conf = json::parse(default_config);
};

} /* namespace kma */
}
#endif /* PROCESS_AGGREGATION_H_ */
