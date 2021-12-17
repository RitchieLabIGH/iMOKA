/*
 * FastqReader.cpp
 *
 *  Created on: Nov 19, 2021
 *      Author: claudio
 */

#include "FastqReader.h"

namespace imoka {

void FastqReader::open(std::string fq_file) {
	if (is_open) {
		close();
	}
	is_gz = fq_file.find(".gz") == fq_file.size() - 3;
	if (is_gz) {
		file.open(fq_file, std::ios::binary | std::ios::in);
		inbuf.empty();
		inbuf.push(boost::iostreams::gzip_decompressor());
		inbuf.push(file);
		//Convert streambuf to istream
		instream.rdbuf(&inbuf);
		IN = &instream;
	} else {
		file.open(fq_file, std::ios::in);
		inbuf.empty();
		inbuf.push(file);
		instream.rdbuf(&inbuf);
		IN = &instream;
	}
	is_open = true;
	read_n=0;
}

bool FastqReader::getRead(FastqRead &out) {
	if (!is_open)
		return false;
	if (!getLine(out.name)) {
		return false;
	}
	if (!getLine(out.sequence)) {
		return false;
	}
	if (!getLine(out.info)) {
		return false;
	}
	if (!getLine(out.quality)) {
		return false;
	}
	read_n++;
	return true;
}

FastqRead FastqReader::getRead() {
	FastqRead out;
	getRead(out);
	return out;
}

bool FastqReader::getLine(std::string & out){
	if ( IN->eof() ) return false;
	if (std::getline(*IN, out)) return true;
	return false;

}

} /* namespace imoka */
