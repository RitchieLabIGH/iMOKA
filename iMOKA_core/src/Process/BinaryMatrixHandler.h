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

namespace imoka {
namespace process {
class BinaryMatrixHandler : public Process {
public:
	BinaryMatrixHandler(std::streambuf * ostream):Process(ostream){};
	virtual ~BinaryMatrixHandler(){};
	bool run(int argc, char** argv);
	bool create(std::string input, std::string output, int64_t prefix, double rescaling );
	bool dump(std::string input, std::string output,std::string from_k , std::string to_k , bool raw, bool write_header = true);
	bool extract(std::string input,std::string source, std::string output,  bool normalized);
};
}
} /* namespace kma */

#endif /* PROCESS_BINARYMATRIXHANDLER_H_ */
