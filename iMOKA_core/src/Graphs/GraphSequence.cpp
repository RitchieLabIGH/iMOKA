/*
 * GraphSequence.cpp
 *
 *  Created on: Feb 25, 2019
 *      Author: claudio
 */

#include "GraphSequence.h"
namespace imoka {
namespace graphs {

GraphSequence::GraphSequence() {
	// TODO Auto-generated constructor stub

}

GraphSequence::~GraphSequence() {
	// TODO Auto-generated destructor stub
}

json GraphSequence::to_json() {
	json out = { { "best_kmer", best_kmer->kmer.str() }, { "best_kmer_values",
			best_kmer->values }, { "kmers", nodes },
			{ "means", best_kmer->means }, { "sequence", sequence },
			{ "id", id }, { "alignments", alignments }, { "graph", graph } };
	return out;
}

std::vector<std::string> GraphSequence::getKmers() const {
	int k = best_kmer->kmer.k_len;
	std::vector<std::string> out;
	for (int i = 0; i <= sequence.size() - k; i++)
		out.push_back(sequence.substr(i, k));
	return out;
}

void GraphSequence::addNode(BNode &node, int64_t ov) {
	std::string kmer_seq = node.kmer.str();
	if (ov < 0)
		ov = kmer_seq.size();
	sequence += kmer_seq.substr(node.kmer.k_len-ov);
	bnodes.push_back(&node);
	if (best_kmer == NULL || best_kmer->getBestValue() < node.getBestValue()) {
		best_kmer = &node;
	}
}
void GraphSequence::addPrevNode(BNode &node, int64_t ov) {
	std::string kmer_seq = node.kmer.str();
	bnodes.push_back(&node);
	if (ov < 0)
		ov = kmer_seq.size();
	sequence = kmer_seq.substr(0, ov) + sequence;
	if (best_kmer == NULL ||  best_kmer->getBestValue() < node.getBestValue()) {
		best_kmer = &node;
	}
}
}
}
