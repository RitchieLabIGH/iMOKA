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
			options.add_options()("i,input", "The input matrix JSON header",
					cxxopts::value<std::string>())("o,output",
					"Output matrix file", cxxopts::value<std::string>())(
					"h,help", "Show this help")("a,accuracy",
					"Minimum of accuracy",
					cxxopts::value<double>()->default_value("65"))(
					"t,test-percentage",
					"The percentage of the min class used as test size",
					cxxopts::value<double>()->default_value("0.25"))(
					"e,entropy-adjustment-down",
					"The adjustment value of the entropy filter that reduce the threshold. Need to be between 0 and 1 not included, otherwise disable the entropy assertment.",
					cxxopts::value<double>()->default_value("0.25"))(
					"E,entropy-adjustment-two",
					"The adjustment value of the entropy filter that increase the threshold. Need to be greater than 0, otherwise disable the entropy assertment.",
					cxxopts::value<double>()->default_value("0.05"))(
					"C,confidence",
					"Discard results with low confidence: at least one group has to have the abundance mean greater than confidence x min normalized count. Disable it by setting to 0",
					cxxopts::value<double>()->default_value("0"))(
					"c,cross-validation", "Maximum number of cross validation",
					cxxopts::value<uint64_t>()->default_value("100"))(
					"s,standard-error",
					"Standard error to achieve convergence in cross validation. Suggested between 0.5 and 2",
					cxxopts::value<double>()->default_value("0.5"))(
					"v,verbose-entropy",
					"Print the given number of k-mers for each thread, the entropy and the entropy threshold that would have been used as additional columns. Useful to evaluate the efficency of the entropy filter. Ignored if the entropy filter is disabled. Default: 0 ( Disabled )",
					cxxopts::value<uint64_t>()->default_value("0"))("m,min",
					"Minimum raw count that at least one sample has to have to consider a k-mer",
					cxxopts::value<int>()->default_value("5"))(
					"l,levelling", "Set to zero the normalized counts lower than the min_normalized_count",
					cxxopts::value<bool>()->default_value("false"));
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
					parsedArgs["test-percentage"].as<double>(),
					parsedArgs["confidence"].as<double>(), adjustments,
					 parsedArgs["l"].as<bool>());
		}

		if (std::string(argv[1]) == "cluster") {
			cxxopts::Options options("iMOKA cluster",
					"Produce a similarity matrix between the samples based on their k-mers");
			options.add_options()("i,input", "The input matrix JSON header",
					cxxopts::value<std::string>())("o,output",
					"Output matrix file", cxxopts::value<std::string>())(
					"h,help", "Show this help")("s,sigthr",
					"Proportion of non zero values to consider a k-mer [0-1] ",
					cxxopts::value<double>()->default_value("0.10"))("b,bins",
					"Number of bins used to discretize the k-mer counts",
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
					parsedArgs["sigthr"].as<double>());
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
		std::string file_out, int min, uint64_t entropy_evaluation,
		uint64_t cross_validation, double sd, double min_acc, double perc_test,
		double confidence, std::vector<double> adjustments,
		bool levelling) {

	BinaryMatrix bm(file_in, false);
	double min_norm_count = min
			/ Stats::getQuartiles(bm.normalization_factors)[0]; // The counts lower than this are zeros to level the samples with the one having the lowest depth ( first quartile ).
	std::cerr << "Min normalized count: " << min_norm_count << "\n";
	std::cerr.flush();
	if (levelling) {
		std::cerr << "Normalized count lower than " << min_norm_count
				<< " will be set to 0\n";
	}
	if (confidence > 0) {
		std::cerr << "If no group has a mean normalized count lower than "
				<< (min_norm_count * confidence)
				<< " ( minimum normalized count x confidence ) the k-mer will be ignored\n";
	}
	const std::vector<Kmer> partitions = bm.getPartitions(
			omp_get_max_threads());
	std::vector<std::vector<std::vector<KmerMeanStdLine>>> stable_results(
			omp_get_max_threads());

	std::cerr << "Memory usage: "
			<< IOTools::format_space_human(IOTools::getCurrentProcessMemory())
			<< ".\n";
	std::cerr << "Reducing with " << omp_get_max_threads() << " threads.\n";
	std::cerr.flush();

	if (adjustments[0] >= 1 || adjustments[1] <= 0 || adjustments[0] <= 0) {
		std::cerr << "Entropy assertment disabled.\n";
		adjustments[0] = 0;
		adjustments[1] = 0;
	}
	if (cross_validation < 3) {
		std::cerr
				<< "Cross validation disabled. Accuracy are the training ones.\n";
		cross_validation = 1;
	}
	json info = { { "cross_validation", cross_validation }, { "standard_error",
			sd }, { "minimum_count", min }, { "min_acc", min_acc }, {
			"perc_test", perc_test }, { "adjustments", adjustments }, {
			"file_in", file_in }, { "file_out", file_out }, { "levelling",
			levelling }, { "confidence", confidence }, { "min_norm_count",
			min_norm_count } };
	bm.clear();

#pragma omp parallel firstprivate(cross_validation, min_norm_count, sd, min_acc, perc_test, adjustments, min, entropy_evaluation,partitions, confidence, levelling)
	{
		uint64_t thr = omp_get_thread_num();
		BinaryMatrix mat(file_in, false);
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

		bool running = mat.getLine(line), keep;
		std::this_thread::sleep_for(std::chrono::milliseconds(thr * 1000)); // prevent overlap of std::cerr
		std::cerr << "[ " << IOTools::now() << " ] Thread " << thr
				<< " starting on cpu " << sched_getcpu() << " with k-mer "
				<< line.getKmer().str() << " to k-mer " << to_kmer.str()
				<< ", memory usage: "
				<< IOTools::format_space_human(
						IOTools::getCurrentProcessMemory()) << ".\n"
				<< std::flush;

		std::string file_out_thr = file_out + std::to_string(thr);
		std::ofstream outfs(file_out_thr), thrlog(file_out_thr + ".log");


		ReductionProcess redp(thr, outfs, thrlog, adjustments, mat,
				cross_validation, entropy_evaluation > 0, sd, min_acc,
				perc_test, line.getKmer().to_int(), to_kmer.to_int());
		double min_norm_count_thr= min_norm_count * confidence;
		while (running) {
			if (line.getKmer() <= to_kmer) {
				if (mat.getMaxRawCount(line) >= min) {
					if (levelling) {
						for (int i = 0; i < line.count.size(); i++) {
							if (line.count[i] < min_norm_count) {
								line.count[i] = 0;
							}
						}
					}
					redp.run(line, min_norm_count_thr);

				}
				running = mat.getLine(line);
				if (redp.verbose_entropy) {
					if (redp.tot_lines >= entropy_evaluation) {
						running = false;
					}
				}
			} else {
				running = false;
			}
		}

		std::cerr << "[ " << IOTools::now() << " ] Thread " << thr
				<< " completed. " << redp.tot_lines << " k-mers analysed, "
				<< redp.kept << " kept \n";
		redp.close();

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
	final_ofs << "kmer";
	for (uint64_t g = 0; g < bm.group_map.size(); g++) {
		for (uint64_t h = g + 1; h < bm.group_map.size(); h++) {
			final_ofs << "\t" << bm.unique_groups[g] << "_x_"
					<< bm.unique_groups[h];
		}
	}
	for (uint64_t g = 0; g < bm.group_map.size(); g++) {
		final_ofs << "\t" << bm.unique_groups[g];
	}
	if (entropy_evaluation > 0) {
		final_ofs << "\tEntropy\tEntropy_threshold";
	}
	final_ofs << "\n";
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
}
;

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
	BinaryMatrix bm(file_in, false);
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
		BinaryMatrix mat(file_in, false);
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
		KmerMatrixLine<double> line;
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
				std::pair<std::vector<uint32_t>, double> dcount =
						Stats::discretize(line.count, nbins, sigthr);
				if (dcount.first.size() > 0) {
					uint32_t diff;
					double weight = 1 - dcount.second;
					for (i = 0; i < nsam; i++) {
						if (dcount.first[i] != 0) {
							for (j = i + 1; j < nsam; j++) {
								if (dcount.first[j] != 0) {
									diff = std::abs(
											(int) (dcount.first[j]
													- dcount.first[i]));
									if (diff == 0) {
										interactions(i, j) += (2 * weight);
									} else if (diff == 1) {
										interactions(i, j) += weight;
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
				running = mat.getLine(line);
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
