/*
 * Matrix.h
 *
 *  Created on: Jun 18, 2019
 *      Author: claudio
 */

#ifndef MATRIX_MATRIX_H_
#define MATRIX_MATRIX_H_

#include "../Utils/IOTools.hpp"
#include "Kmer.h"
namespace imoka {
namespace matrix {


class MatrixLine {
public:
	virtual ~MatrixLine(){};
	virtual std::string getName(){return "NA";};
	std::vector<double> count;
	std::vector<uint32_t> raw_count;
	uint64_t index;
};

class KmerMatrixLine  : public MatrixLine {
public:

	Kmer & getKmer() { return kmer; }
	 std::string getName(){return kmer.str();};
	void setKmer(const Kmer & new_kmer){
		kmer = new_kmer;
	}
	void setKmer(const std::string & new_kmer){
			Kmer k(new_kmer);
			kmer = k;
		}
private:
	Kmer kmer;
};



class Matrix {
public:
	Matrix(){
	};
	virtual ~Matrix(){};
	std::vector<std::string> col_names;
	std::vector<std::string> col_groups;
	std::vector<uint64_t> groups;
	std::map<uint64_t, uint64_t> group_counts;
	std::vector<std::vector<uint64_t>> group_map;
	std::vector<std::string> unique_groups; // the group in order unique
	std::vector<std::string> count_files;
	uint64_t k_len;


	void initGroupMaps() {
		unique_groups.clear();
		group_counts.clear();
		groups.clear();
		group_map.clear();
		std::map<std::string, uint64_t> int_groups;
		uint64_t index = 0;
		std::vector<uint64_t> empty;
		std::set<std::string> keys;
		for (auto g : col_groups) keys.insert(g);
		for ( auto g : keys ){
			int_groups[g] = unique_groups.size();
			unique_groups.push_back(g);
			group_counts[int_groups[g]] = 0;
			group_map.push_back(empty);
		}
		for (auto g: col_groups){
			groups.push_back(int_groups[g]);
			group_map[int_groups[g]].push_back(index);
			group_counts[int_groups[g]]++;
			index++;
		}
	}


};
}
}
#endif /* MATRIX_MATRIX_H_ */
