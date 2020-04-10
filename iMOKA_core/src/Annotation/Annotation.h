/*
 * Annotation.h
 *
 *  Created on: May 14, 2019
 *      Author: claudio
 */

#ifndef ANNOTATION_ANNOTATION_H_
#define ANNOTATION_ANNOTATION_H_

#include "../Utils/IOTools.hpp"
namespace imoka { namespace annotation {

struct GENCODE_regex{
		static const std::string rgx_seq_origin;
		static const std::string rgx_gene_name;
		static const std::string rgx_gene_id;
		static const std::string rgx_transcript_id;
		static const std::string rgx_exon_id;
		static const std::string rgx_transcript_type;
	} ;

class Annotation {


public:
	Annotation(){};
	Annotation(std::string gff_line){ parse(gff_line);};
	void parse(std::string gff_line);
	std::string gene_id;
	std::string gene_name;
	std::string type;
	std::string target_type;
	uint64_t map_result_id;
	uint64_t map_result_block;
	Segment position;
	std::string strand;
	std::string exon_id;
	std::string transcript_id;
	bool opposite_strand;
};

}}

#endif /* ANNOTATION_ANNOTATION_H_ */
