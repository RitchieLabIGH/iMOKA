/*
 * Mapper.h
 *
 *  Created on: Feb 25, 2019
 *      Author: claudio
 */

#ifndef UTILS_MAPPER_H_
#define UTILS_MAPPER_H_

#include "IOTools.hpp"
namespace imoka {
class Mapper {
public:
	Mapper() {
	}
	;
	Mapper(json user_conf, json def_conf) {
		setup(user_conf, def_conf);
	}
	virtual ~Mapper() {
	}
	;
	void setup(json, json);
	bool isInit() {
		return error_message.size() == 0;
	}
	std::string align(std::string);
	std::string error_message = "";
	std::string output_type="sam";
	int64_t threads=-1;
	std::string flag_multi_thread;

private:

	/// Other mapper
	std::string command;
	std::string options;
	std::string flag_in_file;
	std::string flag_out_file;


	std::string log_base;

	json user_conf;
	json def_conf;
};
}
#endif /* UTILS_MAPPER_H_ */
