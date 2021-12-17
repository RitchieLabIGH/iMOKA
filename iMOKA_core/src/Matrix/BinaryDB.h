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
	BinaryDB(std::string file, bool query_mode) {
		open(file, query_mode);
	}
	;

	static bool create(std::string file, int64_t prefix_size);
	bool open(std::string file, bool query_mode);
	void close() {
		tot_suffix = 0;
		current_suffix=0;
		stream_buffer.clear();
		stream_buffer.shrink_to_fit();
		clearPrefixBuffer();
	}
	virtual ~BinaryDB();
	bool getNext();
	std::vector<double> getKmers(std::vector<Kmer> & requests);
	std::vector<double> getKmers(std::set<Kmer> & requests);
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
	void setMaxMem(uint64_t max_mem) {
		if (isOpen()) {
			std::cerr
					<< "ERROR: close the binaryDB before change the memory size!\n";
		} else {
			_max_mem=max_mem;
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
	int64_t getKlen(){
		return suffix_size + prefix_size;
	}

	bool go_to(const Kmer & );
	bool go_to(uint64_t n );
	std::vector<Kmer> getPartitions(uint64_t n);
	std::string file_name;
	static int64_t bestPrefixSize(std::string file);
	std::pair<Prefix, std::pair<int64_t, int64_t>> current_prefix_range;
	uint64_t current_suffix = 0;
	uint32_t binary_search(const Kmer & target);
	void clearPrefixBuffer();
	void fillPrefixBuffer();

private:
	int64_t prefix_size;
	int64_t suffix_size;
	/// The pointers
	int64_t prefix_curr_p = 0;
	int64_t prefix_init_p = 0;
	int64_t suffix_init_p = 0;
	bool _query_mode = false; // When true, load all the prefixes on memory, otherwise just load buffers
	bool _all_prefix_loaded = false;
	std::pair<bool, int64_t> find_prefix_memory(Prefix &);
	std::pair<bool, int64_t> find_prefix_disk(Prefix &);
	std::pair<bool, std::pair<int64_t,int64_t>> find_prefix_range_memory(Prefix &);
	std::pair<bool, std::pair<int64_t,int64_t>> find_prefix_range_disk(Prefix &);
	std::pair<bool, int64_t> find_suffix(Suffix &, int64_t start, int64_t end);
	uint32_t find_suffix_count(Suffix &, int64_t start, int64_t end);
	int64_t find_prefix_of_suffix(int64_t suffix_n);
	int64_t find_prefix_of_suffix_mem(int64_t suffix_n);
	int64_t find_prefix_of_suffix_disk(int64_t suffix_n);
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
	uint64_t current_buffer_size = 1000000;
	uint64_t buffer_prefix_size = 100;
	uint64_t current_buffer_prefix_size = 100;
	uint64_t tot_prefix = 0;
	uint64_t tot_suffix = 0;

	uint64_t current_prefix = 0;
	uint64_t buffer_p = 0;
	uint64_t p_buffer_p = 0; // only used when query mode is false
	uint64_t tot_count = 0;
	uint64_t _max_mem=10000000;
	FILE *file = NULL;
	FILE *file_prefix = NULL;
	std::vector<uchar> stream_buffer;
	std::vector<uchar> stream_buffer_prefix;

	void fillBuffer();
	bool getNextPrefix();

	void loadPrefixes(std::vector<uchar> & prefixes);
	void loadSuffixes(std::vector<uchar> & suffixes);
	void loadSuffixes(std::vector<uchar> & suffixes, uint64_t from_n, uint64_t to_n);
};
}
}
#endif /* MATRIX_BINARYDB_H_ */
