/*
 * IOTools.h
 *
 *  Created on: Oct 4, 2018
 *      Author: claudio
 */

#ifndef UTILS_IOTOOLS_HPP_
#define UTILS_IOTOOLS_HPP_

#include <dirent.h>
#include <cstring>
#include <string>
#include <iostream>
#include <vector>
#include <memory>
#include <thread>
#include <chrono>
#include <ctime>
#include <fstream>
#include <algorithm>
#include <parallel/algorithm>
#include <set>
#include <math.h>
#include <omp.h>
#include "json.hpp"
#include "cxxopts.hpp"
#include <boost/algorithm/string.hpp>
#include <bitset>
#include <unistd.h>
#include <ulimit.h>
#include <sstream>
#include <iomanip>
#include <regex>


using json = nlohmann::json;
using uchar = unsigned char;

namespace imoka { namespace annotation {
class Segment {
public:

	Segment() :
			start(0), end(0) {
	}
	;
	Segment(uint64_t a, uint64_t b) :
			start(a), end(b) {
	}
	;

	uint64_t start;
	uint64_t end;
	bool isOverlapping(const Segment & b) const {
		return isContained(b.start) || isContained(b.end)
				|| b.isContained(start) || b.isContained(end);
	}
	bool isContained(uint64_t p) const {
		return p >= start && p <= end;
	}
	json to_json() {
		return { {"start" ,start}, {"end", end}};
	}
	std::string to_string() const {
		return std::to_string(start) + "-" + std::to_string(end);
	}
	friend bool operator <(const Segment& lhs, const Segment& rhs) {
		return lhs.start == rhs.start ?
				lhs.end < rhs.end : lhs.start < rhs.start;
	}
	friend bool operator ==(const Segment& lhs, const Segment& rhs) {
		return lhs.start == rhs.start && lhs.end == rhs.end;
	}
	friend bool operator !=(const Segment& lhs, const Segment& rhs) {
		return lhs.start != rhs.start || lhs.end != rhs.end;
	}

};
} }
namespace IOTools {

static const std::string alphabet = "ACGT";

static void split(std::vector<std::string> & cont, const std::string & str, const std::string sep="[\\s\\n\\r]+" ){
	std::regex rgx(sep);
	std::sregex_token_iterator iter(str.begin(), str.end(), rgx, -1);
	cont.clear();
	std::regex_token_iterator<std::string::iterator> rend;
	for (std::sregex_token_iterator end; iter != end; ++iter) {
		cont.push_back(iter->str());
	  }
}

static std::vector<std::string> GetDirectoryFiles(std::string dir) {
	std::vector<std::string> files;
	std::shared_ptr<DIR> directory_ptr(opendir(dir.c_str()),
			[](DIR* dir) {dir && closedir(dir);});
	struct dirent *dirent_ptr;
	if (!directory_ptr) {
		std::cout << "GetDirectoryFiles: Error opening : "
				<< std::strerror(errno) << dir << std::endl;
		return files;
	}

	while ((dirent_ptr = readdir(directory_ptr.get())) != nullptr) {
		files.push_back(std::string(dirent_ptr->d_name));
	}
	files.erase(
			std::remove_if(files.begin(), files.end(),
					[](std::string const f) {
						if ( f != ".." && f != "." && f.find(".tmp") == std::string::npos && f.find(".merging") == std::string::npos && f.find(".merged") == std::string::npos) {
							return false;
						}
						return true;
					}), files.end());
	std::sort(files.begin(), files.end(),
			[](std::string const f1, std::string const f2 ) {
				std::ifstream in1(f1.c_str(), std::ifstream::ate | std::ifstream::binary);
				std::ifstream in2(f2.c_str(), std::ifstream::ate | std::ifstream::binary);
				return in1.tellg() < in2.tellg();
			});
	return files;
}

static void copyFile(std::string origin, std::string destination) {
	int r = system(std::string("cp " + origin + " " + destination).c_str());
	if (r != 0) {
		std::cerr << "ERROR! problem in copying " << origin << " to "
				<< destination << "\n";
		exit(r);
	}
}

static std::string format_time(uint64_t seconds) {
	uint64_t h = std::round(seconds / 3600);
	uint64_t m = std::round((seconds % 3600) / 60);
	uint64_t s = std::round((seconds % 60));
	std::stringstream out;
	out << (h < 10 ? "0" : "") << h << ":" << (m < 10 ? "0" : "") << m << ":"
			<< (s < 10 ? "0" : "") << s;
	return out.str();

}

static std::string format_time_human(uint64_t seconds) {
	uint64_t d = std::round(seconds / 86400);
	uint64_t h = std::round((seconds % 86400) / 3600);
	uint64_t m = std::round((seconds % 3600) / 60);
	uint64_t s = std::round((seconds % 60));
	std::stringstream out;
	if (d > 0) {
		out << d << " day" << (d == 1 ? " " : "s ");
	}
	if (h > 0 || d > 0) {
		out << (h < 10 ? "0" : "") << h << " hour" << (h == 1 ? " " : "s ");
	}
	if (m > 0 || h > 0 || d > 0) {
		out << (m < 10 ? "0" : "") << m << " minute" << (m == 1 ? " " : "s ")
				<< "and ";
	}
	out << (s < 10 ? "0" : "") << s << " second" << (s == 1 ? " " : "s ");
	;
	return out.str();

}

static bool fileExists(std::string fname, bool warn = false) {
	std::ifstream f(fname.c_str());
	bool res = f.good();
	f.close();
	if (warn && !res) {
		std::cerr << "WARNING! file " << fname << " doesn't exist.\n";
	}
	return res;
}

static uint64_t parseMatrixHeader(std::string file,
		std::vector<std::string> & outNames,
		std::vector<std::string> & outGroups) {
	std::ifstream fin(file.c_str());
	uint64_t header_lines=0;
	if (!fin) {
		std::cerr << "parseMatrixHeader : Error while opening " << file
				<< " in read mode" << std::endl;
		exit(EXIT_FAILURE);
	}
	std::string line;
	getline(fin, line);
	header_lines++;
	while (line[0] == '#'){
		getline(fin, line);
		header_lines++;
	}
	if (line[0] != '\t') {
		IOTools::split(outGroups, line);
		if (outGroups[0] == "group") {
			outGroups.erase(outGroups.begin());
			for (uint64_t col = 0; col < outGroups.size(); col++)
				outNames.push_back(std::string("col_") + std::to_string(col));
		} else {
			outGroups.erase(outGroups.begin());
			outNames = outGroups;
		}
	} else {
		IOTools::split(outNames, line);
		outNames.erase(outNames.begin());
		getline(fin, line);
		header_lines++;
		IOTools::split(outGroups, line);
		outGroups.erase(outGroups.begin());
	}

	fin.close();
	return header_lines;
}

static uint64_t countFileLines(std::string file) {
	std::ifstream fin(file.c_str());
	if (!fin) {
		std::cerr << "countFileLines: Error while opening " << file
				<< " in read mode" << std::endl;
		exit(EXIT_FAILURE);
	}
	uint64_t count = 0;
	const int SZ = 1024 * 1024;
	std::vector<char> buff(SZ);
	fin.read(&buff[0], buff.size());
	const char * p;
	while (int cc = fin.gcount()) {
		p = &buff[0];
		for (int i = 0; i < cc; i++) {
			if (p[i] == '\n')
				count++;
		}
		fin.read(&buff[0], buff.size());
	}
	fin.close();
	return count;
}

static void printMatrixHeader(std::ostream & of,
		std::vector<std::string> & col_names,
		std::vector<std::string> & col_groups) {
	for (auto it : col_names)
		of << '\t' << it;
	of << '\n' << "group";
	for (auto it : col_groups)
		of << '\t' << it;
	of << '\n';
}

static void printMatrixHeader(std::string file,
		std::vector<std::string> & col_names,
		std::vector<std::string> & col_groups) {
	std::ofstream of(file);
	if (!of) {
		std::cerr << "printMatrixHeader: Error while opening " << file
				<< " in write mode" << std::endl;
		exit(EXIT_FAILURE);
	}
	printMatrixHeader(of, col_names, col_groups);
	of.close();
}

static void concatenateFiles(std::vector<std::string> & files,
		bool remove_others) {
	if (files.size() > 1) {
		std::ofstream outF(files[0].c_str(),
				std::ofstream::out | std::ofstream::app);
		std::ifstream inF;
		std::string line;
		for (uint64_t i = 1; i < files.size(); i++) {
			inF.open(files[i].c_str());
			while (getline(inF, line))
				outF << line << '\n';
			inF.close();
			if (remove_others) {
				if (remove(files[i].c_str()) != 0) {
					std::cerr << "Error removing " << files[i] << "\n";
				}
			}
		}
		outF.flush();
		outF.close();
	}

}

static void makeDir(std::string directory) {
	const int dir_err = system(
			std::string(std::string("mkdir -p ") + directory).c_str());
	if (dir_err != 0) {
		std::cerr << "ERROR: impossible to create the directory \n";
	}
}

static std::string timestamp() {
	time_t now = time(0);
	tm *ltm = localtime(&now);
	return std::to_string(1900 + ltm->tm_year) + std::string("_")
			+ std::to_string(ltm->tm_mon + 1) + std::string("_")
			+ std::to_string(ltm->tm_mday) + std::string("_")
			+ std::to_string(ltm->tm_hour) + std::string("_")
			+ std::to_string(ltm->tm_min) + std::string("_")
			+ std::to_string(ltm->tm_sec);
}

static std::string now(){
	time_t now = time(0);
	tm *ltm = localtime(&now);
	return std::to_string(1900 + ltm->tm_year) + std::string("-")
				+ std::to_string(ltm->tm_mon + 1) + std::string("-")
				+ std::to_string(ltm->tm_mday) + std::string(".")
				+ std::to_string(ltm->tm_hour) + std::string(":")
				+ std::to_string(ltm->tm_min) + std::string(":")
				+ std::to_string(ltm->tm_sec);
}

static std::string getLineFromFile(std::string fname, uint64_t lineN) {
	std::ifstream inFile(fname);
	if (!inFile.good()) {
		std::cerr << "Error! Problem opening " << fname;
		exit(1);
	}
	std::string line;

	int ind = 0;
	getline(inFile, line);
	while (ind != lineN) {
		getline(inFile, line);
		ind++;
	}
	inFile.close();
	return line;
}

static std::vector<std::string> getLinesFromFile(std::string fname) {
	std::ifstream inFile(fname);
	if (!inFile.good()) {
		std::cerr << "Error! Problem opening " << fname;
		exit(1);
	}
	std::vector<std::string> out;
	std::string line;
	while (getline(inFile, line)) {
		out.push_back(line);
	}
	inFile.close();
	return out;
}

static uint64_t KmerToInt(std::string kmer, uint64_t rank = 0) {
	if (kmer.size() == rank) {
		return 0;
	}
	switch (kmer[kmer.size() - rank - 1]) {
	case 'A':
		return KmerToInt(kmer, rank + 1) + 0;
		;
	case 'C':
		return KmerToInt(kmer, rank + 1) + 1 * powl(4, rank);
	case 'G':
		return KmerToInt(kmer, rank + 1) + 2 * powl(4, rank);
	case 'T':
		return KmerToInt(kmer, rank + 1) + 3 * powl(4, rank);
	}
	return 0;
}

static std::string IntToKmer(uint64_t ikmer, uint64_t nbBasePerKmer) {
	std::string result = "";
	int64_t k = nbBasePerKmer - 1;
	std::vector<std::string> letters { "A", "C", "G", "T" };
	while (k >= 0) {
		uint64_t kmin = pow(4, k);
		if (kmin <= ikmer) {
			uint64_t alpha = 3;
			bool statealpha = true;
			while (statealpha) {
				if (ikmer >= (alpha * kmin)) {
					ikmer -= (alpha * kmin);
					statealpha = false;
					result += letters[alpha];
				} else {
					alpha -= 1;
				}
			}
		} else {
			result += letters[0];
		}
		k--;
	}
	return result;
}

static std::vector<uint64_t> generateRandomInts(uint64_t len, uint64_t max) {
	std::vector<uint64_t> result;
	uint64_t toadd = rand() % max;
	result.push_back(toadd);
	if (len > max) {
		std::cerr << "ERROR: impossible to generate " << len
				<< " unique random positive integers [0," << max << ").";
		exit(1);
	} else if (len == max) {
		result.clear();
		for (uint64_t i = 0; i < max; i++)
			result.push_back(i);
	} else {
		while (result.size() < len) {
			while (std::find(result.begin(), result.end(), toadd)
					!= result.end())
				toadd = rand() % max;
			result.push_back(toadd);
		}
	}
	return result;
}

static void printJSON(json data, std::string file) {
	std::ofstream of(file);
	of << data.dump(2) << "\n";
	of.close();
}

static json parseJSON(std::string file) {
	std::ifstream instr(file);
	json out = json::parse(instr);
	instr.close();
	return out;
}

/// Convert a boolean vector in the corresponding kmer:
///
/// A 	False	False
/// C  	False	True
/// G 	True	False
/// T 	True	True
///
/// @param v the input vector
/// @return the kmer
static std::string BoolToKmer(std::vector<bool> v) {
	std::string out;
	out.resize(v.size() / 2);
	for (int i = 0; i < v.size(); i += 2) {
		out[i / 2] =
				v[i] ? (v[i + 1] ? alphabet[3] : alphabet[2]) : (
						v[i + 1] ? alphabet[1] : alphabet[0]);
	}
	return out;
}

/// Convert a kmer vector in the corresponding bool vector:
///
/// A 	False	False
/// C  	False	True
/// G 	True	False
/// T 	True	True
///
/// @param kmer the input kmer
/// @return the output vector
static std::vector<bool> KmerToBool(std::string kmer) {
	std::vector<bool> out(kmer.size() * 2);
	int p = 0;
	for (int i = 0; i < out.size(); i += 2) {
		out[i + 1] = kmer[p] == alphabet[1] || kmer[p] == alphabet[3];
		out[i] = kmer[p] == alphabet[2] || kmer[p] == alphabet[3];
		p++;
	}
	return out;
}

/// From https://stackoverflow.com/questions/29623605/how-to-dump-stdvectorbool-in-a-binary-file

static void binary_write(std::ofstream& fout, const std::vector<bool>& x,
		std::vector<bool>::size_type & n) {
	if (n == 0) {
		n = x.size();
		fout.write((const char*) &n, sizeof(std::vector<bool>::size_type));
	}
	for (std::vector<bool>::size_type i = 0; i < n;) {
		unsigned char aggr = 0;
		for (unsigned char mask = 1; mask > 0 && i < n; ++i, mask <<= 1)
			if (x.at(i))
				aggr |= mask;
		fout.write((const char*) &aggr, sizeof(unsigned char));
	}
}

static void binary_read(std::ifstream& fin, std::vector<bool>& x,
		std::vector<bool>::size_type & n) {
	if (n == 0) {
		fin.read((char*) &n, sizeof(std::vector<bool>::size_type));
	}
	x.resize(n);
	for (std::vector<bool>::size_type i = 0; i < n;) {
		unsigned char aggr;
		fin.read((char*) &aggr, sizeof(unsigned char));
		for (unsigned char mask = 1; mask > 0 && i < n; ++i, mask <<= 1)
			x.at(i) = aggr & mask;
	}
}

static uint64_t getFileSize(std::string in_file) {
	std::ifstream instr(in_file);
	instr.seekg(0, std::ifstream::end);
	uint64_t size = instr.tellg();
	instr.close();
	return size;
}

static std::string exec(std::string cmd) {
	std::array<char, 128> buffer;
	std::string result;
	std::unique_ptr<FILE, decltype(&pclose)> pipe(popen(cmd.c_str(), "r"),
			pclose);
	if (!pipe) {
		throw std::runtime_error("popen() failed!");
	}
	while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
		result += buffer.data();
	}
	return result;
}

// it's the number of sequentitially different nucleotides over the length of the sequence ( sum(kmer[i]!=kmer[i+1])/len(kmer) )
static double kmer_complexity(std::vector<bool> & X) {
	double complexity = 0;
	double n = X.size();
	for (int i = 2; i < n; i += 2) {
		if (X[i] != X[i - 2] || X[i + 1] != X[i - 1])
			complexity += 2;
	}
	return complexity / n;
}

template<typename T>
static void getParameter(json & origin, json & def, std::string key,
		T & destination) {
	if (!origin.is_null()) {
		try {
			destination = origin[key];
			return;
		} catch (const std::exception& e) {
			std::cerr << e.what() <<'\n';
		}
	}
	if (def.is_null()) {
		std::cerr << "ERROR: parameter " << key
				<< " not found any configuration\n";
		exit(1);
	}
	try {
		destination = def[key];
		return;
	} catch (const std::exception& e) {
		std::cerr << "ERROR: " << e.what() << "\n";
		exit(1);
	}
}
static char rev(char c) {
	return c == alphabet[0] ? alphabet[3] : c == alphabet[1] ? alphabet[2] :
			c == alphabet[3] ? alphabet[0] : alphabet[1];
}

static std::string revComp(std::string s) {
	std::string out = "";
	for (int i = s.size() - 1; i >= 0; i--) {
		out += rev(s[i]);
	}
	return out;
}

static void to_lower(std::string & s) {
	std::transform(s.begin(), s.end(), s.begin(), ::tolower);
}

static void to_upper(std::string & s) {
	std::transform(s.begin(), s.end(), s.begin(), ::toupper);
}
static void sort_uniq(std::vector<std::string> & vec) {
	std::sort(vec.begin(), vec.end());
	vec.erase(std::unique(vec.begin(), vec.end()), vec.end());
}

static std::set<std::vector<bool>> generateKmers(std::string s, int k) {
	std::set<std::vector<bool>> out;
	if (s.size() < k)
		return out;
	for (int i = 0; i <= s.size() - k; i++) {
		out.insert(IOTools::KmerToBool(s.substr(i, k)));
	}
	return out;
}

////  prefix_size = sie of prefix bool
static std::pair<std::vector<bool>, std::vector<bool>> splitPrefixSuffix(
		const std::vector<bool> & kmer, int64_t prefix_v_size) {
	std::pair<std::vector<bool>, std::vector<bool>> output;
	output.first.insert(output.first.begin(), kmer.begin(),
			kmer.begin() + prefix_v_size);
	output.second.insert(output.second.begin(), kmer.begin() + prefix_v_size,
			kmer.end());
	return output;
}

static void jointPrefixSuffix(std::vector<bool> & kmer,
		const std::vector<bool> & prefix, const std::vector<bool> & suffix) {
	kmer = prefix;
	kmer.insert(kmer.end(), suffix.begin(), suffix.end());
}

/// Parse s_mem using SI standard (binary representation), in Kibibytes.
/// 1G -> 1 Gibibyte -> 1048576 Kibibytes
/// 1M -> 1 Mebibyte -> 1024 Kibibytes
/// 1K -> 1 Kibibyte
/// @param s_mem
/// @return
static uint64_t parseMemory(std::string s_mem) {
	uint64_t mem = 0;
	std::smatch matches;
	if (std::regex_search(s_mem, matches, std::regex("^([0-9]+)G$"))) {
		mem = std::stoll(matches[1]) * 1048576;
	} else if (std::regex_search(s_mem, matches, std::regex("^([0-9]+)M$"))) {
		mem = std::stoll(matches[1]) * 1024;
	} else if (std::regex_search(s_mem, matches, std::regex("^([0-9]+)K$"))) {
		mem = std::stoll(matches[1]);
	} else if (std::regex_search(s_mem, matches, std::regex("^([0-9]+)$"))) {
		mem = std::stoll(matches[1]);
	}
	return mem;
}

/// Get the memory available in kibibytes.
/// @return
static uint64_t getFreeMemory() {
	std::vector<std::string> v;
	std::string s = IOTools::exec("free -k");
	IOTools::split(v, s);
	return std::stoll(v[10]);
}

/// Get the memory available in kibibytes, conditioned by the ENV variable MAXMEM.
/// If MAXMEM is given as environmental variable, return the minumum between
/// the free memory available and the MAXMEM
/// @return
static uint64_t getConditionedFreeMemory() {
	uint64_t mem = 0;
	if (getenv("MAXMEM") != NULL) {
		std::string s_mem = getenv("MAXMEM");
		mem = IOTools::parseMemory(s_mem);
	}
	uint64_t free_mem = getFreeMemory();
	return mem == 0 || free_mem < mem ? free_mem : mem;
}

static uint64_t getCurrentProcessMemory() {
	return std::stoll(
			IOTools::exec(
					"awk ' /^VmRSS/ { ORS=\"\" ;print $2}' /proc/"
							+ std::to_string(getpid()) + "/status "));
}

static std::string format_space_human(uint64_t space_in_kb) {
	std::stringstream ss;
	ss << std::fixed << std::setprecision(3);
	if (space_in_kb > 1048576) {
		ss <<  space_in_kb / ((double) 1048576) << "Gb";
	} else if (space_in_kb > 1024) {
		ss << space_in_kb / ((double)1024) << "Mb";
	} else {
		ss << space_in_kb << "Kb";
	}
	return ss.str();
}


/// Check if the given arguments require the help.
/// The conditions are: contains the "help" or one of the mandatory arguments is absent.
///
/// @param parsedArgs cxxopts object containing the parsed arguments
/// @param mandatory A list of mandatory  arguments
/// @return bool true if need help, false otherwise
static bool checkArguments(cxxopts::ParseResult parsedArgs, std::vector<std::string> mandatory, std::ostream & log) {
	bool help = parsedArgs.count("help") != 0;
	for (auto m : mandatory) {
		if (parsedArgs.count(m) == 0) {
			help = true;
			log << "ERROR! Missing mandatory argument: " << m << "\n";
		}
	}
	return help;
}

}
#endif /* UTILS_IOTOOLS_HPP_ */
