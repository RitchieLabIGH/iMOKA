/*
 * MatrixCreation.cpp
 *
 *  Created on: Mar 5, 2019
 *      Author: claudio
 */

#include "BinaryMatrixHandler.h"

namespace imoka {
namespace process {

using namespace matrix;

bool BinaryMatrixHandler::run(int argc, char** argv) {
	try {
		cxxopts::Options options("KMA", "Binary matrix handler");
		if (std::string(argv[1]) == "create") {
			options.add_options()("i,input",
					"Input tsv file containing the informations in three columns:\n\t\t\t[file][id][group]",
					cxxopts::value<std::string>())("o,output",
					"Output JSON file", cxxopts::value<std::string>())(
					"p,prefix-size",
					"The prefix size to use in the binary databases. Default will compute the best size.",
					cxxopts::value<int64_t>()->default_value("-1"))("h,help",
					"Show this help")("r,rescaling", "Rescaling factor",
					cxxopts::value<double>()->default_value("1e9"));
			auto parsedArgs = options.parse(argc, argv);
			if (!IOTools::checkArguments(parsedArgs, { "input", "output" },
					log)) {
				return create(parsedArgs["input"].as<std::string>(),
						parsedArgs["output"].as<std::string>(),
						parsedArgs["p"].as<int64_t>(),
						parsedArgs["rescaling"].as<double>());
			}

		}

		if (std::string(argv[1]) == "extract") {
			options.add_options()("i,input",
					"Sequence to extract or file containing a list of features to extract",
					cxxopts::value<std::string>())("o,output",
					"Output matrix file",
					cxxopts::value<std::string>()->default_value("stdout"))(
					"s,source",
					"The source from where extract the features (JSON header file)",
					cxxopts::value<std::string>())("r,raw",
					"Get the raw counts instead of the ones rescaled with the values in the JSON header file")(
					"h,help", "Show this help");
			auto parsedArgs = options.parse(argc, argv);
			bool help = IOTools::checkArguments(parsedArgs,
					{ "input", "source" }, log);
			if (!help) {
				return extract(parsedArgs["input"].as<std::string>(),
						parsedArgs["source"].as<std::string>(),
						parsedArgs["output"].as<std::string>(),
						parsedArgs.count("raw") == 0);
			}
		}
		if (std::string(argv[1]) == "dump") {
			options.add_options()("i,input", "JSON header file",
					cxxopts::value<std::string>())("o,output",
					"Output matrix file",
					cxxopts::value<std::string>()->default_value("stdout"))(
					"f,from-kmer", "Start the dump from a given k-mer",
					cxxopts::value<std::string>()->default_value("none"))(
					"t,to-kmer", "End the dump to a given k-mer",
					cxxopts::value<std::string>()->default_value("none"))(
					"r,raw",
					"Get the raw counts instead of the ones rescaled with the values in the JSON header file")(
					"h,help", "Show this help");
			auto parsedArgs = options.parse(argc, argv);
			bool help = IOTools::checkArguments(parsedArgs, { "input" }, log);
			if (!help) {
				if (parsedArgs["output"].as<std::string>() == "stdout"
						|| parsedArgs["from-kmer"].as<std::string>() != "none"
						|| parsedArgs["to-kmer"].as<std::string>() != "none") {
					return dump(parsedArgs["input"].as<std::string>(), parsedArgs["output"].as<std::string>(), parsedArgs["from-kmer"].as<std::string>() ,
							parsedArgs["to-kmer"].as<std::string>(), parsedArgs.count("raw") == 0);
				} else {
					std::string input_matrix = parsedArgs["input"].as<
							std::string>();
					BinaryMatrix bm(input_matrix);
					const uint64_t k_len = bm.k_len, batch_size = std::floor(
							((std::pow(4, bm.k_len))-1) / omp_get_max_threads());
					bm.clear();
#pragma omp parallel
					{
						std::string out_file = parsedArgs["output"].as<
								std::string>();
						if ( omp_get_thread_num() != 0 ){
							out_file += std::to_string(omp_get_thread_num());
						}
						uint64_t a = omp_get_thread_num() * batch_size, b =
								((omp_get_thread_num() + 1) * batch_size) - 1;
						Kmer kmer_from(k_len, a);
						Kmer kmer_to(k_len, b);
						dump(input_matrix, out_file, kmer_from.str(),
								kmer_to.str(), parsedArgs.count("raw") == 0, omp_get_thread_num() == 0);
					}
					std::string ofile = parsedArgs["output"].as<
													std::string>();
					std::ofstream ofs(ofile, std::ofstream::app | std::ofstream::out);
					for ( int i = 1; i < omp_get_max_threads(); i++ ){
						std::ifstream ifs(ofile + std::to_string(i));
						ofs << ifs.rdbuf();
						ifs.close();
						if ( remove(std::string(ofile + std::to_string(i)).c_str()) != 0 ) {
							std::cerr << "Error removing " << ofile << i << "\n";
						}
					}
					ofs.close();
					return true;

				}
			}
		}
		log << options.help() << "\n";
		return false;
	} catch (const cxxopts::OptionException& e) {
		log << "error parsing options: " << e.what() << std::endl;
		return false;
	}

}

/// Dump a matrix in text format in alphabetic order
/// You can restrict the dump from k-mer a to k-mer b.
///
/// @param input The matrix header (json file)
/// @param output A destination file. Use "stdout" if you want to output in the standard output.
/// @param kmer_a
/// @param kmer_b
/// @param normalized True will get you the normalized data, false the original k-mer counts.
/// @return true if the dump ended correctly
bool BinaryMatrixHandler::dump(std::string input, std::string output,
		std::string from_k, std::string to_k, bool normalized, bool write_header ) {
	BinaryMatrix bm;
	bm.setNormalized(normalized);
	bm.load(input);
	std::ofstream ofs;
	std::streambuf * buf;
	std::vector<char> char_buffer(8192);
	if (output == "stdout") {
		buf = std::cout.rdbuf();
	} else {
		ofs.open(output);
		buf = ofs.rdbuf()->pubsetbuf(char_buffer.data(), char_buffer.size());
	}
	std::ostream os(buf);
	if (write_header) IOTools::printMatrixHeader(os, bm.col_names, bm.col_groups);
	KmerMatrixLine line;
	if (from_k != "none") {
		Kmer starting_k(from_k);
		if (starting_k.k_len != bm.k_len) {
			throw "Error! The given k-mer " + from_k + " has a wrong length.";
			log << "Error! The given k-mer " + from_k + " has a wrong length.";
			return false;
		}
		bm.go_to(starting_k);
	}
	if (to_k != "none") {
		Kmer ending_k(to_k);
		while (bm.getLine(line)) {
			if (ending_k < line.getKmer()) {
				break;
			}
			os << line.getKmer();
			for (auto v : line.count)
				os << '\t' << v;
			os << '\n';
		}
	} else {
		while (bm.getLine(line)) {
			os << line.getKmer();
			for (auto v : line.count)
				os << '\t' << v;
			os << '\n';
		}
	}
	os.flush();
	ofs.close();
	return true;
}

/// Query a k-mer matrix using a directly a nucleotidic sequence or a file containing the query ( plain text format )
/// @param input A nucleotidic seuqence or a file containing it
/// @param source The matrix to query
/// @param output An output file or "stdout" to output in the standard output
/// @param normalized true if use the matrix normalization, false if you want to retrieve the original raw count.
/// @return
bool BinaryMatrixHandler::extract(std::string input, std::string source,
		std::string output, bool normalized) {
	BinaryMatrix bm;
	bm.setNormalized(normalized);
	bm.load(source, true);
	std::ofstream ofs;
	std::streambuf * buf;
	if (output == "stdout") {
		buf = std::cout.rdbuf();
	} else {
		ofs.open(output);
		buf = ofs.rdbuf();
	}
	std::ostream os(buf);
	IOTools::printMatrixHeader(os, bm.col_names, bm.col_groups);
	if (IOTools::fileExists(input)) {
		std::ifstream ifs(input);
		std::string line;
		uint64_t buffer_pos = 0, buffer_size = 100000;
		std::vector<Kmer> buffer(buffer_size);
		std::vector<KmerMatrixLine> lines;
		bool reading = getline(ifs, line) ? true : false;
		while (reading) {
			std::set<Kmer> bline = Kmer::generateKmers(line, bm.k_len);
			if (buffer_pos + bline.size() > buffer_size) {
				buffer_size = buffer_pos + bline.size();
				buffer.resize(buffer_size);
			}

			for (auto & l : bline) {
				buffer[buffer_pos] = l;
				buffer_pos++;
			}

			reading = getline(ifs, line) ? true : false;
			if (!reading || buffer_pos >= buffer_size) {
				buffer.resize(buffer_pos);
				buffer_pos = 0;
				bm.getLines(buffer, lines);
				for (auto & bml : lines) {
					os << bml.getKmer();
					for (auto & v : bml.count)
						os << "\t" << v;
					os << "\n";
				}
				buffer.resize(buffer_size);
			}
		}
	} else {
		IOTools::to_upper(input);
		if (std::regex_match(input, std::regex("^[ATCG]+$"))) {
			std::vector<std::string> request = { input };
			std::vector<KmerMatrixLine> lines = bm.getLines(request);
			for (auto & bml : lines) {
				os << bml.getKmer();
				for (auto v : bml.count)
					os << "\t" << v;
				os << "\n";
			}
		} else {
			log << "Input not recognized\n";
			return false;
		}
	}
	ofs.close();
	return true;
}

/// Create a matrix from a tsv containing the informations about the the positions of the
/// samples k-mers
///
/// @param input A tsv file formatted as: count_file_position\tsample_name\tsample_group
/// @param output The output json file
/// @param prefix The prefix length. Use -1 if you want the theorical optimal
/// @param rescaling a rescaling factor that will be use to shift the scale in order to avoid numbers too small
/// @return bool true if everithing went well.
bool BinaryMatrixHandler::create(std::string input, std::string output,
		int64_t prefix, double rescaling) {
	BinaryMatrix bm;
	bm.create(input, rescaling, prefix);
	bm.save(output);
	return true;
}

}
} /* namespace kma */
