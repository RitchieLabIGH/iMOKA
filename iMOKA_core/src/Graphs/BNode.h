/*
 * BNode.h
 *
 *  Created on: Jan 25, 2019
 *      Author: claudio
 */

#ifndef GRAPHS_BNODE_H_
#define GRAPHS_BNODE_H_

#include "../Utils/IOTools.hpp"
#include "../Matrix/Matrix.h"
#include "../Matrix/TextMatrix.h"

namespace imoka {
namespace graphs {
class GraphSequence;
using namespace matrix;
class BNode {
public:
	BNode(){};
	BNode(KmerMatrixLine<uint32_t>);
	BNode(TextMatrixLine, int);
	BNode(Kmer k){
		kmer =k;
	}
	double getBestValue() const {return *std::max_element(this->values.begin(), this->values.end()) ;};
	Kmer kmer;
	uint64_t sequence;
	std::vector<double> values;
	std::vector<double> means;
	int64_t graph = -1;
	std::set<uint64_t> edgesOut;
	std::set<uint64_t> edgesIn;
	/*bool masked=false;*/
	uint64_t id;
	bool root = true;
	friend bool operator<(const BNode& l, const BNode& r){
			return l.getBestValue() < r.getBestValue() ? true : false;
	    }
};
}
}
#endif /* GRAPHS_BNODE_H_ */
