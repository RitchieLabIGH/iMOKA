/*
 * Annotation.cpp
 *
 *  Created on: May 14, 2019
 *      Author: claudio
 */

#include "Annotation.h"

namespace imoka { namespace annotation {
const std::string GENCODE_regex::rgx_seq_origin = "([^_]+)_([0-9]+)_([0-9]+)";
const std::string GENCODE_regex::rgx_gene_name =  "gene_name \"([^\"]+)\"";
const std::string GENCODE_regex::rgx_gene_id =  "gene_id \"([^\"]+)\"";
const std::string GENCODE_regex::rgx_transcript_id =  "transcript_id \"([^\"]+)\"";
const std::string GENCODE_regex::rgx_exon_id =  "exon_id \"([^\"]+)\"";
const std::string GENCODE_regex::rgx_transcript_type =  "transcript_type \"([^\"]+)\"";

void Annotation::parse(std::string line) {
	std::vector<std::string> columns;
	IOTools::split(columns, line);
	std::smatch matches;
	position.start = std::stoll(columns[9]);
	position.end = std::stoll(columns[10]);
	Segment target(std::stoll(columns[1]), std::stoll(columns[2]));
	strand = columns[12];
	opposite_strand = strand != columns[5];
	type = columns[8];
	if (std::regex_search(line, matches, std::regex(GENCODE_regex::rgx_seq_origin))) {
		target_type=matches[1];
		map_result_id = std::stoi(matches[2]);
		map_result_block = std::stoi(matches[3]);
	} else {
		std::cerr << "ERROR! line " << line << " not recognized.\n";
		exit(1);
	}
	if (std::regex_search(columns[columns.size() - 1], matches, std::regex(GENCODE_regex::rgx_gene_id))) {
		gene_id = matches[1];
	}
	if (std::regex_search(columns[columns.size() - 1], matches, std::regex(GENCODE_regex::rgx_gene_name))) {
			gene_name = matches[1];
		}

	if (std::regex_search(columns[columns.size() - 1], matches, std::regex(GENCODE_regex::rgx_exon_id))) {
		exon_id = matches[1];
	}
	if (std::regex_search(columns[columns.size() - 1], matches, std::regex(GENCODE_regex::rgx_transcript_id))) {
			transcript_id = matches[1];
	}
}
} }
