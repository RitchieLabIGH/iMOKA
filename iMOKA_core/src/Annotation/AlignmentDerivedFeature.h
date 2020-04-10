/*
 * Signature.h
 *
 *  Created on: May 14, 2019
 *      Author: claudio
 */

#ifndef ANNOTATION_ALIGNMENTDERIVEDFEATURE_H_
#define ANNOTATION_ALIGNMENTDERIVEDFEATURE_H_

#include "../Utils/IOTools.hpp"
#include "../Graphs/BNode.h"
namespace imoka { namespace annotation {

using namespace graphs;
class AlignmentDerivedFeature{
public:
	AlignmentDerivedFeature(){};
	AlignmentDerivedFeature(std::string type, Segment pos, Segment q_pos ,std::string chromosome ,std::string inf): signature_type(type), position(pos), info(inf) ,chromosome(chromosome), q_position(q_pos)  {};
	std::string signature_type;
	Segment position;
	Segment q_position;
	std::string chromosome="";
	std::string info;
	std::vector<uint64_t> alignments;
	BNode * best_kmer;
	bool generates_event=false;
	uint64_t id;
	json to_json(){
		json out={{"signature_type", signature_type}, {"info", info }, {"chr", chromosome}, {"alignments", alignments}, {"id", id }, {"best_kmer" , best_kmer->id}, {"generates_event", generates_event}};
		out["position"] = position.to_json();
		return out;
	};
	friend bool operator ==(const AlignmentDerivedFeature& lhs, const AlignmentDerivedFeature& rhs) {
			return lhs.position == rhs.position && rhs.signature_type == lhs.signature_type && rhs.chromosome == lhs.chromosome  ;
	}

};
}
}
#endif /* ANNOTATION_ALIGNMENTDERIVEDFEATURE_H_ */
