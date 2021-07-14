/*
 * TextMatrix.h
 *
 *  Created on: Jun 18, 2019
 *      Author: claudio
 */

#ifndef MATRIX_TEXTMATRIX_H_
#define MATRIX_TEXTMATRIX_H_
#include "Matrix.h"


namespace imoka {
namespace matrix {

using TextMatrixLine = KmerMatrixLine<double>;

/// Read a matrix in text format
class TextMatrix  : public Matrix {
public:
	TextMatrix(){
		stream.rdbuf()->pubsetbuf(buffer, BufferSize);
	};
	TextMatrix(std::string file){
		stream.rdbuf()->pubsetbuf(buffer, BufferSize);
		open(file);
	};
	virtual bool getLine(TextMatrixLine &);
	std::vector<TextMatrixLine> getLines();
	void open(std::string file);
	void reset();
	json infos;
private:
	bool next();
	bool is_open=false;
	std::string matrix_file;
	int header_lines;
	uint64_t index=0;
	std::string line;
	std::ifstream stream;
	size_t pointer_start;
	std::vector<std::string> content;
	enum { BufferSize = 16184 };
	char buffer[BufferSize];
};
}
}
#endif /* MATRIX_TEXTMATRIX_H_ */
