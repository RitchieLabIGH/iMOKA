/*
 * MatrixCreation.h
 *
 *  Created on: Mar 5, 2019
 *      Author: claudio
 */

#ifndef PROCESS_BINARYMATRIXHANDLER_H_
#define PROCESS_BINARYMATRIXHANDLER_H_
#include "Process.h"
#include "../Matrix/BinaryMatrix.h"
#include "../Utils/Stats.hpp"

namespace imoka {
namespace process {

using namespace matrix;

class BinaryMatrixHandler: public Process {
public:
	BinaryMatrixHandler(std::streambuf *ostream) :
			Process(ostream) {
	}
	;
	virtual ~BinaryMatrixHandler() {
	}
	;
	bool run(int argc, char **argv);
	bool create(std::string input, std::string output, int64_t prefix,
			double rescaling);
	bool dump(std::string input, std::string output, std::string from_k,
			std::string to_k, bool raw, bool write_header = true);
	bool extract(std::string input, std::string source, std::string output,
			bool normalized);
	bool stable(std::string source, std::string outfile, uint64_t max_n);

private:
	template<class T>
	bool _extract(std::string input, std::string source, std::string output) {
		BinaryMatrix bm(true);
		bm.load(source);
		std::ofstream ofs;
		std::streambuf *buf;
		if (output == "stdout") {
			buf = std::cout.rdbuf();
		} else {
			ofs.open(output);
			buf = ofs.rdbuf();
		}
		std::ostream os(buf);
		IOTools::printMatrixHeader(os, bm.col_names, bm.col_groups);
		if (IOTools::fileExists(input)) {
			std::ifstream ifs(input);
			std::string line;
			uint64_t buffer_pos = 0, buffer_size = 100000;
			std::vector<Kmer> buffer(buffer_size);
			std::vector<KmerMatrixLine<T>> lines;
			bool reading = getline(ifs, line) ? true : false;
			while (reading) {
				std::set<Kmer> bline = Kmer::generateKmers(line, bm.k_len);
				if (buffer_pos + bline.size() > buffer_size) {
					buffer_size = buffer_pos + bline.size();
					buffer.resize(buffer_size);
				}

				for (auto &l : bline) {
					buffer[buffer_pos] = l;
					buffer_pos++;
				}

				reading = getline(ifs, line) ? true : false;
				if (!reading || buffer_pos >= buffer_size) {
					buffer.resize(buffer_pos);
					buffer_pos = 0;
					bm.getLines(buffer, lines);
					for (auto &bml : lines) {
						os << bml.getKmer();
						for (auto &v : bml.count)
							os << "\t" << v;
						os << "\n";
					}
					buffer.resize(buffer_size);
				}
			}
		} else {
			IOTools::to_upper(input);
			if (std::regex_match(input, std::regex("^[ATCG]+$"))) {
				std::vector<std::string> request = { input };
				std::vector<KmerMatrixLine<T>> lines;
				bm.getLines(request, lines);
				for (auto &bml : lines) {
					os << bml.getKmer();
					for (auto v : bml.count)
						os << "\t" << v;
					os << "\n";
				}
			} else {
				log << "Input not recognized\n";
				return false;
			}
		}
		ofs.close();
		return true;
	}

	template<class T>
	bool _dump(std::string input, std::string output, std::string from_k,
			std::string to_k, bool write_header = true) {
		BinaryMatrix bm(false);
		bm.load(input);
		std::ofstream ofs;
		std::streambuf *buf;
		std::vector<char> char_buffer(8192);
		if (output == "stdout") {
			buf = std::cout.rdbuf();
		} else {
			ofs.open(output);
			buf = ofs.rdbuf()->pubsetbuf(char_buffer.data(),
					char_buffer.size());
		}
		std::ostream os(buf);
		if (write_header)
			IOTools::printMatrixHeader(os, bm.col_names, bm.col_groups);
		if (from_k != "none") {
			Kmer starting_k(from_k);
			if (starting_k.k_len != bm.k_len) {
				throw "Error! The given k-mer " + from_k
						+ " has a wrong length.";
				log
						<< "Error! The given k-mer " + from_k
								+ " has a wrong length.";
				return false;
			}
			bm.go_to(starting_k);
		}
		KmerMatrixLine<T> line;
		if (to_k != "none") {
			imoka::matrix::Kmer ending_k(to_k);
			while (bm.getLine(line)) {
				if (ending_k < line.getKmer()) {
					break;
				}
				os << line.getKmer();
				for (auto v : line.count)
					os << '\t' << v;
				os << '\n';
			}
		} else {
			while (bm.getLine(line)) {
				os << line.getKmer();
				for (auto v : line.count)
					os << '\t' << v;
				os << '\n';
			}
		}
		os.flush();
		ofs.close();
		bm.clear();
		return true;
	}

};
}
} /* namespace kma */

#endif /* PROCESS_BINARYMATRIXHANDLER_H_ */
