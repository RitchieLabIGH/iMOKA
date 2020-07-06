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
					"e,entropy-adjustment-one",
					"The a1 adjustment value of the entropy filter",
					cxxopts::value<double>()->default_value("0.25"))(
					"E,entropy-adjustment-two",
					"The a2 adjustment value of the entropy filter",
					cxxopts::value<double>()->default_value("0.05"))(
					"c,cross-validation", "Maximum number of cross validation",
					cxxopts::value<uint64_t>()->default_value("100"))(
					"s,standard-deviation",
					"Standard deviation to achieve convergence in cross validation. Suggested between 0.5 and 2",
					cxxopts::value<double>()->default_value("0.5"))("b,batch",
					"format: \"a-b\" -> Process only the baches from a to b.",
					cxxopts::value<std::string>()->default_value("all"))(
					"m,min",
					"Minimum raw count that at least one sample has to have to consider a k-mer",
					cxxopts::value<int>()->default_value("5"));
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
					parsedArgs["batch"].as<std::string>(),
					parsedArgs["cross-validation"].as<uint64_t>(),
					parsedArgs["standard-deviation"].as<double>(),
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

		if (std::string(argv[1]) == "models") {
			cxxopts::Options options("iMOKA models",
					"Use the Genetic algorithm to find the combinations of features able to classify your samples.");
			options.add_options()("i,input",
					"The input matrix JSON header or a text matrix",
					cxxopts::value<std::string>())("o,output",
					"Output json file", cxxopts::value<std::string>())(
					"l,kmer-list",
					"List of kmers to extract from the binary matrix",
					cxxopts::value<std::string>()->default_value("None"))(
					"m,method", "Machine learning method to use [SM|NBC|RF]",
					cxxopts::value<std::string>()->default_value("NBC"))(
					"t,training-percentage",
					"The percentage of the min class used as training size",
					cxxopts::value<double>()->default_value("0.3"))(
					"c,cross-validation", "Maximum number for cross validation",
					cxxopts::value<uint64_t>()->default_value("10000"))(
					"s,standard-deviation",
					"Standard deviation to achieve convergence in cross validation",
					cxxopts::value<double>()->default_value("0.05"))(
					"d,max-dimension", "The max dimension of the chromosomes",
					cxxopts::value<uint64_t>()->default_value("10"))(
					"p,population",
					"The number of individuals in the population",
					cxxopts::value<uint64_t>()->default_value("40"))(
					"g,generation-max", "Maximum number of generations",
					cxxopts::value<uint64_t>()->default_value("1000"))(
					"e,elite",
					"Number of elite individuals to preserve each round",
					cxxopts::value<uint64_t>()->default_value("5"))(
					"crossing-over-fraction", "Crossing over fraction",
					cxxopts::value<double>()->default_value("0.70"))(
					"mutation-rate", "Individual mutation rate",
					cxxopts::value<double>()->default_value("0.40"))(
					"gene-mutation-rate", "Gene mutation rate",
					cxxopts::value<double>()->default_value("0.20"))(
					"total-runs", "Number of runs",
					cxxopts::value<uint64_t>()->default_value("10"))(
					"best-stall-max",
					"Interrupt the GA after n generations having the same best score",
					cxxopts::value<uint64_t>()->default_value("10"))(
					"average-stall-max",
					"Interrupt the GA after n generations having the same average score",
					cxxopts::value<uint64_t>()->default_value("10"))("trees",
					"Number of trees (RF model)",
					cxxopts::value<uint64_t>()->default_value("100"))(
					"min-leaf",
					"Minimum number of element in a leaf (RF model)",
					cxxopts::value<uint64_t>()->default_value("2"))("h,help",
					"Show this help");
			auto parsedArgs = options.parse(argc, argv);
			if (IOTools::checkArguments(parsedArgs, { "input", "output" },
					log)) {
				log << options.help() << "\n";
				return false;
			}
			return geneticAlgorithm(parsedArgs["kmer-list"].as<std::string>(),
					parsedArgs["input"].as<std::string>(),
					parsedArgs["output"].as<std::string>(),
					parsedArgs["method"].as<std::string>(),
					parsedArgs["cross-validation"].as<uint64_t>(),
					parsedArgs["standard-deviation"].as<double>(),
					parsedArgs["training-percentage"].as<double>(),
					parsedArgs["max-dimension"].as<uint64_t>(),
					parsedArgs["population"].as<uint64_t>(),
					parsedArgs["generation-max"].as<uint64_t>(),
					parsedArgs["crossing-over-fraction"].as<double>(),
					parsedArgs["mutation-rate"].as<double>(),
					parsedArgs["gene-mutation-rate"].as<double>(),
					parsedArgs["elite"].as<uint64_t>(),
					parsedArgs["total-runs"].as<uint64_t>(),
					parsedArgs["trees"].as<uint64_t>(),
					parsedArgs["min-leaf"].as<uint64_t>(),
					parsedArgs["best-stall-max"].as<uint64_t>(),
					parsedArgs["average-stall-max"].as<uint64_t>());
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
		std::string file_out, int min, std::string batch,
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
	bm.clear();
	std::cerr << "Memory occupied: "
			<< IOTools::format_space_human(IOTools::getCurrentProcessMemory())
			<< ".\n";
	std::cerr << "Reducing with " << omp_get_max_threads()
			<< " threads, each analysing a maximum total of " << batch_size
			<< " k-mers.\n";
	std::cerr.flush();
	json info = { { "cross_validation", cross_validation }, {
			"standard_deviation", sd }, { "minimum_count", min }, { "min_acc",
			min_acc }, { "perc_test", perc_test },
			{ "adjustments", adjustments }, { "file_in", file_in }, {
					"file_out", file_out } };
	;
#pragma omp parallel firstprivate(cross_validation, sd, min_acc, perc_test, adjustments, min )
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
		while (running) {
			if (line.getKmer() <= to_kmer) {
				tot_lines++;
				if (*std::max_element(line.raw_count.begin(),
						line.raw_count.end()) >= min) {
					entropy = Stats::entropy(line.count);
					if (entropy >= minEntropy) {
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
								entropy_update_every = entropy_update_every
										+ 30;
								localMinEntropy = max_entropy;
							}
							ofs << line.getKmer();
							for (double &v : res)
								ofs << "\t" << v;
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
;
/// @param list_of_kmers
/// @param matrix_file
/// @param output_json
/// @param method
/// @param cross_validation
/// @param sd
/// @param perc_test
/// @param max_dimension
/// @param population
/// @param generation_max
/// @param CO_fraction
/// @param MUT_rate
/// @param GENE_MUT_rate
/// @param ELITE_count
/// @param total_runs
/// @param numTrees
/// @param minLeaf
/// @param best_stall_max
/// @param average_stall_max
bool Classification::geneticAlgorithm(std::string list_of_kmers,
		std::string matrix_file, std::string output_json, std::string method,
		uint64_t cross_validation, double sd, double perc_test,
		uint64_t max_dimension, uint64_t population, uint64_t generation_max,
		double CO_fraction, double MUT_rate, double GENE_MUT_rate,
		uint64_t ELITE_count, uint64_t total_runs, uint64_t numTrees,
		uint64_t minLeaf, uint64_t best_stall_max, uint64_t average_stall_max) {

	std::map<std::string, double> feature_prevalence; // it's the score given to each feature.

	log << "Loading the features ";
	std::vector<MatrixLine*> rows;
	std::vector<uint64_t> groups;
	std::map<uint64_t, uint64_t> group_counts;
	std::vector<std::string> groups_names, sample_names;
	std::vector<TextMatrixLine> text_rows;
	std::vector<KmerMatrixLine> kmer_rows;
	if (list_of_kmers == "None") {
		log << "from the text matrix " << matrix_file << "\n";
		TextMatrix mat(matrix_file);
		text_rows = mat.getLines();
		for (int i = 0; i < text_rows.size(); i++) {
			rows.push_back(&text_rows[i]);
		}
		groups = mat.groups;
		group_counts = mat.group_counts;
		groups_names = mat.unique_groups;
		sample_names = mat.col_names;
	} else {
		log << "from the binary matrix " << matrix_file << "\n";
		BinaryMatrix mat(matrix_file, true);
		std::vector<std::string> request = IOTools::getLinesFromFile(
				list_of_kmers);
		kmer_rows = mat.getLines(request);
		for (int i = 0; i < kmer_rows.size(); i++) {
			rows.push_back(&kmer_rows[i]);
		}
		groups = mat.groups;
		group_counts = mat.group_counts;
		groups_names = mat.unique_groups;
		sample_names = mat.col_names;
	}
	uint64_t n_features = rows.size(), n_classes = group_counts.size(),
			n_samples = groups.size();
	for (auto gr : group_counts) {
		log << gr.first << " = " << gr.second << "\n";
	}
	mlpack::Log::Warn.ignoreInput = true;
	typedef std::vector<uint64_t> MySolution;
	typedef double MyMiddleCost;
	typedef EA::Genetic<MySolution, MyMiddleCost> GA_Type;
	typedef EA::GenerationType<MySolution, MyMiddleCost> Generation_Type;

	std::ofstream ofs(output_json);
	json infos = { { "cross_validation", cross_validation }, { "perc_test",
			perc_test }, { "max_dimension", max_dimension }, { "population",
			population }, { "generation_max", generation_max }, { "CO_fraction",
			CO_fraction }, { "MUT_rate", MUT_rate }, { "GENE_MUT_rate",
			GENE_MUT_rate }, { "total_runs", total_runs }, { "elite",
			ELITE_count }, { "version", "0.1" }, { "method", method }, {
			"best-stall-max", best_stall_max }, { "average-stall-max",
			average_stall_max } };

	static std::function<
			double(const std::vector<std::vector<double>>,
					const std::vector<uint64_t>,
					const std::map<uint64_t, uint64_t>, const uint64_t,
					const double, double)> objective;
	static std::function<
			json(const std::vector<std::vector<double>>,
					const std::vector<uint64_t>,
					const std::map<uint64_t, uint64_t>, const uint64_t,
					const double, double)> best_model;
	if (method == "SM" || method == "LR") {
		objective = MLpack::softmaxClassifier;
		best_model = MLpack::softmaxClassifierBaggingModel;
		log << "Using Softmax classifier\n";
	} else if (method == "NBC") {
		objective = MLpack::naiveBayesClassifier;
		best_model = MLpack::naiveBayesClassifierBaggingModel;
		log << "Using Naive Bayes classifier\n";
	} else if (method == "RF") {
		objective = [numTrees, minLeaf](
				const std::vector<std::vector<double>> values,
				const std::vector<uint64_t> groups,
				const std::map<uint64_t, uint64_t> group_counts,
				const uint64_t crossValidation, const double sd,
				double perc_test) {
			return MLpack::randomForestClassifier(values, groups, group_counts,
					crossValidation, sd, perc_test, numTrees, minLeaf);
		};
		best_model = [numTrees, minLeaf](
				const std::vector<std::vector<double>> values,
				const std::vector<uint64_t> groups,
				const std::map<uint64_t, uint64_t> group_counts,
				const uint64_t crossValidation, const double sd,
				double perc_test) {
			return MLpack::randomForestClassifierModelBagging(values, groups,
					group_counts, crossValidation, sd, perc_test, numTrees,
					minLeaf);
		};
		log << "Using Random Forest classifier with " << numTrees
				<< " trees and " << minLeaf << " min leaf\n";
	} else {
		throw "Method " + method + " not recognized!";
		exit(1);
	}

	log << "Features: " << rows.size() << "\n";
	ofs << "{  \"models\" : [\n";
	log << "Starting the GA :\n";
	log << infos.dump(2) << "\n";
	std::vector<std::vector<double>> prob_classification_per_training_sample(
			groups.size());
	for (auto &el : prob_classification_per_training_sample)
		el.resize(group_counts.size());
	std::map<std::string, std::string> index_to_feature;
	std::vector<uint64_t> time_seen(rows.size() + 1, 0);
	std::vector<uint64_t> time_seen_init(rows.size() + 1, 0);
	for (int run = 0; run < total_runs; run++) {
		if (run > 0)
			ofs << ",\n";
		log << "Round " << run << "\n";

		// Preparing the vector to balance the init of the individuals. Not used in mutation
		std::vector<uint64_t> ordered_genes(n_features);
		std::iota(ordered_genes.begin(), ordered_genes.end(), 0);
		std::random_shuffle(ordered_genes.begin(), ordered_genes.end());
		if (run > 0) {
			std::sort(ordered_genes.begin(), ordered_genes.end(),
					[&](auto a, auto b) {
						return time_seen_init[a] < time_seen_init[b];
					});
		}
		GA_Type ga_obj;
		ga_obj.problem_mode = EA::GA_MODE::SOGA;
		ga_obj.multi_threading = true;
		ga_obj.N_threads = omp_get_max_threads();
		ga_obj.best_stall_max = best_stall_max;
		ga_obj.average_stall_max = average_stall_max;
		ga_obj.idle_delay_us = 1; // switch between threads quickly
		ga_obj.verbose = false;
		ga_obj.elite_count = ELITE_count;
		ga_obj.population = population;
		ga_obj.generation_max = generation_max;
		ga_obj.crossover_fraction = CO_fraction;
		ga_obj.mutation_rate = MUT_rate;
		ga_obj.calculate_SO_total_fitness = [](
				const GA_Type::thisChromosomeType &X) {
			return X.middle_costs;
		};
		ga_obj.SO_report_generation =
				[&](int generation_number,
						const EA::GenerationType<MySolution, MyMiddleCost> &last_generation,
						const MySolution &best_genes) {
					for (auto &g : last_generation.chromosomes) {
						for (auto &r : g.genes) {
							time_seen[r]++;
						}
					}
					if (ga_obj.verbose) {
						std::cout << "Generation [" << generation_number
								<< "], " << "Best="
								<< last_generation.best_total_cost << ", "
								<< "Average=" << last_generation.average_cost
								<< ", " << "Best genes=(";
						for (int i = 0; i < best_genes.size(); i++) {
							std::cout << (i == 0 ? "" : ",")
									<< (best_genes[i] == n_features ?
											"None" :
											rows[best_genes[i]]->getName());
						}
						std::cout << ")" << ", " << "Exe_time="
								<< last_generation.exe_time << std::endl;
					}
				};
		ga_obj.init_genes = [&](MySolution &p,
				const std::function<double(void)> &rnd01) {
			p.clear();
			for (int i = 0; i < max_dimension; i++) {
				double rnd_num = rnd01();
				if (rnd_num > (1 - GENE_MUT_rate)) {
					p.push_back(n_features); // a null gene
				} else {
					rnd_num /= (1 - GENE_MUT_rate); // bring it back between 0 and 1
					uint64_t new_num = std::floor(rnd_num * (n_features / 2)); // Take genes from the 50% lower genes that had not been frequently observed
					if (std::find(p.begin(), p.end(), ordered_genes[new_num])
							== p.end()) { // Check that the gene is not already in the individual
						p.push_back(ordered_genes[new_num]);
					} else {
						p.push_back(n_features); // a null gene
					}
				}
				time_seen_init[p[i]]++;
			}
		};
		ga_obj.eval_solution = [&](const MySolution &p, MyMiddleCost &c) {
			std::vector<std::vector<double>> data;
			for (auto i : p)
				if (i != n_features) {
					data.push_back(rows[i]->count);
				}
			if (data.size() > 0) {
				c = objective(data, groups, group_counts, cross_validation, sd,
						perc_test);
				c = 100 - c;
				return true;
			} else {
				c = 100;
				return false;
			}
		};
		ga_obj.mutate = [&](const MySolution &X_base,
				const std::function<double(void)> &rnd01, double shrink_scale) {
			MySolution X_new;
			// shrink not used since there is no distance between features
			for (int i = 0; i < X_base.size(); i++) {
				if (rnd01() < GENE_MUT_rate) {
					X_new.push_back(std::floor(rnd01() * n_features));
				} else {
					X_new.push_back(X_base[i]);
				}
			}
			return X_new;
		};
		ga_obj.crossover = [](const MySolution &X1, const MySolution &X2,
				const std::function<double(void)> &rnd01) {
			MySolution X_new;
			for (int i = 0; i < X1.size(); i++) {
				if (rnd01() > 0.5) {
					X_new.push_back(X1[i]);
				} else {
					X_new.push_back(X2[i]);
				}
			}
			return X_new;
		};

		log.flush();
		auto reason = ga_obj.solve();

		const MySolution &winner =
				ga_obj.last_generation.chromosomes[ga_obj.last_generation.best_chromosome_index].genes;
		std::vector<std::vector<double>> data;
		std::vector<uint64_t> features_winners;
		double n_solutions = 0;
		for (auto i : winner) {
			if (i != n_features) {
				data.push_back(rows[i]->count);
				n_solutions++;
				features_winners.push_back(i);
				index_to_feature[std::to_string(i)] = rows[i]->getName();
			}
		}
		log << "Done: " << ga_obj.stop_reason_to_string(reason)
				<< "\nBest model accuracy: "
				<< (100 - ga_obj.last_generation.best_total_cost) << " with "
				<< n_solutions << " features.\nSaving the model...\n";
		for (auto i : winner) {
			if (i != n_features) {
				feature_prevalence[std::to_string(i)] += (max_dimension
						/ n_solutions);
			}
		}
		json model = best_model(data, groups, group_counts, cross_validation,
				sd, perc_test);
		model["features"] = features_winners;
		model["classes"] = groups_names;
		model["accuracy"] = (100 - ga_obj.last_generation.best_total_cost);
		double model_acc = 0;
		json res = MLpack::predict(model, data);
		std::vector<double> probabilities = res["probabilities"];
		for (int sample = 0; sample < n_samples; sample++) {
			if (res["prediction"][sample] == groups[sample]) {
				model_acc += 1;
			}
			for (int c = 0; c < n_classes; c++) {
				prob_classification_per_training_sample[sample][c] +=
						probabilities[(sample * n_classes) + c];
			}
		}
		log << (model_acc * 100) / groups.size() << " final model accuracy.\n";
		model["model_accuracy"] = (model_acc * 100) / groups.size();
		model["stop_reason"] = ga_obj.stop_reason_to_string(reason);
		ofs << model.dump();
	}
	log << "done.\n";
	std::cout << "sample_name\tsample_group";
	for (auto g : groups_names)
		std::cout << "\tprob_" << g;
	std::cout << "\n";
	for (int s = 0; s < prob_classification_per_training_sample.size(); s++) {
		std::cout << sample_names[s] << "\t" << groups_names[groups[s]];
		for (int c = 0; c < prob_classification_per_training_sample[s].size();
				c++) {
			prob_classification_per_training_sample[s][c] /= total_runs;
			std::cout << "\t" << prob_classification_per_training_sample[s][c];
		}
		if (std::distance(prob_classification_per_training_sample[s].begin(),
				std::max_element(
						prob_classification_per_training_sample[s].begin(),
						prob_classification_per_training_sample[s].end()))
				!= groups[s]) {
			std::cout << "\t*";
		}
		std::cout << "\n";
	}
	std::ofstream f("./time_seen.tsv");
	f << "k-mer\tseen\tinit\n";
	for (int i = 0; i < time_seen.size(); i++) {
		f << i << "\t" << time_seen[i] << "\t" << time_seen_init[i] << "\n";
	}
	f.close();
	infos["feature_prevalence"] = feature_prevalence;
	infos["sample_probabilities"] = prob_classification_per_training_sample;
	infos["index_to_feature"] = index_to_feature;
	infos["sample_names"] = sample_names;
	infos["sample_groups"] = groups;
	infos["groups_names"] = groups_names;
	infos["total_features"] = rows.size();
	ofs << "], \n \"info\" :  " << infos.dump() << "  }\n";
	ofs.close();
	return true;
}
}
} /* namespace kma */
