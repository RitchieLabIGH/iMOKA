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
	BNode(KmerMatrixLine);
	BNode(TextMatrixLine);
	BNode(Kmer k){
		kmer =k;
	}
	Kmer kmer;
	std::vector<double> values;
	int64_t graph = -1;
	std::set<uint64_t> edgesOut;
	std::set<uint64_t> edgesIn;
	bool masked=false;
	uint64_t id;
	bool root = true;
};
}
}
#endif /* GRAPHS_BNODE_H_ */
