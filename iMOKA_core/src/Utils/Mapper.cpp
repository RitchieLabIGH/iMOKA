/*
 * BLAT.cpp
 *
 *  Created on: Feb 25, 2019
 *      Author: claudio
 */

#include "Mapper.h"

namespace imoka {
void Mapper::setup(json user_conf, json def_conf) {
	IOTools::getParameter(user_conf["aligner"], def_conf["aligner"], "command", command);
	IOTools::getParameter(user_conf["aligner"], def_conf["aligner"], "options", options);
	IOTools::getParameter(user_conf["aligner"], def_conf["aligner"], "flag_in", flag_in_file);
	IOTools::getParameter(user_conf["aligner"], def_conf["aligner"], "flag_out", flag_out_file);
	IOTools::getParameter(user_conf["aligner"], def_conf["aligner"], "flag_multi_thread", flag_multi_thread);
	IOTools::getParameter(user_conf["aligner"], def_conf["aligner"], "parallel", threads);
	int r = system(std::string("command -v " + command).c_str());
	if ( r != 0 ){
		error_message ="Error! command " + command + " not found!.";
	}


}

std::string Mapper::align(std::string in_file) {
	std::string out_file;
	out_file = in_file + ".sam";
	if (threads==-1){
		threads = omp_get_max_threads();
	}
	std::string multithread_opts = (
			flag_multi_thread != "" ?
					(flag_multi_thread + " " + std::to_string(threads)) : "");
	std::string cmd;
	if (flag_out_file == ">") {
		cmd = command + " " + options + " " + multithread_opts + " "
				+ flag_in_file + " " + in_file + " > " + out_file + " 2>> "
				+ out_file + ".err && rm "+out_file+".err ";
	} else {
		cmd = command + " " + options + " " + multithread_opts + " "
				+ flag_out_file + " " + out_file + " " + flag_in_file + " "
				+ in_file + " >> "+  out_file
				+ ".out " + " 2>> " +  out_file
				+ ".err && rm "+out_file+".err "+out_file+".out " ;
	}
	std::cerr << "###[DEBUG]: " << cmd << "\n";
	int r = system(cmd.c_str());
	if (r == -1) {
		std::cerr << "ERROR! : impossible to start the command \n" << cmd
				<< "\n";
		exit(r);
	}
	return out_file;
}
}
