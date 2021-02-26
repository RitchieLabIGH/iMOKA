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
	IOTools::getParameter(user_conf["aligner"], def_conf["aligner"], "io_order", io_order);
	IOTools::getParameter(user_conf["aligner"], def_conf["aligner"], "output_type", output_type);
	int r = system(std::string("command -v " + command +" > /dev/null ").c_str());
	if ( r != 0 ){
		error_message ="Error! command " + command + " not found!.";
	}


}

bool Mapper::isCommentLine(std::string line ){
	if ( output_type == "sam"){
		return line[0] == '#' || line[0] == '@';
	} else if ( output_type == "pslx"){
		return std::string("0123456789").find(line[0]) == std::string::npos;
	}else {
		return true;
	}
}
std::string Mapper::align(std::string in_file) {
	std::string out_file;
	out_file = in_file + "."+output_type;
	if ( IOTools::fileExists(out_file) ){
		return out_file;
	}
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
		std::string io="";
		if ( io_order == "oi"){
			io =  flag_out_file + " " + out_file + " "+flag_in_file + " " + in_file + " ";
		} else {
			io = flag_in_file + " " + in_file + " " +flag_out_file + " " + out_file + " ";
		}
		cmd = command + " " + options + " " + multithread_opts + " " + io + " >> "+  out_file
									+ ".out " + " 2>> " +  out_file
									+ ".err " ;

	}
	int r = system(cmd.c_str());
	if (r != 0) {
		std::cerr << "ERROR! : impossible to run the command \n" << cmd
				<< "\n";
		exit(r);
	}
	return out_file;
}
}
