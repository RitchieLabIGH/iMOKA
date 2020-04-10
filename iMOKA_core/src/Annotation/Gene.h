/*
 * Gene.h
 *
 *  Created on: May 14, 2019
 *      Author: claudio
 */

#ifndef ANNOTATION_GENE_H_
#define ANNOTATION_GENE_H_


#include "MapperResultLine.h"
#include "Event.h"
#include "../Graphs/GraphSequence.h"
#include "../Graphs/BNode.h"
#include "AlignmentDerivedFeature.h"
namespace imoka { namespace annotation {
using namespace matrix;
using namespace graphs;

class Gene {
public :
	Gene(){};
	Gene(std::string gene_name, std::string gene_id, double coverage_limit,std::map<std::string, std::vector<Segment>> transcript_exons,  std::set<uint64_t> mapper_results_idxs,  std::vector<MapperResultLine> & mapper_results,  std::vector<AlignmentDerivedFeature> & all_signatures , std::vector<GraphSequence> & all_sequences){
		init(gene_name,gene_id ,coverage_limit,transcript_exons ,mapper_results_idxs, mapper_results, all_signatures, all_sequences);
	};
	void init(std::string gene_name, std::string gene_id, double coverage_limit,std::map<std::string, std::vector<Segment>> transcript_exons,  std::set<uint64_t> seqs,  std::vector<MapperResultLine> & mapper_results,  std::vector<AlignmentDerivedFeature> & signatures, std::vector<GraphSequence> & all_sequences);
	json to_json();
	std::string gene_id;
	std::string gene_name;
	std::set<uint64_t> sequences;
	std::set<uint64_t> alignments;
	std::set<uint64_t> alignmentDerivedFeatures;
	std::map<std::string, uint64_t> ads_stats;
	std::string chromosome;
	std::vector<Event> events;
	std::vector<uint64_t> events_idx;
	BNode * best_kmer=NULL;
	uint64_t id;
	std::map<std::string, double> coverage;
	bool isDE=false;
private:
	void add_segments(const std::vector<Segment> & new_segments, std::vector<Segment> & target);
};

} }

#endif /* ANNOTATION_GENE_H_ */
