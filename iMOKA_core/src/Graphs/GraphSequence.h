/*
 * GraphSequence.h
 *
 *  Created on: Feb 25, 2019
 *      Author: claudio
 */

#ifndef GRAPHS_GRAPHSEQUENCE_H_
#define GRAPHS_GRAPHSEQUENCE_H_

#include "../Utils/Mapper.h"
#include "BNode.h"

namespace imoka {
namespace graphs {
class GraphSequence {
public:
	GraphSequence();
	virtual ~GraphSequence();
	std::string sequence="";
	std::set<uint64_t> nodes;
	std::vector<BNode*> bnodes;
	BNode* best_kmer=NULL;
	std::vector<uint64_t> alignments;
	uint64_t graph;
	uint64_t id;
	json to_json();
	void addNode(BNode &, int64_t );
	void addPrevNode(BNode &, int64_t );
	std::vector<std::string> getKmers() const ;
};
}

}

#endif /* GRAPHS_GRAPHSEQUENCE_H_ */
