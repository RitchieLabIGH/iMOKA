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

bool BinaryMatrixHandler::run(int argc, char **argv) {
	try {
		cxxopts::Options options("iMOKA", "Binary matrix handler");
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
		if (std::string(argv[1]) == "stable") {
			options.add_options()("o,output",
					"Output tsv file containing the k-mer, the average expression and standard deviation",
					cxxopts::value<std::string>()->default_value(
							"./stable_kmers.tsv"))("s,source",
					"The source from where extract the features (JSON header file)",
					cxxopts::value<std::string>())("m,max",
					"Maximum number of k-mers to output",
					cxxopts::value<std::uint64_t>()->default_value("100"))(
					"h,help", "Show this help");
			auto parsedArgs = options.parse(argc, argv);
			bool help = IOTools::checkArguments(parsedArgs, { "source" }, log);
			if (!help) {
				return stable(parsedArgs["source"].as<std::string>(),
						parsedArgs["output"].as<std::string>(),
						parsedArgs["max"].as<uint64_t>());
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
					return dump(parsedArgs["input"].as<std::string>(),
							parsedArgs["output"].as<std::string>(),
							parsedArgs["from-kmer"].as<std::string>(),
							parsedArgs["to-kmer"].as<std::string>(),
							parsedArgs.count("raw") == 0);
				} else {
					std::string input_matrix = parsedArgs["input"].as<
							std::string>();
					BinaryMatrix bm(input_matrix);
					const uint64_t k_len = bm.k_len, batch_size = std::floor(
							((std::pow(4, bm.k_len)) - 1)
									/ omp_get_max_threads());
					bm.clear();
#pragma omp parallel
					{
						std::string out_file = parsedArgs["output"].as<
								std::string>();
						if (omp_get_thread_num() != 0) {
							out_file += std::to_string(omp_get_thread_num());
						}
						uint64_t a = omp_get_thread_num() * batch_size, b =
								((omp_get_thread_num() + 1) * batch_size) - 1;
						Kmer kmer_from(k_len, a);
						Kmer kmer_to(k_len, b);
						dump(input_matrix, out_file, kmer_from.str(),
								kmer_to.str(), parsedArgs.count("raw") == 0,
								omp_get_thread_num() == 0);
					}
					std::string ofile = parsedArgs["output"].as<std::string>();
					std::ofstream ofs(ofile,
							std::ofstream::app | std::ofstream::out);
					for (int i = 1; i < omp_get_max_threads(); i++) {
						std::ifstream ifs(ofile + std::to_string(i));
						ofs << ifs.rdbuf();
						ifs.close();
						if (remove(
								std::string(ofile + std::to_string(i)).c_str())
								!= 0) {
							std::cerr << "Error removing " << ofile << i
									<< "\n";
						}
					}
					ofs.close();
					return true;

				}
			}
		}
		log << options.help() << "\n";
		return false;
	} catch (const cxxopts::OptionException &e) {
		log << "error parsing options: " << e.what() << std::endl;
		return false;
	}

}

std::pair<double, double> BinaryMatrixHandler::estimate_stable_thresholds(
		std::string source, const std::vector<Kmer> &partitions) {
	/// test 1M k-mers picked randomly for each thread
	std::vector<std::vector<double>> means(omp_get_max_threads());
	uint64_t max_per_thr = 100000;
	std::cout << "Estimating mean values...";
	std::cout.flush();
#pragma omp parallel firstprivate( partitions , source )
	{
		uint64_t thr = omp_get_thread_num(), skip = 0;
		std::this_thread::sleep_for(std::chrono::milliseconds(thr * 1000));
		BinaryMatrix mat(source, true);
		Kmer to_kmer(mat.k_len, std::pow(4, mat.k_len) - 1);
		KmerMatrixLine line;
		if (thr != omp_get_max_threads() - 1) {
			to_kmer = partitions[thr];
		}
		if (thr != 0) {
			Kmer from_kmer = partitions[thr - 1];
			mat.go_to(from_kmer);
			mat.getLine(line);
		}
		bool running = mat.getLine(line);
		while (running) {
			skip = rand() % 100;
			while (skip != 0 && running) {
				running = mat.getLine(line);
				skip--;
			}
			if (running) {
				if (*std::min_element(line.count.begin(), line.count.end())
						> 0) {
					means[thr].push_back(Stats::mean(line.count));
					if (means[thr].size() == max_per_thr) {
						running = false;
					}
				}
			}
		}
	}
	std::cout << "done.\n";
	std::cout.flush();
	for (int i = 1; i < omp_get_max_threads(); i++) {
		means[0].insert(means[0].end(), means[i].begin(), means[i].end());
		means[i].clear();
	}
	std::sort(means[0].begin(), means[0].end());
	uint64_t n = means[0].size();
	std::pair<double, double> out;
	out.first = means[0][std::round(n / 4)];
	out.second = means[0][std::round((n / 2))];
	std::cout << "Using " << n << " k-mers to estimate the range of means: "
			<< out.first << " - " << out.second << "\n";
	std::cout.flush();
	return out;
}

struct KmerMeanStdLine {
	std::string kmer;
	double mean;
	double std;
};

bool BinaryMatrixHandler::stable(std::string source, std::string outfile,
		uint64_t max_n) {
	BinaryMatrix bm(source, true);
	const std::vector<Kmer> partitions = bm.getPartitions(
			omp_get_max_threads());
	std::pair<double, double> means_ranges = estimate_stable_thresholds(source,
			partitions);
	std::vector<std::vector<std::vector<KmerMeanStdLine>>> results(omp_get_max_threads());

	bm.clear();
#pragma omp parallel firstprivate(  means_ranges, partitions , source, max_n )
	{
		uint64_t thr = omp_get_thread_num();
		std::this_thread::sleep_for(std::chrono::milliseconds(thr * 1000));
		auto start = std::chrono::high_resolution_clock::now();
		BinaryMatrix mat(source, true);
		std::string file_out_thr = outfile + std::to_string(thr);
		std::string expected_end, reading_time, total_time, process_time;
		uint64_t tot_lines = 0;
		Kmer to_kmer(mat.k_len, std::pow(4, mat.k_len) - 1);
		KmerMatrixLine line;
		if (thr != omp_get_max_threads() - 1) {
			to_kmer = partitions[thr];
		}
		if (thr != 0) {
			Kmer from_kmer = partitions[thr - 1];
			mat.go_to(from_kmer);
			mat.getLine(line);
		}

		bool running = mat.getLine(line);
		uint64_t starting_kmer = line.getKmer().to_int();
		std::cout << "[ " << IOTools::now() << " ] Thread " << thr
				<< " starting on cpu " << sched_getcpu() << " with k-mer "
				<< line.getKmer().str() << " to k-mer " << to_kmer.str()
				<< ", memory occupied: "
				<< IOTools::format_space_human(
						IOTools::getCurrentProcessMemory()) << ".\n";
		std::cout.flush();

		double mean, std, perc;
		std::vector<KmerMeanStdLine> *vect = NULL;
		results[thr].resize(3);
		while (running) {
			if (line.getKmer() <= to_kmer) {
				tot_lines++;
				if (*std::min_element(line.count.begin(), line.count.end())
						> 0) {
					mean = Stats::mean(line.count);
						if (mean < means_ranges.first) {
							vect = &(results[thr][0]);
						} else if ( mean > means_ranges.second){
							vect = &(results[thr][2]);
						} else {
							vect = &(results[thr][1]);
						}
						std = Stats::stdev(line.count, mean);
						if (vect->size() < max_n
								|| std < vect->at(max_n - 1).std) {
							vect->push_back(
									{ line.getKmer().str(), mean, std });
							if (vect->size() > max_n) {
								std::sort(vect->begin(), vect->end(),
										[](auto &a, auto &b) {
											return a.std < b.std;
										});
								vect->resize(max_n);
							}
					}
				}
				if (tot_lines % 1000000 == 0) {
					perc = ((line.getKmer().to_int() - starting_kmer)
							/ (long double) (to_kmer.to_int() - starting_kmer))
							* 100;
					std::cout << "Thread " << thr << " - " << perc << "%\n";
					std::cout.flush();
				}
				running = mat.getLine(line);
			} else {
				running = false;
			}
		}
		std::cout << "[ " << IOTools::now() << " ] Thread " << thr
				<< " completed. " << tot_lines << " k-mers analysed\n";

	} // parallel end
	std::ofstream final_ofs(outfile);
	for (int i = 1; i < omp_get_max_threads(); i++) {
		for (int j =0 ; j < 3 ; j++ ){
			results[0][j].insert(results[0][j].end(), results[i][j].begin(),
							results[i][j].end());
					results[i][j].clear();
		}
	}
	for ( int j=0; j< 3 ; j++){
		std::sort(results[0][j].begin(), results[0][j].end(), [](auto &a, auto &b) {
					return a.std < b.std;
				});
	}

	final_ofs << "kmer\ttype\tmean\tstd\n";
	for (int j = 0 ; j < 3 ; j++){
		for (uint64_t i = 0; i < max_n; i++) {
				if (i < results[0][j].size()) {
					final_ofs << results[0][j][i].kmer << "\t"<< (j == 0 ? "LOW" : j ==1 ? "MEDIUM" : "HIGH") <<"\t"
							<< results[0][j][i].mean << "\t" << results[0][j][i].std << "\n";
				}
			}
	}

	final_ofs.close();
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
		std::string from_k, std::string to_k, bool normalized,
		bool write_header) {
	BinaryMatrix bm;
	bm.setNormalized(normalized);
	bm.load(input);
	std::ofstream ofs;
	std::streambuf *buf;
	std::vector<char> char_buffer(8192);
	if (output == "stdout") {
		buf = std::cout.rdbuf();
	} else {
		ofs.open(output);
		buf = ofs.rdbuf()->pubsetbuf(char_buffer.data(), char_buffer.size());
	}
	std::ostream os(buf);
	if (write_header)
		IOTools::printMatrixHeader(os, bm.col_names, bm.col_groups);
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
	std::streambuf *buf;
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

			for (auto &l : bline) {
				buffer[buffer_pos] = l;
				buffer_pos++;
			}

			reading = getline(ifs, line) ? true : false;
			if (!reading || buffer_pos >= buffer_size) {
				buffer.resize(buffer_pos);
				buffer_pos = 0;
				bm.getLines(buffer, lines);
				for (auto &bml : lines) {
					os << bml.getKmer();
					for (auto &v : bml.count)
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
			for (auto &bml : lines) {
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
