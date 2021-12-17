/*
 * BamReader.h
 *
 *  Created on: Nov 18, 2021
 *      Author: claudio
 */

#ifndef UTILS_BAMREADER_H_
#define UTILS_BAMREADER_H_

#include "IOTools.hpp"
#include <boost/iostreams/filtering_streambuf.hpp>
#include <boost/iostreams/copy.hpp>
#include <boost/iostreams/filter/gzip.hpp>

namespace imoka {

/*
 *
 */
static const char *SEQUENCE_LIST = "=ACMGRSVTWYHKDBN";

class bam_read_core {
public:
	bam_read_core() {
	}
	;
	std::string getSequence() {
		std::stringstream out;
		char mask = 0b00001111;
		char val;
		for (int i = 0; i < l_seq; i++) {
			if (i % 2 == 0) {
				val = (char) (((sequence[i / 2]) >> 4) & mask);
			} else {
				val = (char) (sequence[i / 2] & mask);
			}
			out << SEQUENCE_LIST[val];
		}
		;
		return out.str();

	}

	std::map<std::string, std::string> getAuxiliary() {
		std::map<std::string, std::string> out;
		int p = 0;
		std::string tag, value;
		while (p < aux_len) {
			tag = std::string(1, auxiliary[p])
					+ std::string(1, auxiliary[p+1]);
			p+=2;
			value = get_value(p);
			out[tag]=value;
		}
		return out;
	}
	std::string fastq(){
		std::stringstream out;
		out << "@" << std::string(read_name, l_read_name-1) << "\n";
		out << getSequence() << "\n+\n" << getQuality() << "\n";
		return out.str();
	}
	std::string getQuality(){
		std::stringstream out;
		for ( int i = 0; i < l_seq ; i++){
			out << std::string(1, quality[i] + '!');
		}
		return out.str();

	}

	std::string get_value_aux(int &p, char aux_type) {
		int8_t c;
		uint8_t C;
		int16_t s;
		uint16_t S;
		int32_t i;
		uint32_t I;
		float f;
		std::string value;
		switch (aux_type) {
		case 'c':
			memcpy(&c, &auxiliary[p], sizeof(c));
			value = std::to_string(c);
			p += sizeof(c);
			break;
		case 'C':
			memcpy(&C, &auxiliary[p], sizeof(C));
			value = std::to_string(C);
			p += sizeof(C);
			break;
		case 's':
			memcpy(&s, &auxiliary[p], sizeof(s));
			value = std::to_string(s);
			p += sizeof(s);
			break;
		case 'S':
			memcpy(&S, &auxiliary[p], sizeof(S));
			value = std::to_string(S);
			p += sizeof(S);
			break;
		case 'i':
			memcpy(&i, &auxiliary[p], sizeof(i));
			value = std::to_string(i);
			p += sizeof(i);
			break;
		case 'I':
			memcpy(&I, &auxiliary[p], sizeof(I));
			value = std::to_string(I);
			p += sizeof(I);
			break;
		case 'f':
			memcpy(&f, &auxiliary[p], sizeof(f));
			value = std::to_string(f);
			p += sizeof(f);
			break;
		case 'Z':
			value = "";
			while (auxiliary[p] != '\0') {
				value += auxiliary[p++];
			}
			p++;
			break;
		default:
			std::cerr << aux_type << " type not recognized!";
			exit(1);
		}
		return value;
	}

	std::string get_value(int &p) {
		uint32_t rep;
		std::string value;
		int aux;
		switch (auxiliary[p++]) {
		case 'c':
		case 'C':
		case 's':
		case 'S':
		case 'i':
		case 'I':
		case 'f':
			value = get_value_aux(p, auxiliary[p - 1]);
			break;
		case 'A':
			value = std::string(1, auxiliary[p++]);
			break;
		case 'Z':
			value = "";
			while (auxiliary[p] != '\0') {
				value += auxiliary[p++];
			}
			p++;
			break;
		case 'B':
			aux = p;
			p++;
			memcpy(&rep, &auxiliary[p], sizeof(rep));
			p += sizeof(rep);
			value = get_value_aux(p, auxiliary[aux]);
			rep--;
			while (rep > 0) {
				value += "," + get_value_aux(p, auxiliary[aux]);
				rep--;
			}
			break;
		default:
			std::cerr << auxiliary[p - 1] << " type not recognized!";
			exit(1);
		}
		return value;
	}

	union {
		char c[36];
		struct {
			int32_t block_size;
			int32_t refID;
			int32_t pos;
			uint8_t l_read_name;
			uint8_t mapq;
			uint16_t bin;
			uint16_t n_cigar_op;
			uint16_t flag;
			int32_t l_seq;
			int32_t next_refID;
			int32_t next_pos;
			int32_t tlen;
		};
		// anonymous struct to allow easy access to members.
	};
	int32_t aux_len;
	char read_name[256];
	char sequence[20000];
	char quality[20000];
	char auxiliary[1000];
	bool empty = true;
	union {
		char cigar_buffer[20000];
		int32_t cigar[5000];
	};
};

class BamReader {

	union bam_header {
		char c[8];
		struct {
			char magic[4];
			int32_t l_text;
		};
	};

	union stream_int32 {
		char c[4];
		int32_t i;
	};

	static const int BAM_HEADER_BYTES = 8;
	static const int BAM_READ_CORE_BYTES = 36;
	static const int BAM_READ_CORE_MAX_CIGAR = 20000;

	// Statistics.
	ulong cShortPairs;
	ulong cIntersectPairs;
	ulong cLongPairs;
	ulong cSingleReads;
	ulong cPairedReads;
	ulong cErrorReads;
	ulong cSkippedReads;
	uint64_t totalNucleotides;
	std::map<uint16_t, uint> skippedReason;

	std::map<std::string, std::vector<char>> tmp_reads;
	bam_read_core tmp_read;
	bam_read_core tmp_mate;
	uint64_t current_read = 0;
	bam_read_core empty_read;
	bool getNextReadHead(bam_read_core&);
	void errorMessage();
	void getReadBody(bam_read_core&);
	void handlePairs(bam_read_core&, bam_read_core&);
	std::string getName(bam_read_core&);
	void setMate(std::vector<char> &mate);
	void saveMate();
	std::istream *IN;
	std::istream instream;
	std::vector<std::function<void(bam_read_core&, bam_read_core&)>> callbacksProcess;

	unsigned int processPair(bam_read_core &read1, bam_read_core &read2);
	unsigned int processSingle(bam_read_core &read1);

	std::vector<unsigned char> stream_buffer;
	void fillBuffer();
	std::ifstream file;
	boost::iostreams::filtering_streambuf<boost::iostreams::input> inbuf;
	bool coord_sorted = false;
	void readBamHeader();
public:
	BamReader();
	void openFile(std::istream *_IN);
	void openFile(std::string in_file);
	int processAll();
	void close(){
		file.close();
	}
	void registerCallbackProcess(
			std::function<void(bam_read_core&, bam_read_core&)> callback);

	std::string samHeader;
	std::vector<std::string> chr_names;   //tab terminated chromosome names.
	std::vector<int32_t> chr_lens; //length of each chromosome (not used when reading, used if optionally outputting an altered BAM file)
};

} /* namespace imoka */

#endif /* UTILS_BAMREADER_H_ */
