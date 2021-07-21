/*
 * BinaryDB.h
 *
 *  Created on: Feb 8, 2019
 *      Author: claudio
 */

#ifndef MATRIX_BINARYDB_H_
#define MATRIX_BINARYDB_H_

#include "../Utils/IOTools.hpp"
#include "Kmer.h"
namespace imoka {
namespace matrix {

class BinaryDB {
public:
	BinaryDB() {
	}
	;
	BinaryDB(std::string file) {
		open(file);
	}
	;

	static bool create(std::string file, int64_t prefix_size);
	bool open(std::string file);
	void close() {
		tot_suffix = 0;
		stream_buffer.clear();
		stream_buffer.shrink_to_fit();
		stream_buffer_prefix.clear();
		stream_buffer_prefix.shrink_to_fit();

	}
	virtual ~BinaryDB();
	bool getNext();
	std::vector<double> getKmers(std::vector<Kmer> & requests);

	void print(std::ofstream & of) {
		of << getKmer() << "\t" << getCount() << "\n";
		while (getNext()) {
			of << getKmer() << "\t" << getCount() << "\n";
		}
	}
	bool isOpen() {
		return current_suffix != 0  && current_suffix <= tot_suffix;
	}
	;
	double perc() {
		return tot_suffix == 0 ? 100 :  ((current_suffix) * 100 / tot_suffix);
	}
	;
	void setBufferSize(uint64_t bs) {
		if (isOpen()) {
			std::cerr
					<< "ERROR: close the binaryDB before change the buffer size!\n";
		} else {
			buffer_size = bs;
		}
	}


	void print_sizes(){
		std::cout << " " << unit_suffix_binary << "\n";
		std::cout << " " << unit_prefix_binary << "\n";

	}

	uint64_t size(){
		return tot_suffix;
	}

	uint64_t getTotCount() {
		return tot_count;
	}
	;
	uint64_t getTotPrefix() {
		return tot_prefix;
	}
	;
	uint64_t getTotSuffix() {
		return tot_suffix;
	}
	;
	int64_t getPrefixSize() {
		return prefix_size;
	}
	;

	Kmer & getKmer() {
		return kmer;
	}
	Suffix & getSuffix() {
		return suffix;
	}
	Prefix & getPrefix() {
		return current_prefix_range.first;
	}
	uint32_t & getCount() {
		return suffix.count;
	}

	int64_t getUnitPrefixSize(){
		return unit_prefix_binary;
	}

	int64_t getUnitSuffixSize(){
			return unit_suffix_binary;
	}

	bool go_to(Kmer & );
	bool go_to(uint64_t n );
	std::vector<Kmer> getPartitions(uint64_t n);
	std::string file_name;
	static int64_t bestPrefixSize(std::string file);
	uint32_t query_count;
	std::pair<Prefix, std::pair<int64_t, int64_t>> current_prefix_range;
	uint64_t current_suffix = 0;

private:
	int64_t prefix_size;
	int64_t suffix_size;
	/// The pointers
	int64_t prefix_curr_p = 0;
	int64_t prefix_init_p = 0;
	int64_t suffix_init_p = 0;

	/// The binary dimensions
	int64_t unit_suffix_binary;
	int64_t unit_prefix_binary;
	uint64_t prefix_v_size = 0;
	uint64_t suffix_v_size = 0;
	uint64_t prefix_v_byte_size = 0;
	uint64_t suffix_v_byte_size = 0;
	uint64_t c_size = sizeof(uint32_t);
	uint64_t p_size = sizeof(uint64_t);

	Suffix suffix;
	Kmer kmer;
	uint64_t buffer_size = 1000000;
	uint64_t buffer_prefix_size;
	uint64_t tot_prefix = 0;
	uint64_t tot_suffix = 0;

	uint64_t current_prefix = 0;
	uint64_t buffer_p = 0;
	uint64_t p_buffer_p = 0;
	uint64_t tot_count = 0;

	FILE *file = NULL;
	FILE *file_prefix = NULL;
	std::vector<uchar> stream_buffer;
	std::vector<uchar> stream_buffer_prefix;

	void fillBuffer();
	void fillPrefixBuffer();
	bool getNextPrefix();
	bool hybrid_binary_search( Kmer & target, std::vector<uchar> & prefixes, std::vector<uchar> & stream_buffer);
	void loadPrefixes(std::vector<uchar> & prefixes);
	void loadSuffixes(std::vector<uchar> & suffixes);
};
}
}
#endif /* MATRIX_BINARYDB_H_ */
