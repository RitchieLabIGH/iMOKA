/*
 * SingleCellDecomposition.h
 *
 *  Created on: Nov 18, 2021
 *      Author: claudio
 */

#ifndef PROCESS_SINGLECELLDECOMPOSITION_H_
#define PROCESS_SINGLECELLDECOMPOSITION_H_


#include "Process.h"
#include "../Utils/IOTools.hpp"
#include "../Matrix/BinaryMatrix.h"
#include "../Matrix/TextMatrix.h"
#include "../Utils/BamReader.h"
#include "../Utils/FastqReader.h"
#include "../SingleCellDecomposition/SplitBamRead.h"
#include <regex>

namespace imoka {
namespace process {
/*
 *
 */
class SingleCellDecomposition : public Process  {
public:
	SingleCellDecomposition(std::streambuf * messagebuf):Process(messagebuf){};
	virtual ~SingleCellDecomposition(){};
	bool run(int argc, char** argv);
	bool learn(std::string input_folder, std::string output_folder, int k_len, std::string cluster );
	bool decompose(std::string input_folder, std::string output_folder, std::string paired, std::string counts, int augmentation, int shift);
};
} /* namespace process */
} /* namespace imoka */

#endif /* PROCESS_SINGLECELLDECOMPOSITION_H_ */
