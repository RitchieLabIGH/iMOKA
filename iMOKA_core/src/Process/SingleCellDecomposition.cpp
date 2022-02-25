/*
 * SingleCellDecomposition.cpp
 *
 *  Created on: Nov 18, 2021
 *      Author: claudio
 */

#include "SingleCellDecomposition.h"

namespace imoka {
namespace process {

using namespace matrix;

bool SingleCellDecomposition::run(int argc, char **argv) {
	try {
		if (std::string(argv[1]) == "sc_learn") {
			cxxopts::Options options("iMOKA sc_learn",
					"Learn from scRNA-seq data the k-mer distribution within the clusters.");
			options.add_options()("i,input",
					"The input folder, a Cell Ranger output folder",
					cxxopts::value<std::string>())("o,output", "Output folder",
					cxxopts::value<std::string>()->default_value(
							"./SCKBD_learn/"))("h,help", "Show this help")(
					"c,clusters",
					"An alternative cluster file than the one present in the Cell Ranger output",
					cxxopts::value<std::string>()->default_value("default"))(
					"k,k-mer-length", "The size of the k-mer",
					cxxopts::value<int>()->default_value("31"));
			auto parsedArgs = options.parse(argc, argv);
			if (parsedArgs.count("help") != 0
					|| IOTools::checkArguments(parsedArgs, { "input" }, log)) {
				log << "Help for the single cell learn process \n"
						<< options.help() << "\n";
				return false;
			}
			return learn(parsedArgs["input"].as<std::string>(),
					parsedArgs["output"].as<std::string>(),
					parsedArgs["k-mer-length"].as<int>(),
					parsedArgs["clusters"].as<std::string>());
		}

		if (std::string(argv[1]) == "sc_decompose") {
			cxxopts::Options options("iMOKA sc_decompose",
					"Decompose a FASTQ file into single cell cluster FASTQ files");
			options.add_options()("i,input", "The input FASTQ file",
					cxxopts::value<std::string>())("p,paired",
					"The second paired FASTQ file",
					cxxopts::value<std::string>()->default_value("None"))(
					"c,counts",
					"The output folder of the learn process containing the counts to use",
					cxxopts::value<std::string>()->default_value(
							"./SCKBD_learn/counts/"))("o,output",
					"Output folder",
					cxxopts::value<std::string>()->default_value(
							"./SCKBD_decompose/"))("h,help", "Show this help")(
					"a,augmentation",
					"Augment each read n times to distribute them across the samples",
					cxxopts::value<int>()->default_value("100"))("s,shift",
					"Extract the k-mers overlapping by k_len - shift",
					cxxopts::value<int>()->default_value("1"));
			auto parsedArgs = options.parse(argc, argv);
			if (parsedArgs.count("help") != 0
					|| IOTools::checkArguments(parsedArgs, { "input" }, log)) {
				log << "Help for the single cell decomposition process \n"
						<< options.help() << "\n";
				return false;
			}
			return decompose(parsedArgs["input"].as<std::string>(),
					parsedArgs["paired"].as<std::string>(),
					parsedArgs["output"].as<std::string>(),
					parsedArgs["counts"].as<std::string>(),
					parsedArgs["augmentation"].as<int>(),
					parsedArgs["shift"].as<int>());
		}

	} catch (const cxxopts::OptionException &e) {
		log << "Error parsing options: " << e.what() << std::endl;
		return false;
	}
	return false;
}

bool SingleCellDecomposition::learn(std::string input_folder,
		std::string output_folder, int k_len, std::string cluster) {
	std::string input_bam = input_folder + "/outs/possorted_genome_bam.bam";
	std::string input_cluster = input_folder
			+ "/outs/analysis/clustering/graphclust/clusters.csv";
	if (cluster != "default")
		input_cluster = cluster;
	IOTools::fileExists(input_bam, true);
	IOTools::fileExists(input_cluster, true);

	SplitBamRead splitter(output_folder + "/fastq/");
	splitter.load_clusters(input_cluster);
	std::vector<uint32_t> clusters_sizes = splitter.getClustersSizes();
	std::vector<std::string> fq_files = splitter.getOutFiles();
	log
			<< "\niMOKA - sc_learn: learn from scRNA-seq data processed by Cell Ranger.\n\n";
	for (int i = 0; i < clusters_sizes.size(); i++) {
		log << "  - Cluster " << i + 1 << " = " << clusters_sizes[i]
				<< " cells\n";
	}
	log.flush();
	BamReader bam;
	bam.registerCallbackProcess(
			std::bind(&SplitBamRead::split, &splitter, std::placeholders::_1,
					std::placeholders::_2));
	bam.openFile(input_bam);
	log << "\n 1) Splitting the BAM file...";
	log.flush();
	bam.processAll();
	log << "Done\n";
	splitter.close();
	log << " 2) Counting the k-mer in each cluster with KMC3\n";
	IOTools::makeDir(output_folder + "/counts/");

	for (int i = 0; i < clusters_sizes.size(); i++) {
		json clus;
		clus["id"] = i + 1;
		clus["name"] = "C" + std::to_string(i + 1);
		clus["cell_counts"] = clusters_sizes[i];
		log << " - Cluster " << i + 1;
		std::string file_name = output_folder + "/counts/Cluster_"
				+ std::to_string(i + 1);
		IOTools::makeDir(file_name + "_tmp");
		std::string command = std::string(
				"kmc -cs4294967295 -k" + std::to_string(k_len) + " -ci3 -fq -t"
						+ std::to_string(omp_get_max_threads()) + " -m"
						+ getenv("IMOKA_MAX_MEM_GB") + " " + fq_files[i] + " "
						+ file_name + " " + file_name + "_tmp ");
		log << command << "\n";
		int err = system(command.c_str());
		while (err != 0) {
			if (err == 2) {
				exit(2);
			}
			log << "\tKMC3 failed! " << err << " Retrying...\n";
			err = system(command.c_str());
		}
		command = std::string(
				"kmc_tools transform " + file_name + " dump -s " + file_name
						+ ".txt");
		log << command << "\n";
		err = system(command.c_str());
		while (err != 0) {
			if (err == 2) {
				exit(2);
			}
			log << "\tKMC3 dump failed! " << err << " Retrying...\n";

			err = system(command.c_str());
		}
		command = "rm -fr " + file_name + ".kmc* " + file_name + "_tmp";
		err = system(command.c_str());
		BinaryDB::create(file_name + ".txt", -1);
		clus["bin_file"] = file_name + ".txt.sorted.bin";
		clus["k_len"] = k_len;
		std::ofstream ofs(file_name + ".json");
		ofs << clus.dump() << '\n';
		ofs.close();

	}

	return true;
}

static void _compute_frequencies(std::vector<float> &result,
		std::set<Kmer> query, BinaryMatrix &bm) {
	std::vector<KmerMatrixLine<uint32_t>> kmers;
	bm.getLines(query, kmers);
	std::fill(result.begin(), result.end(), 0);
	int n_groups = bm.col_names.size();
	for (int i = 0; i < n_groups; i++) {
		for (int j = 0; j < kmers.size(); j++) {
			result[i] += kmers[j].count[i];
		}
		result[i] /= bm.normalization_factors[i];
	}
	return;
}

static void compute_frequencies(std::vector<float> &result,
		std::string &query_str, std::string &query2_str, BinaryMatrix &bm,
		std::regex &re, int shift) {
	std::set<Kmer> query = Kmer::generateKmersMasked(query_str, bm.k_len, re,
			true, shift);
	if (query2_str.size() != 0) {
		std::set<Kmer> query2 = Kmer::generateKmersMasked(query2_str, bm.k_len,
				re, true, shift);
		query.insert(query2.begin(), query2.end());
	}
	_compute_frequencies(result, query, bm);
	float sum = imoka::sum(result);
	if (sum != 0) {
		for (int i = 0; i < result.size(); i++) {
			result[i] /= sum;
		}
	} else {
		if (shift != 1) {
			std::set<Kmer> all_query = Kmer::generateKmersMasked(query_str,
					bm.k_len, re, true, 1), diff_query;
			std::set_difference(all_query.begin(), all_query.end(),
					query.begin(), query.end(),
					std::inserter(diff_query, diff_query.end()));
			_compute_frequencies(result, diff_query, bm);
			sum = imoka::sum(result);
			if (sum != 0) {
				for (int i = 0; i < result.size(); i++) {
					result[i] /= sum;
				}
			}
		}
	}
	return;
}
bool SingleCellDecomposition::decompose(std::string input_file,
		std::string paired, std::string output_folder, std::string counts,
		int augmentation, int shift) {
	std::vector<std::string> binary_files;
	std::vector<std::string> names;
	std::vector<int> cell_counts;
	int64_t k_len = -1;
	std::vector<std::string> files = IOTools::GetDirectoryFiles(counts);
	BinaryDBFetch tmp;
	for (std::string file : files) {
		if (file.find(".json") == file.size() - 5) {
			std::ifstream ifs(counts + "/" + file);
			json clj = json::parse(ifs);
			ifs.close();
			IOTools::fileExists(clj["bin_file"], true);
			tmp.open(clj["bin_file"]);
			if (k_len == -1) {
				k_len = tmp.getKlen();
			} else {
				if (k_len != tmp.getKlen()) {
					throw "Error! file " + file
							+ " has a different k_len than the others!\n";
				}
			}
			tmp.close();
			names.push_back(clj["name"]);
			binary_files.push_back(clj["bin_file"]);
			cell_counts.push_back(clj["cell_counts"]);
		}
	}
	if (binary_files.size() == 0) {
		std::cerr << "Error! No json files found in " + counts + "\n";
		exit(1);
	}
	std::string matrix_file = output_folder + "/matrix.json";
	json header = { { "count_files", binary_files }, { "names", names }, {
			"cell_counts", cell_counts }, { "k_len", k_len } };
	std::ofstream hofs(matrix_file);
	hofs << header.dump() << '\n';
	hofs.close();
	log << "Found " << binary_files.size() << " clusters: \n";
	BinaryMatrix bm(matrix_file, true);

	FastqRead read1, read2;
	FastqReader reader1, reader2;
	reader1.open(input_file);
	std::regex re(".*/(.*)(_1)?\\.(fq|fastq)(\\.gz)?");
	std::smatch matches;
	std::string in_base;
	if (std::regex_search(input_file, matches, re)) {
		in_base = matches[1].str() + "_";
	} else {
		in_base = "Cluster_";
	}

	bool is_pe = false;
	if (paired != "None") {
		IOTools::fileExists(paired, true);
		reader2.open(paired);
		is_pe = true;
	}
	IOTools::makeDir(output_folder);
	std::string base_file = output_folder + "/" + in_base;
	std::vector<std::ofstream*> outputs;
	std::vector<std::ofstream*> outputs_pe;
	int n_sam = bm.col_names.size();
	std::vector<std::string> col_names = bm.col_names;
	for (int i = 0; i < n_sam; i++) {
		if (is_pe) {
			std::ofstream *ofs = new std::ofstream(
					base_file + bm.col_names[i] + "_1.fq");
			outputs.push_back(ofs);
			std::ofstream *ofs2 = new std::ofstream(
					base_file + bm.col_names[i] + "_2.fq");
			outputs_pe.push_back(ofs2);
		} else {
			std::ofstream *ofs = new std::ofstream(
					base_file + bm.col_names[i] + ".fq");
			outputs.push_back(ofs);
		}
	}
	if (is_pe) {
		std::ofstream *ofs = new std::ofstream(base_file + "others_1.fq");
		outputs.push_back(ofs);
		std::ofstream *ofs2 = new std::ofstream(base_file + "others_2.fq");
		outputs_pe.push_back(ofs2);
	} else {
		std::ofstream *ofs = new std::ofstream(base_file + "others.fq");
		outputs.push_back(ofs);
	}

	std::ofstream ofs_perc(output_folder + "/percentages.tsv");

	int max_buffer = 10000, n = 0;
	uint64_t tot_processed = 0;
	std::vector<std::pair<FastqRead, FastqRead>> buffer(max_buffer);
	std::vector<float> empty(n_sam, 0);
	bm.clear();
	std::vector<std::vector<float>> results(max_buffer, empty);
	std::vector<double> total(n_sam + 1, 0);
	bool running = reader1.getRead(read1);
	int i, c, j;
	log << "Starting the procedure...\n";
	while (running) {
		if (is_pe) {
			if (!reader2.getRead(read2)) {
				throw "The two files have a different number of reads!\n";
			}
		}
		buffer[n] = { read1, read2 };
		n++;
		tot_processed++;
		running = reader1.getRead(read1);
		if (n == max_buffer || !running) {
			log << tot_processed << "\r";
			log.flush();
			int n_by_thr = std::floor(n / omp_get_max_threads());
#pragma omp parallel firstprivate(matrix_file, is_pe, n, n_by_thr, shift)
			{
				BinaryMatrix binm(matrix_file, true);
				binm.loadAllPrefixBuffers();
				std::string to_filter = std::to_string(
						std::max(3, (int) std::ceil(binm.k_len / 3))),
						empty_str = "";
				std::string regex = "(^A{" + to_filter + ",}.*|^T{" + to_filter
						+ ",}.*|.*A{" + to_filter + ",}$|.*T{" + to_filter
						+ ",})";
				std::regex re(regex);
				int from_n = omp_get_thread_num() * n_by_thr;
				int to_n = (1 + omp_get_thread_num()) * n_by_thr;
				if (omp_get_thread_num() == omp_get_max_threads() - 1) {
					to_n = n;
				}
				for (int t = from_n; t < to_n; t++) {
					if (is_pe) {
						compute_frequencies(results[t],
								buffer[t].first.sequence,
								buffer[t].second.sequence, binm, re, shift);
					} else {
						compute_frequencies(results[t],
								buffer[t].first.sequence, empty_str, binm, re,
								shift);
					}
				}
				binm.clear();
			}
			uint64_t written = 0, c;
			for (i = 0; i < n; i++) {
				written = 0;
				ofs_perc << buffer[i].first.name;
				for (c = 0; c < bm.col_names.size(); c++) {
					ofs_perc << "\t" << results[i][c];
					if (results[i][c] != 0) {
						total[c] += results[i][c];
						written += 1;
						j = std::ceil(augmentation * results[i][c]);
						while (j > 0) {
							*(outputs[c]) << buffer[i].first.name << "\n";
							*(outputs[c]) << buffer[i].first.sequence << "\n";
							*(outputs[c]) << buffer[i].first.info << "\n";
							*(outputs[c]) << buffer[i].first.quality << "\n";
							if (is_pe) {
								*(outputs_pe[c]) << buffer[i].second.name
										<< "\n";
								*(outputs_pe[c]) << buffer[i].second.sequence
										<< "\n";
								*(outputs_pe[c]) << buffer[i].second.info
										<< "\n";
								*(outputs_pe[c]) << buffer[i].second.quality
										<< "\n";
							}
							j--;
						}
					}
				}
				ofs_perc << "\n";
				if (written == 0) {
					c = n_sam;
					total[c] += 1;
					*(outputs[c]) << buffer[i].first.name << "\n";
					*(outputs[c]) << buffer[i].first.sequence << "\n";
					*(outputs[c]) << buffer[i].first.info << "\n";
					*(outputs[c]) << buffer[i].first.quality << "\n";
					if (is_pe) {
						*(outputs_pe[c]) << buffer[i].second.name << "\n";
						*(outputs_pe[c]) << buffer[i].second.sequence << "\n";
						*(outputs_pe[c]) << buffer[i].second.info << "\n";
						*(outputs_pe[c]) << buffer[i].second.quality << "\n";
					}
				}
			}
			n = 0;
			break;
		}
	}
	ofs_perc.close();
	for (auto &f : outputs)
		f->close();
	double tot_sum = imoka::sum(total);
	log << "\nDone.\nClusters percentages:\n";
	for (int i = 0; i < n_sam; i++) {
		log << " - " << col_names[i] << ": " << (total[i] / tot_sum) * 100
				<< "\n";
	}
	log << " - Others: " << (total[n_sam] / tot_sum) * 100 << "\n";
	log.flush();
	bm.clear();
	return true;
}

}/* namespace process */
} /* namespace imoka */
