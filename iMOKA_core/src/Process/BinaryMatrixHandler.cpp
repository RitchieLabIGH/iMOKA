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
					"Maximum number of k-mers to output for each category",
					cxxopts::value<std::uint64_t>()->default_value("9"))(
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



bool BinaryMatrixHandler::stable(std::string source, std::string outfile,
		uint64_t max_n) {
	BinaryMatrix bm(source, true);
	const std::vector<Kmer> partitions = bm.getPartitions(
			omp_get_max_threads());
	std::pair<double, double> means_ranges = StableProcess::estimate_stable_thresholds(source,
			partitions);
	std::vector<std::vector<std::vector<KmerMeanStdLine>>> results(
			omp_get_max_threads());

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
		KmerMatrixLine<double> line;
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
		StableProcess stp(means_ranges, max_n, results[thr]);
		while (running) {
			if (line.getKmer() <= to_kmer) {
				tot_lines++;
				stp.run(line);
				if (tot_lines % 1000000 == 0) {
					double perc = ((line.getKmer().to_int() - starting_kmer)
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
		for (int j = 0; j < 3; j++) {
			results[0][j].insert(results[0][j].end(), results[i][j].begin(),
					results[i][j].end());
			results[i][j].clear();
		}
	}

	std::vector<double> medians = { 0 , 0 , 0 };
	KmerMeanStdLine & aref=results[0][0][0]; // Due to an annoying Eclipse bug, using reference to the object instad of directly the element in the array
	for (int j = 0; j < 3; j++) {
		std::sort(results[0][j].begin(), results[0][j].end(),
				[](auto &a, auto &b) {
					return a.stdev < b.stdev;
				});
		if ( results[0][j].size() > max_n ){
						results[0][j].resize(max_n);
					}
		aref=results[0][j][results[0][j].size() / 2];
		if ( results[0][j].size() % 2 == 0 ){
			medians[j]=aref.mean;
		} else {
			KmerMeanStdLine & bref=results[0][j][(results[0][j].size() / 2) + 1];
			medians[j]=(aref.mean + bref.mean) / 2;
		}
	}

	final_ofs << "#{ 'j' : " << ( medians[1] / medians[0] ) << ", 'k' : " << ( medians[1] / medians[2] ) << " }\nkmer\ttype\tmean\tstd\n";
	for (int j = 0; j < 3; j++) {
		for (uint64_t i = 0; i < results[0][j].size(); i++) {
			aref=results[0][j][i];
			final_ofs << aref.kmer << "\t"
					<< (j == 0 ? "LOW" : j == 1 ? "MEDIUM" : "HIGH") << "\t"
					<< aref.mean << "\t" << aref.stdev
					<< "\n";
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
	if (normalized) {
		_dump<double>(input, output, from_k, to_k, write_header);
	} else {
		_dump<uint32_t>(input, output, from_k, to_k, write_header);
	}

}

/// Query a k-mer matrix using a directly a nucleotidic sequence or a file containing the query ( plain text format )
/// @param input A nucleotidic seuqence or a file containing it
/// @param source The matrix to query
/// @param output An output file or "stdout" to output in the standard output
/// @param normalized true if use the matrix normalization, false if you want to retrieve the original raw count.
/// @return

bool BinaryMatrixHandler::extract(std::string input, std::string source,
		std::string output, bool normalized) {
	if ( normalized ){
		return _extract<double>(input, source, output);
	} else {
		return _extract<uint32_t>(input, source, output);
	}
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
