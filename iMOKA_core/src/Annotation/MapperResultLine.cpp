/*
 * MapperResultLine.cpp
 *
 *  Created on: May 14, 2019
 *      Author: claudio
 */

#include "MapperResultLine.h"
namespace imoka { namespace annotation {
void MapperResultLine::parsePSLX(std::string line) {
	std::vector<std::string> content, block_sizes ,qblocks, tblocks, qbs, tbs;
	IOTools::split(content, line);
	name = content[9];
	std::vector<std::string> name_components;
	IOTools::split(name_components, name, "_");
	query_index = std::stoll(name_components[1]);
	query_type= name_components[0];
	strand = content[8];
	flag = strand == "+" ? 0 : 16;
	match = std::stoll(content[0]);
	chromosome = content[13];
	query= Segment(std::stoll(content[11]), std::stoll(content[12]));
	target = Segment(std::stoll(content[15]), std::stoll(content[16]));
	uint64_t nblocks=std::stoll(content[17]), blen,qs, ts,j ;
	std::string ref, mut;
	IOTools::split(block_sizes, content[18], ",");
	IOTools::split(qblocks, content[19], ",");
	IOTools::split(tblocks, content[20], ",");
	IOTools::to_upper(content[21]);
	IOTools::to_upper(content[22]);
	IOTools::split(qbs, content[21], ",");
	IOTools::split(tbs, content[22], ",");
	for ( uint64_t i=0; i < nblocks; i++){
		blen = std::stoll(block_sizes[i]);
		qs= std::stoll(qblocks[i]);
		ts = std::stoll(tblocks[i]);
		q_blocks.push_back(Segment(qs+1, qs+blen+1));
		t_blocks.push_back(Segment(ts, ts+blen));
		for (j=0; j< blen; j++){
			if ( qbs[i][j] != tbs[i][j] ){
				ref=tbs[i][j];
				mut=qbs[i][j];
				while (j < blen && qbs[i][j+1] != tbs[i][j+1] ){
					j++;
					ref+=tbs[i][j];
					mut+=qbs[i][j];
				}
				signatures.push_back(AlignmentDerivedFeature("mutation",
												Segment(1+ts+j-ref.size(), 1+ts+j),
												Segment(1+qs+j-ref.size(), 1+qs+j),
												chromosome,
												ref + ">" + mut));
			}
		}
	}
	for ( uint64_t i=1; i < nblocks; i++){
		if ( q_blocks[i-1].end ==q_blocks[i].start ){
			if (t_blocks[i].start - t_blocks[i-1].end  <= 10 ){
				signatures.push_back(AlignmentDerivedFeature("deletion",
																Segment(t_blocks[i-1].end , t_blocks[i].start),
																Segment(q_blocks[i-1].end,q_blocks[i].start ),
																chromosome,
																"^"+std::to_string(t_blocks[i].start - t_blocks[i-1].end)+"nt"));
			}
		} else {
			signatures.push_back(AlignmentDerivedFeature("insertion", Segment(t_blocks[i-1].end , t_blocks[i].start), Segment(q_blocks[i-1].end,q_blocks[i].start ),
																			chromosome, "+"+std::to_string(q_blocks[i].start - q_blocks[i-1].end)+"nt"));
		}
	}
}
void MapperResultLine::parseSAM(std::string line) {
	std::vector<std::string> content;
	IOTools::split(content, line, "[\t]+");
	name = content[0];
	std::vector<std::string> name_components;
	IOTools::split(name_components, name);
	query_index = std::stoll(name_components[1]);
	query_type= name_components[0];
	flag = std::stoi(content[1]);
	match = std::stoll(content[4]);
	strand = flag & SAMflags::isMinusStrand ? "-" : "+";
	secondary = flag & SAMflags::isSecondaryAlignment;
	chromosome = content[2];
	std::string md = "";
	for (uint64_t i = 11; i < content.size(); i++) {
		if (content[i].substr(0, 2) == "MD")
			md = content[i].substr(5);
	}
	if (!(flag & SAMflags::isUnmappedQuery)) {
		parseCIGAR(content[5], md, std::stoll(content[3])-1, content[9]);
	}

}

uint64_t nextDigit(std::string & s) {
	std::string tmp = "";
	while (s.size() > 0 && std::isdigit(s[0])) {
		tmp = tmp + s[0];
		s = s.substr(1);
	}
	return tmp.size() > 0 ? std::stoll(tmp) : 0;
}

std::string nextNonDigit(std::string & s) {
	std::string tmp = "";
	while (s.size() > 0 && !std::isdigit(s[0])) {
		tmp = tmp + s[0];
		s = s.substr(1);
	}
	return tmp;
}

void MapperResultLine::parseCIGAR(std::string cigar, std::string md,
		uint64_t tstart, std::string seq) {
	target.start = tstart;
	char Op;
	std::string tmp;
	uint64_t val, curr_q = 0, curr_t = tstart, md_pos;
	md_pos = tstart + nextDigit(md);
	std::string md_event = nextNonDigit(md);
	while (cigar.size() > 0) {
		val = nextDigit(cigar);
		Op = nextNonDigit(cigar)[0];
		switch (Op) {
		case 'M': // Match ( it can contain mutations)
			t_blocks.push_back(Segment(curr_t, curr_t + val));
			q_blocks.push_back(Segment(curr_q + 1, curr_q + val + 1));
			while (md_pos < curr_t + val && md_event.size() > 0) {
				uint64_t pos_on_q = (md_pos - curr_t) + curr_q;
				signatures.push_back(
						AlignmentDerivedFeature("mutation",
								Segment(md_pos, md_pos + md_event.size()),
								Segment(pos_on_q, pos_on_q + md_event.size()),
								chromosome,
								md_event + ">"
										+ seq.substr(pos_on_q,
												md_event.size())));
				md_pos += md_event.size() + nextDigit(md);
				md_event = nextNonDigit(md);
			}
			curr_q += val;
			curr_t += val;
			break;
		case 'I': // insertion
			curr_q += val;
			signatures.push_back(
					AlignmentDerivedFeature("insertion", Segment(curr_t, curr_t + 1),
							Segment(curr_q - val, curr_q), chromosome,
							seq.substr(curr_q - val, val)));
			break;
		case 'D': // deletion
			curr_t += val;
			signatures.push_back(
					AlignmentDerivedFeature("deletion", Segment(curr_t - val, curr_t),
							Segment(curr_q, curr_q + 1), chromosome, md_event));
			if (md.size() > 0 && std::isdigit(md[0])) {
				md_pos += val + nextDigit(md);
				md_event = nextNonDigit(md);
			}
			break;
		case 'N': // long insertion in reference (intron)
			curr_t += val;
			md_pos += val;
			break;
		case 'S': // soft clipping
			if (curr_q == 0) {
				query.start = val;
			} else {
				query.end = curr_q + 1;
			}
			signatures.push_back(
					AlignmentDerivedFeature("clipping", Segment(curr_t, curr_t + 1),
							Segment(curr_q, curr_q + val), chromosome,
							seq.substr(curr_q, val)));
			curr_q += val;
			break;
		case 'H':
		case 'P':
		case '=':
		case 'X':
			//nothing to do, shouldn't appear
			break;
		}
		if (curr_q == 0)
			query.start = 1;
	}
	if (query.end == 0)
		query.end = curr_q + 1;
	target.end = curr_t;
}

json MapperResultLine::to_json() {
	json out = { { "chromosome", chromosome }, { "match", match }, { "start",
			target.start }, { "end", target.end }, { "strand", strand }, {
			"genes", genes }, { "query_index", query_index },
			{ "id", id }, { "signatures", signatures_id } };
	out["blocks"] = json::array();
	for (uint32_t t = 0; t < q_blocks.size(); t++) {
		out["blocks"].push_back( { { "t_start", t_blocks[t].start }, { "t_end",
				t_blocks[t].end }, { "q_start", q_blocks[t].start }, { "q_end",
				q_blocks[t].end } });
	}
	return out;
}

std::string MapperResultLine::to_bed() {
	std::ostringstream ss;
	for (uint64_t b = 0; b < t_blocks.size(); b++) {
		ss << chromosome << "\t" << t_blocks[b].start << "\t" << t_blocks[b].end
				<< "\t" <<  query_type << "_" << id << "_" << b << "\t" << match << "\t" << strand
				<< "\n";
	}
	return ss.str();
}
} }
