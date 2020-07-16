/*
 * ClassificationMatrix.cpp
 *
 *  Created on: Mar 5, 2019
 *      Author: claudio
 */

#include "Classification.h"

namespace imoka {
namespace process {

using namespace matrix;

bool Classification::run(int argc, char **argv) {
	try {
		if (std::string(argv[1]) == "reduce") {
			cxxopts::Options options("iMOKA reduce",
					"Reduce a k-mer matrix in according to the classification power of each k-mer");
			options.add_options()
					("i,input", "The input matrix JSON header", cxxopts::value<std::string>())
					("o,output","Output matrix file", cxxopts::value<std::string>())
					("h,help", "Show this help")
					("a,accuracy","Minimum of accuracy",cxxopts::value<double>()->default_value("65"))
					("t,test-percentage","The percentage of the min class used as test size",cxxopts::value<double>()->default_value("0.25"))
					("e,entropy-adjustment-one","The a1 adjustment value of the entropy filter",cxxopts::value<double>()->default_value("0.25"))
					("E,entropy-adjustment-two","The a2 adjustment value of the entropy filter",cxxopts::value<double>()->default_value("0.05"))
					("c,cross-validation", "Maximum number of cross validation",cxxopts::value<uint64_t>()->default_value("100"))
					("s,standard-error","Standard error to achieve convergence in cross validation. Suggested between 0.5 and 2",cxxopts::value<double>()->default_value("0.5"))
					("v,verbose-entropy","Print the given number of k-mers for each thread, the entropy and the entropy threshold that would have been used as additional columns. Useful to evaluate the efficency of the entropy filter. Defualt: 0 ( Disabled )",cxxopts::value<uint64_t>()->default_value("0"))
					("m,min","Minimum raw count that at least one sample has to have to consider a k-mer",cxxopts::value<int>()->default_value("5"))
					;
			auto parsedArgs = options.parse(argc, argv);
			if (parsedArgs.count("help") != 0
					|| IOTools::checkArguments(parsedArgs,
							{ "input", "output" }, log)) {
				log << "Help for the classification \n" << options.help()
						<< "\n";
				return false;
			}
			std::vector<double> adjustments(2);
			adjustments[0] = parsedArgs["e"].as<double>();
			adjustments[1] = parsedArgs["E"].as<double>();
			return classificationFilterMulti(
					parsedArgs["input"].as<std::string>(),
					parsedArgs["output"].as<std::string>(),
					parsedArgs["min"].as<int>(),
					parsedArgs["verbose-entropy"].as<uint64_t>(),
					parsedArgs["cross-validation"].as<uint64_t>(),
					parsedArgs["standard-error"].as<double>(),
					parsedArgs["accuracy"].as<double>(),
					parsedArgs["test-percentage"].as<double>(), adjustments);

		}

		if (std::string(argv[1]) == "cluster") {
			cxxopts::Options options("iMOKA cluster",
					"Produce a similarity matrix between the samples based on their k-mers");
			options.add_options()
					("i,input", "The input matrix JSON header", cxxopts::value<std::string>())
					("o,output", "Output matrix file", cxxopts::value<std::string>())
					("h,help", "Show this help")
					("s,sigthr","Proportion of non zero values to consider a k-mer [0-1] ",
					cxxopts::value<double>()->default_value("0.10"))
					("b,bins", "Number of bins used to discretize the k-mer counts",
					cxxopts::value<uint64_t>()->default_value("100"));
			auto parsedArgs = options.parse(argc, argv);
			if (parsedArgs.count("help") != 0
					|| IOTools::checkArguments(parsedArgs,
							{ "input", "output" }, log)) {
				log << "Help for the classification \n" << options.help()
						<< "\n";
				return false;
			}
			return clusterizationFilter(parsedArgs["input"].as<std::string>(),
					parsedArgs["output"].as<std::string>(),
					parsedArgs["bins"].as<uint64_t>(),
					parsedArgs["sigthr"].as<double>() );
		}

	} catch (const cxxopts::OptionException &e) {
		log << "Error parsing options: " << e.what() << std::endl;
		return false;
	}
	return false;
}

/// @param file_in
/// @param file_out
/// @param method
/// @param batch
/// @param cross_validation
/// @param sd
/// @param min_acc
/// @param perc_test
/// @param adjustments
bool Classification::classificationFilterMulti(std::string file_in,
		std::string file_out, int min, uint64_t entropy_evaluation ,
		uint64_t cross_validation, double sd, double min_acc, double perc_test,
		std::vector<double> adjustments) {
	std::cerr << "Memory occupied: "
			<< IOTools::format_space_human(IOTools::getCurrentProcessMemory())
			<< ".\n";
	BinaryMatrix bm(file_in, true);
	mlpack::Log::Warn.ignoreInput = true;
	const uint64_t k_len = bm.k_len, batch_size = std::floor(
			((std::pow(4, bm.k_len)) - 1) / omp_get_max_threads());
	std::stringstream header;
	header << "kmer";
	for (uint64_t g = 0; g < bm.group_map.size(); g++) {
		for (uint64_t h = g + 1; h < bm.group_map.size(); h++) {
			header << "\t" << bm.unique_groups[g] << "_x_"
					<< bm.unique_groups[h];
		}
	}
	if (entropy_evaluation > 0 ){
		header << "\tEntropy\tEntropy_threshold";
	}
	bm.clear();
	std::cerr << "Memory occupied: "
			<< IOTools::format_space_human(IOTools::getCurrentProcessMemory())
			<< ".\n";
	std::cerr << "Reducing with " << omp_get_max_threads()
			<< " threads, each analysing a maximum total of " << batch_size
			<< " k-mers.\n";
	std::cerr.flush();
	json info = { { "cross_validation", cross_validation }, {
			"standard_error", sd }, { "minimum_count", min }, { "min_acc",
			min_acc }, { "perc_test", perc_test },
			{ "adjustments", adjustments }, { "file_in", file_in }, {
					"file_out", file_out } };
#pragma omp parallel firstprivate(cross_validation, sd, min_acc, perc_test, adjustments, min, entropy_evaluation )
	{
		std::function<
				std::vector<double>(const std::vector<std::vector<double>>&,
						const std::vector<uint64_t>,
						const std::map<uint64_t, uint64_t>, const uint64_t,
						const double, double)> fun =
				MLpack::pairwiseNaiveBayesClassifier;
		uint64_t thr = omp_get_thread_num();
		std::this_thread::sleep_for(std::chrono::milliseconds(thr * 1000));
		auto start = std::chrono::high_resolution_clock::now();
		BinaryMatrix mat(file_in, true);
		std::string file_out_thr = file_out + std::to_string(thr);
		std::string expected_end, reading_time, total_time, process_time;
		std::ofstream ofs(file_out_thr), tlog(file_out_thr + ".log");

		ofs << std::fixed << std::setprecision(3);
		std::vector<uint64_t> groups = mat.groups;
		std::map<uint64_t, uint64_t> group_counts = mat.group_counts;
		double max_entropy = 1000000.00, entropy, perc;
		double minEntropy = 0, localMinEntropy = max_entropy, adj_down =
				adjustments[0], adj_up = adjustments[1];
		uint64_t tot_lines = 0, kept = 0, entropy_update_every = 30,
				last_update = 0;
		uint64_t a = thr * batch_size, b = ((thr + 1) * batch_size) - 1;
		Kmer from_kmer(k_len, a), to_kmer(k_len, b);
		mat.go_to(from_kmer);
		std::ostringstream os;
		os << "[ " << IOTools::now() << " ] Thread " << thr
				<< " starting on cpu " << sched_getcpu()
				<< ", memory occupied: "
				<< IOTools::format_space_human(
						IOTools::getCurrentProcessMemory()) << ".\n";
		std::cerr << os.str() << std::flush;

		KmerMatrixLine line;
		bool running = mat.getLine(line), keep;
		std::vector<double> res;
		tlog << "Perc\tTotal\tKept\tMinEntropy\tRunningTime\n";
		tlog.flush();
		bool verbose_entropy = entropy_evaluation > 0;
		while (running) {
			if (line.getKmer() <= to_kmer) {
				tot_lines++;
				if (*std::max_element(line.raw_count.begin(),
						line.raw_count.end()) >= min) {
					entropy = Stats::entropy(line.count);
					if (entropy >= minEntropy || verbose_entropy) {
						res = fun( { line.count }, groups, group_counts,
								cross_validation, sd, perc_test);
						keep = false;
						for (double &v : res)
							keep = keep || v >= min_acc;
						if (keep) {
							localMinEntropy =
									localMinEntropy < entropy ?
											localMinEntropy : entropy;
							last_update++;
							kept++;
							if (last_update >= entropy_update_every) {
								minEntropy =
										minEntropy == 0 ?
												localMinEntropy
														- (localMinEntropy
																* adj_down * 2) :
										localMinEntropy
												- (localMinEntropy * adj_down)
												< minEntropy ?
												minEntropy
														- (localMinEntropy
																* adj_down) :
												minEntropy
														+ (localMinEntropy
																* adj_up);
								last_update = 0;
								entropy_update_every = entropy_update_every + 30;
								localMinEntropy = max_entropy;
							}
						}
						if ( keep || verbose_entropy ){
							ofs << line.getKmer();
							for (double &v : res)
									ofs << "\t" << v;
							if ( verbose_entropy ){
								ofs << "\t" << entropy << "\t" << minEntropy;
							}
							ofs << "\n";
						}
					}
				}
				if (tot_lines % 1000000 == 0) {
					perc = 0; // ((line.getKmer().to_int() - from_kmer.to_int())*100) / (long double)batch_size;  /// TODO: there is something wrong wiht the int conversion
					tlog << perc << "\t" << tot_lines << "\t" << kept << "\t"
							<< minEntropy << "\t"
							<< IOTools::format_time(
									std::chrono::duration_cast<
											std::chrono::seconds>(
											std::chrono::high_resolution_clock::now()
													- start).count()) << "\n";
					tlog.flush();
				}
				running = mat.getLine(line);
				if ( verbose_entropy ){
					if (tot_lines >= entropy_evaluation  ){
						running=false;
					}
				}
			} else {
				running = false;
			}
		}
		ofs.close();
		std::cerr << "[ " << IOTools::now() << " ] Thread " << thr
				<< " completed. " << tot_lines << " k-mers analysed, " << kept
				<< " kept \n";
		tlog << "100\t" << tot_lines << "\t" << kept << "\t" << minEntropy
				<< "\t"
				<< IOTools::format_time(
						std::chrono::duration_cast<std::chrono::seconds>(
								std::chrono::high_resolution_clock::now()
										- start).count()) << "\n";
		tlog.flush();
		tlog.close();
	} // parallel end
	std::ofstream final_ofs(file_out);
	std::ifstream ifs;
	uint64_t total_kmers = 0, total_kmers_kept = 0;
	std::vector<std::string> lines, infos;
	for (int i = 0; i < omp_get_max_threads(); i++) {
		lines = IOTools::getLinesFromFile(
				file_out + std::to_string(i) + std::string(".log"));
		boost::split(infos, lines[lines.size() - 1], boost::is_any_of("\t"));
		total_kmers += std::stoll(infos[1]);
		total_kmers_kept += std::stoll(infos[2]);
	}
	info["processed"] = total_kmers;
	info["kept"] = total_kmers_kept;
	final_ofs << "#" << info.dump() << "\n";
	final_ofs << header.str() << "\n";
	for (int i = 0; i < omp_get_max_threads(); i++) {
		ifs.open(file_out + std::to_string(i));
		final_ofs << ifs.rdbuf();
		ifs.close();
		if (remove(std::string(file_out + std::to_string(i)).c_str()) != 0) {
			std::cerr << "Error removing " << file_out << i << "\n";
		}
	}
	final_ofs.close();
	final_ofs.open(file_out + ".json");
	final_ofs << info.dump() << "\n";
	final_ofs.close();
	return true;
};



/// @param input
/// @param output
/// @param method
/// @param batch
/// @param silhuette
/// @param epsilon
/// @param clusters
/// @param min_cluster
bool Classification::clusterizationFilter(std::string file_in,
		std::string file_out, uint64_t nbins, double sigthr) {
	std::cerr << "Memory occupied: "
			<< IOTools::format_space_human(IOTools::getCurrentProcessMemory())
			<< ".\n";
	int max_thr = omp_get_max_threads();
	BinaryMatrix bm(file_in, true);
	const uint64_t k_len = bm.k_len, batch_size = std::floor(
			((std::pow(4, bm.k_len)) - 1) / max_thr), nsam =
			bm.col_names.size();
	std::vector<std::string> names = bm.col_names;

	bm.clear();
	json info = { { "nbins", nbins }, { "sigthr", sigthr },
			{ "file_in", file_in }, { "file_out", file_out } };

	std::vector<arma::Mat<double>> results(max_thr);

#pragma omp parallel firstprivate( nsam, file_in, file_out, batch_size, nbins, sigthr )
	{
		uint64_t thr = omp_get_thread_num();
		std::this_thread::sleep_for(std::chrono::milliseconds(thr * 1000));
		auto start = std::chrono::high_resolution_clock::now();
		BinaryMatrix mat(file_in, true);
		std::string file_out_thr = file_out + std::to_string(thr);
		uint64_t tot_lines = 0, siglines = 0;
		uint64_t a = thr * batch_size, b = ((thr + 1) * batch_size) - 1;
		Kmer from_kmer(k_len, a), to_kmer(k_len, b);
		mat.go_to(from_kmer);
		std::ostringstream os;
		os << "[ " << IOTools::now() << " ] Thread " << thr
				<< " starting on cpu " << sched_getcpu()
				<< ", memory occupied: "
				<< IOTools::format_space_human(
						IOTools::getCurrentProcessMemory()) << "\n";
		std::cerr << os.str() << std::flush;
		KmerMatrixLine line;
		bool running = mat.getLine(line);
		std::ofstream tlog(file_out_thr + ".log");
		tlog << "Total\tProcessed\tRunningTime\n";
		arma::Mat<double> interactions(nsam, nsam);
		int i, j;
		for (i = 0; i < nsam; i++) {
			for (j = 0; j < nsam; j++) {
				interactions(i, j) = 0;
			}
		}
		tlog.flush();
		while (running) {
			if (line.getKmer() <= to_kmer) {
				std::pair<std::vector<uint32_t>, double> dcount = Stats::discretize(line.count, nbins, sigthr);
				if (dcount.first.size() > 0) {
					uint32_t diff;
					double weight = 1-dcount.second;
					for (i = 0; i < nsam; i++) {
						if (dcount.first[i] != 0) {
							for (j = i + 1; j < nsam; j++) {
								if ( dcount.first[j] != 0 ){
									diff = std::abs((int) (dcount.first[j] - dcount.first[i]));
									if (diff==0) {
										interactions(i, j)+= (2*weight);
									} else if ( diff == 1 ){
										interactions(i, j)+= weight ;
									}
								}

							}
						}
					}
					siglines++;
				}
				tot_lines++;
				if (tot_lines % 100000 == 0) {
					tlog << tot_lines << "\t" << siglines << "\t"
							<< IOTools::format_time(
									std::chrono::duration_cast<
											std::chrono::seconds>(
											std::chrono::high_resolution_clock::now()
													- start).count()) << "\n";
					tlog.flush();
				}
				running =  mat.getLine(line);
			} else {
				running = false;
			}
		}
		std::cerr << "[ " << IOTools::now() << " ] Thread " << thr
				<< " completed. \n";
		tlog << tot_lines << "\t" << siglines << "\t"
				<< IOTools::format_time(
						std::chrono::duration_cast<std::chrono::seconds>(
								std::chrono::high_resolution_clock::now()
										- start).count()) << "\n";
		tlog.flush();
		tlog.close();
		results[thr] = interactions;
	} // parallel end

	arma::Mat<double> final_interaction = results[0];
	for (int i = 0; i < nsam; i++) {
		for (int j = i + 1; j < nsam; j++) {
			for (int n = 1; n < max_thr; n++) {
				final_interaction(i, j) += results[n](i, j);
			}
			final_interaction(j, i) = final_interaction(i, j);
		}
	}

	std::ofstream fos(file_out);
	for (int i = 0; i < nsam; i++) {
		fos << names[i];
		for (int j = 0; j < nsam; j++) {
			fos << "\t" << final_interaction(i, j);
		}
		fos << "\n";
	}
	fos.close();
	fos.open(file_out + ".json");
	fos << info.dump() << "\n";
	fos.close();
	return true;
}
}
} /* namespace imoka */
