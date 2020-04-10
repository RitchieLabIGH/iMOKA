/*
 * BNode.cpp
 *
 *  Created on: Jan 25, 2019
 *      Author: claudio
 */

#include "BNode.h"
namespace imoka {
namespace graphs {
using namespace matrix;
BNode::BNode(KmerMatrixLine ml) {
	kmer = ml.getKmer();
	values = ml.count;
	values.shrink_to_fit();
	id = ml.index;
}

BNode::BNode(TextMatrixLine ml) {
	kmer = Kmer(ml.getName());
	values = ml.count;
	values.shrink_to_fit();
	id = ml.index;
}
}
}
