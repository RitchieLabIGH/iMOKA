/*
 * MapperResultLine.h
 *
 *  Created on: May 14, 2019
 *      Author: claudio
 */

#ifndef ANNOTATION_MAPPERRESULTLINE_H_
#define ANNOTATION_MAPPERRESULTLINE_H_

#include "AlignmentDerivedFeature.h"
#include "Annotation.h"
namespace imoka { namespace annotation {
class MapperResultLine {
public:
	MapperResultLine() {
	}
	;
	MapperResultLine(std::string line, std::string type) {
		parseSAM(line);
	}
	;
	void parseSAM(std::string line);
	std::string to_bed();
	std::string name = "NA";
	uint64_t match = 0;

	std::string strand = ".";
	std::string chromosome = "NA";
	Segment query;
	Segment target;
	std::vector<Segment> q_blocks;
	std::vector<Segment> t_blocks;
	std::vector<std::string> q_blocks_seq;
	std::vector<std::string> t_blocks_seq;
	uint64_t query_index;
	std::string query_type="kmer";
	unsigned int flag;
	bool secondary=false;
	std::set<uint64_t> genes;
	std::vector<AlignmentDerivedFeature> signatures;
	std::vector<Annotation> annotations;
	std::vector<uint64_t> signatures_id;
	uint64_t id;
	json to_json() ;
friend	bool operator ==(const MapperResultLine & a, const MapperResultLine & b ){
	return a.chromosome == b.chromosome && a.t_blocks == b.t_blocks;
}
private:
	void parseCIGAR(std::string,std::string,  uint64_t, std::string);
};

struct SAMflags { // from  https://samtools.github.io/hts-specs/SAMv1.pdf
	static const unsigned int isPaired= 0x1; 						// 	1		template having multiple segments in sequencing
	static const unsigned int isProperPair= 0x2; 					// 	2 		each segment properly aligned according to the aligner
	static const unsigned int isUnmappedQuery= 0x4; 				// 	4 		segment unmapped
	static const unsigned int hasUnmappedMate= 0x8; 				// 	8 		next segment in the template unmapped
	static const unsigned int isMinusStrand= 0x10; 					// 	16 		SEQ being reverse complemented
	static const unsigned int isMateMinusStrand= 0x20; 				// 	32 		SEQ of the next segment in the template being reverse complemented
	static const unsigned int isFirstMateRead= 0x40; 				// 	64 		the first segment in the template
	static const unsigned int isLastMateRead= 0x80; 				// 	128 	the last segment in the template
	static const unsigned int isSecondaryAlignment= 0x100;  		// 	256		secondary alignment
	static const unsigned int isNotPassingQualityControls= 0x200;	//	512		not passing filters, such as platform/vendor quality controls
	static const unsigned int isDuplicate= 0x400;					//	1024	PCR or optical duplicate
	static const unsigned int isSupplementaryAlignment= 0x800;		//	2048	supplementary alignment
};
}
}
#endif /* ANNOTATION_MAPPERRESULTLINE_H_ */
