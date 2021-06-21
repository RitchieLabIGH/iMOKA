/*
 * BinaryDB.cpp
 *
 *  Created on: Feb 8, 2019
 *      Author: claudio
 */

#include "BinaryDB.h"

#include <chrono>
#include <fstream>
#include <iostream>
#include <vector>

namespace imoka {
namespace matrix {
BinaryDB::~BinaryDB() {

}

bool BinaryDB::getNext() {
	if (current_suffix < tot_suffix) {
		if (buffer_p == buffer_size) {
			fillBuffer();
		}
		while (current_suffix >= current_prefix_range.second.second && getNextPrefix()){
			// relax ^_^
		}
		memcpy(suffix.kmer.data(), &stream_buffer[buffer_p], suffix_v_byte_size );
		buffer_p+=suffix_v_byte_size;
		memcpy(&suffix.count, &stream_buffer[buffer_p], c_size );
		buffer_p+=c_size;
		kmer = Kmer(getPrefix(), getSuffix());
		current_suffix++;
		return true;
	} else {
		current_suffix=tot_suffix+1;
		return false;
	}
}

void BinaryDB::fillBuffer() {
	if ( stream_buffer.size() != buffer_size){
		stream_buffer.resize(buffer_size);
	}
	file = fopen(file_name.c_str(), "rb");
	int r = fseek(file, suffix_init_p + (unit_suffix_binary * current_suffix), SEEK_SET);
	buffer_size = fread(stream_buffer.data(), 1, buffer_size, file);
	buffer_p = 0;
	fclose(file);
}

void BinaryDB::fillPrefixBuffer(){
	if (stream_buffer_prefix.size() !=  buffer_prefix_size){
		stream_buffer_prefix.resize(buffer_prefix_size);
	}
	file_prefix=fopen(file_name.c_str(), "rb");
	int r=fseek(file_prefix,(prefix_init_p + (unit_prefix_binary * current_prefix)) , SEEK_SET);
	buffer_prefix_size = fread(stream_buffer_prefix.data(),1, buffer_prefix_size, file_prefix);
	p_buffer_p=0;
	fclose(file_prefix);
}

///	Disk binary search of the suffixes with pre-loaded prefixes
/// @param fs file stream of the binary file
/// @param target the k-mer to search
/// @param prefixes_plus_positions the pre-loaded prefixes
/// @return true if found, false if not. The current kmer and count are set to the result.
bool BinaryDB::hybrid_binary_search(Kmer & target, std::vector<uchar> & prefixes, std::vector<uchar> & suffixes_buffer) {
	query_count = 0;
	Prefix prefix(target, prefix_size), tmp_prefix(prefix_size);
	Suffix suffix(target, suffix_size), tmp_suffix(suffix_size);
	int64_t L=0, m, R=tot_prefix-1;
	while (L < R) {
		m = ((L + R) / 2) + ((L + R % 2 == 0) ? 0 : 1);
		memcpy(tmp_prefix.kmer.data(), &prefixes.data()[m*unit_prefix_binary], prefix_v_byte_size);
		if (prefix < tmp_prefix) {
			R = m - 1;
		} else {
			L = m;
		}
	}
	memcpy(tmp_prefix.kmer.data(), &prefixes.data()[L*unit_prefix_binary], prefix_v_byte_size);
	if (!(prefix == tmp_prefix)){
		return false;
	}
	uint64_t suffix_prefix_start;
	memcpy(&suffix_prefix_start, &prefixes[(L*unit_prefix_binary)+prefix_v_byte_size], p_size );
	if ( L == tot_prefix-1){
		R = tot_suffix - 1;
		L = suffix_prefix_start;
	} else {
		R = L+1;
		L = suffix_prefix_start;
		memcpy(&suffix_prefix_start, &prefixes[(R*unit_prefix_binary)+prefix_v_byte_size], p_size );
		R= suffix_prefix_start-1;
	}
	while (L < R) {
		m = ((L + R) / 2) + ((L + R % 2 == 0) ? 0 : 1);
		memcpy(tmp_suffix.kmer.data(), &suffixes_buffer.data()[m*unit_suffix_binary], suffix_v_byte_size);
		if (suffix < tmp_suffix) {
			R = m - 1;
		} else {
			L = m;
		}
	}
	memcpy(tmp_suffix.kmer.data(), &suffixes_buffer.data()[L*unit_suffix_binary], suffix_v_byte_size);
	memcpy(&query_count, &suffixes_buffer[(L*unit_suffix_binary)+suffix_v_byte_size], c_size );
	return tmp_suffix == suffix;
}

std::vector<double> BinaryDB::getKmers(std::vector<Kmer> & requests) {
	std::vector<double> out(requests.size(), 0);
	std::vector<uchar> prefixes;
	std::vector<uchar> suffixes;
	loadPrefixes(prefixes);
	loadSuffixes(suffixes);
	for (uint64_t i = 0; i < out.size(); i++) {
		if (hybrid_binary_search(requests[i], prefixes, suffixes)) {
			out[i] = query_count;
		}
	}
	return out;

}

/**
 * Create a binary DB from a text file
 * @param file Input file in TSV. First coulm k-mer, second column count
 * @return output pair: toatal count of k-mer, file name of the binary file
 */
bool BinaryDB::create(std::string file, int64_t prefix_size) {
	std::vector<std::string> content;
	std::string line = IOTools::getLineFromFile(file, 0);
	IOTools::split_rgx(content, line);
	int key_len = content[0].size();
	if (prefix_size >= key_len || prefix_size == -1) {
		prefix_size = BinaryDB::bestPrefixSize(file);
		if ( prefix_size == -1 ){
			std::cerr << "Error! File " << file << " empty.\n";
			return false;
		}
		std::cerr << "The prefix size is fix to " << prefix_size << std::endl;
	}
	std::ifstream istr(file);
	std::string output_file = file + ".sorted.bin";
	uint64_t total_counts;
	std::ofstream ostr;
	std::vector<char> Buffer(8000);
	ostr.rdbuf()->pubsetbuf(Buffer.data(), 8000);
	ostr.open(output_file, std::ofstream::binary | std::ofstream::out);
	uint32_t count;
	std::string kmer_str;
	bool reading = (istr >> kmer_str >> count ) ? true : false;
	if (reading) {
		Kmer kmer(kmer_str);
		Prefix prefix(kmer, prefix_size);
		Suffix suffix(kmer, kmer.k_len - prefix.k_len);
		uint64_t suffix_v_size = suffix.k_len*2;
		uint64_t prefix_v_size = prefix.k_len*2;
		uint64_t c_size = sizeof(uint32_t);
		uint64_t p_size = sizeof(int64_t);
		uint64_t tot_suffix = 0;
		uint64_t tot_prefix = 0;
		int64_t init = ostr.tellp();
		ostr.write((const char*) &tot_prefix, sizeof(tot_prefix));
		ostr.write((const char*) &tot_suffix, sizeof(tot_suffix));
		ostr.write((const char*) &total_counts, sizeof(total_counts));
		ostr.write((const char*) &prefix_v_size,
				sizeof(std::vector<bool>::size_type));
		ostr.write((const char*) &suffix_v_size,
				sizeof(std::vector<bool>::size_type));
		ostr.write((const char*) &c_size, sizeof(c_size));
		ostr.write((const char*) &p_size, sizeof(p_size));
		uint64_t tot_count = 0;
		std::vector<Prefix> prefixes;
		prefix.first_suffix = tot_suffix;
		prefixes.push_back(prefix);
		while (reading) {
			prefix = Prefix(kmer_str.substr(0, prefix_size));
			suffix = Suffix(kmer_str.substr(prefix_size));
			if (prefixes[prefixes.size() - 1].kmer != prefix.kmer ) {
				prefix.first_suffix = tot_suffix;
				prefixes.push_back(prefix);
			}
			ostr.write((const char*) suffix.kmer.data(), suffix.kmer.size());
			ostr.write((const char*) &count, c_size);
			tot_count += count;
			tot_suffix++;
			reading = (istr >> kmer_str >> count ) ? true : false;
		}

		for (auto p : prefixes) {
			ostr.write((const char*) p.kmer.data(), p.kmer.size());
			ostr.write((const char*) &p.first_suffix, p_size);
		}
		total_counts = tot_count;
		tot_prefix = prefixes.size();
		ostr.seekp(init);
		ostr.write((const char*) &tot_prefix, sizeof(tot_prefix));
		ostr.write((const char*) &tot_suffix, sizeof(tot_suffix));
		ostr.write((const char*) &total_counts, sizeof(total_counts));
		ostr.close();
		std::cerr << "done\n";
		return true;
	} else {
		throw std::invalid_argument("ERROR reading file " + file + "\n");
		return false;
	}

}

bool BinaryDB::open(std::string file) {
	file_name = file;
	std::ifstream fs(file_name, std::ifstream::binary | std::ifstream::in);
	if (fs.fail()) {
		std::cerr << "ERROR opening " << file_name << ": " << strerror(errno) << "\n";
		return false;
	}
	fs.read((char*) &tot_prefix, sizeof(tot_prefix));
	fs.read((char*) &tot_suffix, sizeof(tot_suffix));
	fs.read((char*) &tot_count, sizeof(tot_count));
	fs.read((char*) &prefix_v_size, sizeof(std::vector<bool>::size_type));
	fs.read((char*) &suffix_v_size, sizeof(std::vector<bool>::size_type));
	fs.read((char*) &c_size, sizeof(c_size));
	fs.read((char*) &p_size, sizeof(p_size));
	prefix_v_byte_size = std::floor((prefix_v_size / 8))
			+ (prefix_v_size % 8 == 0 ? 0 : 1);
	suffix_v_byte_size = std::floor((suffix_v_size / 8))
			+ (suffix_v_size % 8 == 0 ? 0 : 1);
	suffix_init_p = fs.tellg();
	fs.close();
	unit_suffix_binary = c_size + suffix_v_byte_size;
	unit_prefix_binary = p_size + prefix_v_byte_size;
	prefix_init_p = suffix_init_p + (unit_suffix_binary * tot_suffix);
	prefix_curr_p = prefix_init_p;
	current_prefix = 0;
	current_suffix = 0;
	prefix_size = prefix_v_size / 2;
	suffix_size = suffix_v_size / 2;
	current_prefix_range = { Prefix(prefix_size) , {0,0} };
	buffer_prefix_size = std::ceil((buffer_size * unit_prefix_binary)/10);
	buffer_size*=unit_suffix_binary;
	suffix= Suffix(suffix_size);
	buffer_p=buffer_size; // oblige to fill the buffer
	p_buffer_p=buffer_prefix_size;
	return tot_suffix > 0;
}

bool BinaryDB::getNextPrefix() {
	if ( current_prefix > tot_prefix){
		return false;
	}
	if ( p_buffer_p == buffer_prefix_size){
		fillPrefixBuffer();
	}
	memcpy(current_prefix_range.first.kmer.data(), &stream_buffer_prefix[p_buffer_p] , prefix_v_byte_size);
	p_buffer_p+=prefix_v_byte_size;
	memcpy(&current_prefix_range.second.first,  &stream_buffer_prefix[p_buffer_p] , p_size );
	p_buffer_p+=p_size;
	if (current_prefix == tot_prefix) {
		current_prefix_range.second.second = tot_suffix - 1;
	} else {
		if ( p_buffer_p == buffer_prefix_size){
			fillPrefixBuffer();
		}
		memcpy(&current_prefix_range.second.second, &stream_buffer_prefix[p_buffer_p+prefix_v_byte_size], p_size );
	}
	current_prefix++;
	return true;
}

void BinaryDB::loadSuffixes(std::vector<uchar> & suffixes) {
	file = fopen(file_name.c_str(), "rb");
	uint64_t suffixes_size=(tot_suffix * unit_suffix_binary);
	fseek(file, suffix_init_p, SEEK_SET);
	suffixes.resize(suffixes_size);
	suffixes_size=fread(suffixes.data(),1, suffixes.size(), file );
	fclose(file);
}
void BinaryDB::loadPrefixes(std::vector<uchar> & prefixes) {
	file_prefix=fopen(file_name.c_str(), "rb");
	uint64_t buffer_prefix_size=tot_prefix * unit_prefix_binary;
	fseek(file_prefix, prefix_init_p  , SEEK_SET);
	prefixes.resize(buffer_prefix_size);
	buffer_prefix_size = fread(prefixes.data(),1, buffer_prefix_size, file_prefix);
	fclose(file_prefix);
}

int64_t BinaryDB::bestPrefixSize(std::string file) {
	uint64_t tot_kmers = IOTools::countFileLines(file);
	return std::round((0.5 * log2(tot_kmers)) - (0.5 * log2(log2(tot_kmers))));
}

std::vector<Kmer> BinaryDB::getPartitions(uint64_t n){
	std::vector<Kmer> out;

	uint64_t batch = std::ceil(this->size()/n);
	uint64_t cur_suffix=current_suffix;
	for (uint64_t i=batch; i < this->size() ; i+=batch ){
		go_to(i);
		out.push_back(this->kmer);
	}
	go_to(cur_suffix);
	return out;
}


/// Go to the target k-mer or, if absent, to the closest next in alphabetical order
/// @param target
/// @return true if found exactly the target
///
bool BinaryDB::go_to(Kmer & target){
	Prefix prefix(target, prefix_size), tmp_prefix(prefix_size);
	Suffix suffix(target, suffix_size), tmp_suffix(suffix_size);
	buffer_p= buffer_size;
	p_buffer_p=buffer_prefix_size; // oblige to fill the buffer

	file_prefix=fopen(file_name.c_str(), "rb");
	int r;
	int64_t L=0, m, R=tot_prefix-1;
	while (L < R) {
		m = ((L + R) / 2) + ((L + R % 2 == 0) ? 0 : 1);
		r=fseek(file_prefix,(prefix_init_p + (unit_prefix_binary * m)) , SEEK_SET);
		r= fread(tmp_prefix.kmer.data(),1, prefix_v_byte_size, file_prefix);
		if (prefix < tmp_prefix) {
			R = m - 1;
		} else {
			L = m;
		}
	}
	fclose(file_prefix);
	current_prefix = L;
	getNextPrefix();
	if (!(prefix == getPrefix())){
		current_suffix=getPrefix().first_suffix;
		getNext();
		return false;
	}
	file = fopen(file_name.c_str(), "rb");
	L = current_prefix_range.second.first;
	R = current_prefix_range.second.second-1;
	while (L < R) {
		m = ((L + R) / 2) + ((L + R % 2 == 0) ? 0 : 1);
		r= fseek(file, suffix_init_p + (unit_suffix_binary * m), SEEK_SET);
		r= fread(tmp_suffix.kmer.data(), 1 , suffix_v_byte_size, file);
		if (suffix < tmp_suffix) {
			R = m - 1;
		} else {
			L = m;
		}
	}
	fclose(file);
	current_suffix=L;
	getNext();
	while ( getKmer() < target) {
		getNext();
	}
	return kmer == target;
}

/// Go to the k-mer number n or, if absent, to the closest next in alphabetical order
/// @param target
/// @return true if found exactly the target
///
bool BinaryDB::go_to(uint64_t n){
	current_prefix=0;
	current_suffix=n;
	fillBuffer();
	fillPrefixBuffer();
	getNext();
}


}
}
