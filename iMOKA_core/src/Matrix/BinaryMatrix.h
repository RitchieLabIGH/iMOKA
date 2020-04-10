/*
 * JFMatrix.h
 *
 *  Created on: Feb 4, 2019
 *      Author: claudio
 */

#ifndef MATRIX_BINARYMATRIX_H_
#define MATRIX_BINARYMATRIX_H_

#include "BinaryDB.h"
#include "Matrix.h"

namespace imoka {
namespace matrix {
class BinaryMatrix : public Matrix {
public:
	BinaryMatrix();
	BinaryMatrix(std::string file, bool normalize = true, bool query_mode=false) {
		normalized = normalize;
		load(file, query_mode);
	}
	;
	virtual ~BinaryMatrix();
	void load(std::string jsonHeader, bool query_mode=false);
	void save(std::string jsonHeader);
	void create(std::string inputFile, double rescale_f = 1, int64_t prefix_size=-1);
	void clear();
	bool getBatch(std::vector<KmerMatrixLine> & buffer, uint64_t length);

	virtual bool getLine(KmerMatrixLine & jfl);

	double perc();
	std::vector<KmerMatrixLine> getLines(std::vector<std::string> & request);
	void getLines(std::vector<std::string> & request, std::vector<KmerMatrixLine> & response);
	std::vector<KmerMatrixLine> getLines(std::vector<Kmer> & request);
	void getLines(std::vector<Kmer> & request, std::vector<KmerMatrixLine> & response);
	bool isNormalized() {
		return normalized;
	};
	bool go_to(Kmer & );
	void setNormalized(bool n) {
		normalized = n;
	}
	;
	void setRescalingFactor(uint64_t rf) {
		rescale_factor = rf;
	}
	;
	void setBinaryDbsBuffer(uint64_t bdbb) {
		if ( isOpen() ){
			std::cerr << "Error! Set the total space before open the matrix.";
		}else {
			binary_db_buffer = bdbb;
		}

	}
	std::vector<uint64_t> total_counts;
	std::vector<double> normalization_factors;
	std::vector<BinaryDB> bin_databases;
	bool isOpen(){
		for (auto & db : bin_databases ){
			if ( db.isOpen() ) return true;
		}
		return false;
		}

private:
	bool normalized = true;

	double rescale_factor = 1;
	uint64_t current_line = 0;
	uint64_t binary_db_buffer=1000;
	std::set<Kmer> current_kmers;
	void initKmerVector(int64_t prefix_size);
	void initDBs();
	bool query_mode=false;
	uint64_t file_len;
	uint64_t n_of_bd;
};
}
}
#endif /* MATRIX_BINARYMATRIX_H_ */
