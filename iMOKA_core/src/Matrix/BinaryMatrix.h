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
class BinaryMatrix: public Matrix {
public:
	BinaryMatrix();
	BinaryMatrix(std::string file) {
		load(file);
	}
	;
	virtual ~BinaryMatrix();
	void load(std::string jsonHeader);
	void save(std::string jsonHeader);
	void create(std::string inputFile, double rescale_f = 1,
			int64_t prefix_size = -1);
	void clear();

	std::vector<Kmer> getPartitions(uint64_t n);
	virtual bool getLine(KmerMatrixLine<double> &jfl);
	virtual bool getLine(KmerMatrixLine<uint32_t> &jfl);
	std::string source_file;
	double perc();

	std::vector<KmerMatrixLine<uint32_t>> getLines(
			std::vector<std::string> &request) {
		std::vector<KmerMatrixLine<uint32_t>> out;
		getLines(request, out);
		return out;
	}
	std::vector<KmerMatrixLine<double>> getNormalizedLines(
			std::vector<std::string> &request) {
		std::vector<KmerMatrixLine<double>> out;
		getLines(request, out);
		return out;
	}

	template<class T>
	void getLines(std::vector<std::string> &request,
			std::vector<KmerMatrixLine<T>> &response) {
		std::vector<Kmer> brv;
		for (auto r : request) {
			std::set<Kmer> req = Kmer::generateKmers(r, k_len);
			brv.insert(brv.end(), req.begin(), req.end());
		}
		getLines(brv, response);
	}

	template<class T>
	std::vector<KmerMatrixLine<T>> getLines(std::vector<Kmer> &request) {
		std::vector<KmerMatrixLine<T>> out;
		getLines(request, out);
		return out;
	}

	void getLines(std::vector<Kmer> &request,
			std::vector<KmerMatrixLine<double>> &response);
	void getLines(std::vector<Kmer> &request,
			std::vector<KmerMatrixLine<uint32_t>> &response);
	void getLine(Kmer &request,
			KmerMatrixLine<uint32_t> &response );
	template<class T>
	bool getBatch(std::vector<KmerMatrixLine<T>> &buffer, uint64_t l) {
		uint64_t row;
		buffer.resize(l);
		for (row = 0; row < l; row++) {
			if (!getLine(buffer[row])) {
				buffer.resize(row);
				break;
			}
		}
		if (row == 0)
			return false;
		return true;
	}

	uint32_t getMaxRawCount(KmerMatrixLine<double> &line) {
		uint32_t max = std::round(line.count[0] * normalization_factors[0]);
		for (uint32_t i = 1; i < line.count.size(); i++) {
			if (line.count[i] * normalization_factors[i] > max) {
				max = std::round(line.count[i] * normalization_factors[i]);
			}
		}
		return max;
	}



	bool go_to(Kmer&);

	void setRescalingFactor(uint64_t rf) {
		rescale_factor = rf;
	}
	;
	void setBinaryDbsBuffer(uint64_t bdbb) {
		if (isOpen()) {
			std::cerr << "Error! Set the total space before open the matrix.";
		} else {
			custom_buffer_size=true;
			binary_db_buffer = bdbb;
		}
	}
	bool custom_buffer_size=false;
	std::vector<uint64_t> total_counts;
	std::vector<double> normalization_factors;
	std::vector<BinaryDB> bin_databases;
	bool isOpen() {
		for (auto &db : bin_databases) {
			if (db.isOpen())
				return true;
		}
		return false;
	}

private:

	double rescale_factor = 1;
	uint64_t current_line = 0;
	uint64_t binary_db_buffer = 1000;
	std::set<Kmer> current_kmers;
	void initKmerVector(int64_t prefix_size);
	void initDBs();
	uint64_t file_len;
	uint64_t n_of_bd;
}
;
}
}
#endif /* MATRIX_BINARYMATRIX_H_ */
