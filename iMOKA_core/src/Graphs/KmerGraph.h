/*
 * KmerGraph.h
 *
 *  Created on: Jan 31, 2019
 *      Author: claudio
 */

#ifndef GRAPHS_KMERGRAPH_H_
#define GRAPHS_KMERGRAPH_H_

#include "BNode.h"
#include "GraphSequence.h"
#include "../Utils/Mapper.h"

namespace imoka { namespace graphs {
using namespace matrix;

class KmerGraph {
public:
	KmerGraph() {};
	virtual ~KmerGraph();
	std::vector<BNode> nodes; // nodes are stored sorted by k-mer alphabetically
	std::vector<BNode*> nodes_vsorted; // indexes of the nodes sorted by value
	std::set<uint64_t> visited_nodes;
	std::vector<double> best_accuracies;
	std::string graph_type="None";
	std::set<std::string> genes;
	uint64_t getByID(uint64_t id);
	bool containsNode(uint64_t id);
	void assignBestAccuracy();
	void generateSequences(double min_value);
	std::vector<GraphSequence> sequences;
	std::vector<uint64_t> sequences_idx;
private:
	std::pair<uint64_t, double> getNextNode(std::set<uint64_t>, uint64_t);
	void addNodeToJSON(json & data, BNode & node);
	void extractBestSequence(uint64_t node_idx, GraphSequence & s);
	uint64_t find_overlap(const Kmer & a,const Kmer & b);
	double threshold;

};
}
}

#endif /* GRAPHS_KMERGRAPH_H_ */
