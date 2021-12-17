/*
 * FastqReader.h
 *
 *  Created on: Nov 19, 2021
 *      Author: claudio
 */

#ifndef UTILS_FASTQREADER_H_
#define UTILS_FASTQREADER_H_

#include "IOTools.hpp"
#include <boost/iostreams/filtering_streambuf.hpp>
#include <boost/iostreams/copy.hpp>
#include <boost/iostreams/filter/gzip.hpp>


namespace imoka {

/*
 *
 */

struct FastqRead{
	bool empty = true;
	std::string name;
	std::string sequence;
	std::string info;
	std::string quality;
};

class FastqReader {
private:
	std::istream *IN;
	std::istream instream;
	std::ifstream file;
	boost::iostreams::filtering_streambuf<boost::iostreams::input> inbuf;
	uint64_t file_dimension=1;
	uint64_t read_n=0;
	bool is_gz=false;
	bool is_open=false;
	bool getLine(std::string & );
public:
	FastqReader() : instream(std::cin.rdbuf()){};
	virtual ~FastqReader(){};
	void open(std::string file);
	void close(){
		inbuf.empty();
		IN->clear();
		file.close();
		is_open=false;
	}
	FastqRead getRead();
	bool getRead(FastqRead & );
	uint64_t getReadNumber(){return read_n;};
};

} /* namespace imoka */

#endif /* UTILS_FASTQREADER_H_ */
