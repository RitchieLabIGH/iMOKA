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

using namespace matrix;
class BNode {
public:
	BNode(){};
	BNode(KmerMatrixLine, int);
	BNode(TextMatrixLine, int);
	BNode(Kmer k){
		kmer =k;
	}
	Kmer kmer;
	std::vector<double> values;
	std::vector<double> means;
	int64_t graph = -1;
	std::set<uint64_t> edgesOut;
	std::set<uint64_t> edgesIn;
	bool masked=false;
	uint64_t id;
	bool root = true;
	friend bool operator<(const BNode& l, const BNode& r){
			return (*std::max(l.values.begin(), l.values.end())) < (*std::max(r.values.begin() , r.values.end()));
	    }
};
}
}
#endif /* GRAPHS_BNODE_H_ */
