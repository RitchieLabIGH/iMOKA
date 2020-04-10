/*
 * Process.h
 *
 *  Created on: Sep 24, 2019
 *      Author: claudio
 */

#ifndef PROCESS_PROCESS_H_
#define PROCESS_PROCESS_H_

#include "../Utils/IOTools.hpp"

namespace imoka {
namespace process {
/* General process interface
 *
 */
class Process {
public:
	Process(std::streambuf * messages):log(messages){};
	virtual ~Process(){};
	virtual bool run(int argc, char** argv){return false;};
protected:
	std::ostream log;
};
}
} /* namespace imoka */

#endif /* PROCESS_PROCESS_H_ */
