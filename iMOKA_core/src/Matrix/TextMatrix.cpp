/*
 * TextMatrix.cpp
 *
 *  Created on: Jun 18, 2019
 *      Author: claudio
 */

#include "TextMatrix.h"
namespace imoka {
namespace matrix {
bool TextMatrix::getLine(TextMatrixLine & ml) {
	if (!next())
		return false;
	ml.index = index;
	ml.setName(content[0]);
	ml.count.resize(content.size() - 1);
	for ( int i=1; i<content.size(); i++){
		try {
			ml.count[i-1]=std::stod(content[i]);
		} catch (std::exception& e ){
			std::cerr << e.what() << "\n";
			ml.count[i-1]=0;
		}
	}
	index++;
	return true;
}

void TextMatrix::open(std::string file) {
	header_lines= IOTools::parseMatrixHeader(file, col_names, col_groups);
	if (IOTools::getLineFromFile(file, 0)[0] == '#'){
		infos = IOTools::getLineFromFile(file, 0).substr(1);
	}
	initGroupMaps();
	content.resize(col_names.size());
	matrix_file = file;
	reset();
}

bool TextMatrix::next() {
	if (is_open && getline(stream, line)) {
		IOTools::split(content, line ,  '\t');
		return true;
	}
	return false;
}

std::vector<TextMatrixLine> TextMatrix::getLines() {
	reset();
	TextMatrixLine ml;
	std::vector<TextMatrixLine> out;
	while (getLine(ml)) {
		out.push_back(ml);
	}
	return out;
}

void TextMatrix::reset(){
	if ( stream.is_open() ) stream.close();
	stream.open(matrix_file);
	for ( int i=0; i < header_lines ;i++ ){
		is_open= getline(stream, line) ? true : false;
	}
	if (! is_open) {
		std::cerr << "ERROR: matrix has no rows.\n";
	}
	index = 0;
}
}
}
