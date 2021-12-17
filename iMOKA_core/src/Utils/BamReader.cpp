/*
 * BamReader.cpp
 *
 *  Created on: Nov 18, 2021
 *      Author: claudio
 */

#include "BamReader.h"

namespace imoka {

BamReader::BamReader() :
		instream(std::cin.rdbuf()) {
	cShortPairs = 0;
	cIntersectPairs = 0;
	cLongPairs = 0;
	cSingleReads = 0;
	cPairedReads = 0;
	cErrorReads = 0;
	cSkippedReads = 0;
}

// OK.
void BamReader::readBamHeader() {
	char buffer[1000];
	std::string chrName;
	//std::vector<std::string> chr_names;
	bam_header bamhead;

	IN->read(bamhead.c, BAM_HEADER_BYTES);

	//IN->ignore(bamhead.l_text);
	char headertext[bamhead.l_text + 1];
	IN->read(headertext, bamhead.l_text);
	samHeader = std::string(headertext, bamhead.l_text);
	coord_sorted = samHeader.find("SO:coordinate") != std::string::npos;
	stream_int32 i32;
	IN->read(i32.c, 4);
	uint n_chr = i32.i;

	for (uint i = 0; i < n_chr; i++) {
		IN->read(i32.c, 4);
		IN->read(buffer, i32.i);
		chrName = std::string(buffer, i32.i - 1);
		chr_names.push_back(chrName);

		IN->read(i32.c, 4);
		chr_lens.push_back(i32.i);
	}

}

unsigned int BamReader::processPair(bam_read_core &read1,
		bam_read_core &read2) {
	for (auto &callback : callbacksProcess) {
		callback(read1, read2);
	}
	return read1.l_seq + read2.l_seq;
}

unsigned int BamReader::processSingle(bam_read_core &read1) {
	for (auto &callback : callbacksProcess) {
		callback(read1, empty_read);
	}
	return read1.l_seq;
}

void BamReader::setMate(std::vector<char> &mate) {
	uint64_t i = 0, j = 0;
	while (i < BAM_READ_CORE_BYTES) {
		tmp_mate.c[j++] = mate[i++];
	}

	j = 0;
	while (i < BAM_READ_CORE_BYTES + tmp_mate.l_read_name) {
		tmp_mate.read_name[j++] = mate[i++];
	}
	j = 0;
	while (i < mate.size()) {
		tmp_mate.cigar_buffer[j++] = mate[i++];
	}
}
void BamReader::saveMate() {
	std::vector<char> mate;
	for (int i = 0; i < BAM_READ_CORE_BYTES; i++) {
		mate.push_back(tmp_read.c[i]);
	}
	for (int i = 0; i < tmp_read.l_read_name; i++) {
		mate.push_back(tmp_read.read_name[i]);
	}
	for (int i = 0; i < tmp_read.n_cigar_op * 4; i++) {
		mate.push_back(tmp_read.cigar_buffer[i]);
	}
	tmp_reads[getName(tmp_read)] = mate;
}

std::string BamReader::getName(bam_read_core &read) {
	std::string name = "";
	for (int i = 0; i < read.l_read_name; i++) {
		name += read.read_name[i];
	}
	return name;
}

int BamReader::processAll() {

	totalNucleotides = 0;
	current_read = 0;
	//int bytesread = 0;
	bool running = getNextReadHead(tmp_read);
	while (running) {
		current_read++;
		if (IN->fail()) {
			if (! IN->eof() ){
				errorMessage();
				return (1);
			}
			running = false;
			//This is possibly also just about the end of the file (say an extra null byte).
			//IN->gcount() knows how many characters were actually read last time.
		} else {
			if (!(tmp_read.flag & 0x1) || !(tmp_read.flag & 0x2)
					|| (tmp_read.flag & 0x8)) {
				/* If is a single read ( or mate is unmapped or are not mapped in a proper way ) -- process it as a single -- then discard/overwrite */
				getReadBody(tmp_read);
				cSingleReads++;
				totalNucleotides += processSingle(tmp_read);
			} else {
				/* If it is potentially a paired read, store it in our buffer, process the pair together when it is complete */
				getReadBody(tmp_read);
				if (coord_sorted) {
					std::string name = getName(tmp_read);
					if (tmp_reads.count(name) == 1) {
						setMate(tmp_reads[name]);
						handlePairs(tmp_mate, tmp_read);
						tmp_reads.erase(name);
					} else {
						saveMate();
					}
				} else {
					current_read++;
					running = getNextReadHead(tmp_mate);
					if (running) {
						getReadBody(tmp_mate);
						handlePairs(tmp_read, tmp_mate);
					}
				}
			}
			running = getNextReadHead(tmp_read);
		}

	}
	if (coord_sorted && tmp_reads.size() > 0) {
		std::cerr << "WARNING! " << tmp_reads.size()
				<< " reads have no mates. Processed a single end." << std::endl;
		for (auto &pair : tmp_reads) {
			cSingleReads++;
			setMate(pair.second);
			totalNucleotides += processSingle(tmp_mate);
		}
	}
	std::cout << "Total reads processed: " << current_read - 1 << std::endl;
	std::cout << "Total nucleotides: " << totalNucleotides << std::endl;
	std::cout << "Total singles processed: " << cSingleReads << std::endl;
	std::cout << "Total pairs processed: "
			<< cShortPairs + cIntersectPairs + cLongPairs << std::endl;
	std::cout << "Short pairs: " << cShortPairs << std::endl;
	std::cout << "Intersect pairs: " << cIntersectPairs << std::endl;
	std::cout << "Long pairs: " << cLongPairs << std::endl;
	std::cout << "Skipped reads: " << cSkippedReads << std::endl;
	for (auto reason : skippedReason) {
		std::cout << " - flag " << reason.first << ": " << reason.second
				<< std::endl;
	}
	std::cout << "Error reads: " << cErrorReads << std::endl;
	return (0);
}

void BamReader::errorMessage() {
	std::cerr << "Input error at line:" << current_read << std::endl;
	std::cerr << "Characters read on last read call:" << IN->gcount()
			<< std::endl;
	std::cerr << "EOF: " << (IN->eof() ? "Yes" : "No") << std::endl;
	std::cout << "ERR-Total reads processed: " << current_read - 1 << std::endl;
	std::cout << "ERR-Total nucleotides: " << totalNucleotides << std::endl;
	std::cout << "ERR-Total singles processed: " << cSingleReads << std::endl;
	std::cout << "ERR-Total pairs processed: "
			<< cShortPairs + cIntersectPairs + cLongPairs << std::endl;
	std::cout << "ERR-Short pairs: " << cShortPairs << std::endl;
	std::cout << "ERR-Intersect pairs: " << cIntersectPairs << std::endl;
	std::cout << "ERR-Long pairs: " << cLongPairs << std::endl;
	std::cout << "ERR-Skipped reads: " << cSkippedReads << std::endl;
	for (auto reason : skippedReason) {
		std::cout << " - flag " << reason.first << ": " << reason.second
				<< std::endl;
	}
	std::cout << "ERR-Error reads: " << cErrorReads << std::endl;
}

void BamReader::handlePairs(bam_read_core &read, bam_read_core &mate) {
	if (read.refID == mate.refID && read.l_read_name == mate.l_read_name
			&& strncmp(read.read_name, mate.read_name, read.l_read_name) == 0) {
		if (read.pos <= mate.pos) {
			totalNucleotides += processPair(read, mate);
		} else {
			totalNucleotides += processPair(mate, read);
		}
		cPairedReads++;
	} else {
		std::cout << " A: " << getName(read) << " B: " << getName(mate) << "\n";
		cErrorReads++;
		// Now this should never happend
	}
}

bool BamReader::getNextReadHead(bam_read_core &read) {
	if (IN->eof()) {
		return false;
	}
	IN->read(read.c, BAM_READ_CORE_BYTES);
	read.empty = false;
	if ((tmp_read.flag & 0x900)) {
		IN->ignore(read.block_size - BAM_READ_CORE_BYTES + 4);
		if (skippedReason.count(tmp_read.flag) == 0) {
			skippedReason[tmp_read.flag] = 1;
		} else {
			skippedReason[tmp_read.flag]++;
		}
		cSkippedReads++;
		return getNextReadHead(read);
	}
	return true;
}

void BamReader::getReadBody(bam_read_core &read) {
	IN->read(read.read_name, read.l_read_name);
	IN->read(read.cigar_buffer, read.n_cigar_op * 4);
	IN->read(read.sequence, std::ceil((read.l_seq + 1) / 2));
	IN->read(read.quality, read.l_seq);
	read.aux_len = read.block_size - BAM_READ_CORE_BYTES + 4 - read.l_read_name
			- (read.n_cigar_op * 4) - std::ceil((read.l_seq + 1) / 2)
			- read.l_seq;
	IN->read(read.auxiliary, read.aux_len);
}

void BamReader::openFile(std::istream *_IN) {
	IN = _IN;
	readBamHeader(); // readBamHeader needs to call the ChrMappingChange callbacks.
}

void BamReader::openFile(std::string in_file) {
	file.open(in_file, std::ios::binary);
	inbuf.empty();
	inbuf.push(boost::iostreams::gzip_decompressor());
	inbuf.push(file);
	//Convert streambuf to istream
	instream.rdbuf(&inbuf);
	IN = &instream;
	readBamHeader();
}

void BamReader::registerCallbackProcess(
		std::function<void(bam_read_core&, bam_read_core&)> callback) {
	callbacksProcess.push_back(callback);
}
} /* namespace imoka */
