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
BNode::BNode(KmerMatrixLine ml, int ngroups) {
	kmer = ml.getKmer();
	values.clear();
	means.clear();
	for (int i = 0; i < ml.count.size() - ngroups; i++) {
		values.push_back(ml.count[i]);
	}
	for (int i = ml.count.size() - ngroups; i < ml.count.size(); i++) {
		means.push_back(ml.count[i]);
	}
	values.shrink_to_fit();
	means.shrink_to_fit();
	id = ml.index;
}

BNode::BNode(TextMatrixLine ml, int ngroups) {
	kmer = Kmer(ml.getName());
	values.clear();
	means.clear();
	for (int i = 0; i < ml.count.size() - ngroups; i++) {
		values.push_back(ml.count[i]);
	}
	for (int i = ml.count.size() - ngroups; i < ml.count.size(); i++) {
		means.push_back(ml.count[i]);
	}
	values.shrink_to_fit();
	means.shrink_to_fit();
	id = ml.index;
}
}
}
