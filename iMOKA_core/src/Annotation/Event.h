/*
 * Event.h
 *
 *  Created on: May 14, 2019
 *      Author: claudio
 */

#ifndef ANNOTATION_EVENT_H_
#define ANNOTATION_EVENT_H_

#include "../Utils/IOTools.hpp"
#include "../Graphs/BNode.h"
namespace imoka { namespace annotation {

using namespace graphs;
class Event {
public:
	Event(){};
	Event(std::string type, std::set<std::string> gene_names, BNode * b_kmer):type(type),gene_name(gene_names), best_kmer(b_kmer){};
	std::string type;
	std::string info;
	std::vector<uint64_t> signatures;
	std::vector<uint64_t> alignments;
	std::set<std::string> gene_name;
	BNode * best_kmer;
	uint64_t id;
	json to_json(){
		return json({{"signatures" ,signatures}, {"info" , info}, {"type", type }, {"best_kmer", best_kmer->id},{"id", id}, {"gene" , gene_name}});
	};
};
}
}
#endif /* ANNOTATION_EVENT_H_ */
