/*
 * JFMatrix.cpp
 *
 *  Created on: Feb 4, 2019
 *      Author: claudio
 */

#include "BinaryMatrix.h"
namespace imoka {
namespace matrix {
BinaryMatrix::BinaryMatrix() {
}

BinaryMatrix::~BinaryMatrix() {
	// TODO Auto-generated destructor stub
}

void BinaryMatrix::create(std::string inFile, double rf, int64_t prefix_size) {
	std::cout << "Creating a binary file from " << inFile
			<< "\nRescale Factor: " << rf << "\n" << "Prefix size: "
			<< prefix_size << "\n";
	rescale_factor = rf;
	col_names.clear();
	col_groups.clear();
	count_files.clear();
	std::ifstream istr(inFile);
	std::string line;
	std::vector<std::string> columns;
	while (getline(istr, line)) {
		IOTools::split_rgx(columns, line);
		if (line != "") {
			if (columns.size() != 3) {
				std::cerr << "ERROR! input file not well formatted\n";
				exit(1);
			}
			if (IOTools::getFileSize(columns[0]) > 5
					|| IOTools::fileExists(columns[0] + ".sorted.bin")) {
				count_files.push_back(columns[0]);
				col_names.push_back(columns[1]);
				col_groups.push_back(columns[2]);
			} else {
				std::cerr << "Warning! File " << columns[0]
						<< " is empty and will be ignored.\n";
			}
		}
	}
	if (count_files.size() == 0) {
		std::cerr << "Error! Empty file " << inFile << "\n";
		exit(1);
	}
	istr.close();
	initGroupMaps();
	initKmerVector(prefix_size);
}

void BinaryMatrix::initKmerVector(int64_t prefix_size) {
	normalization_factors.resize(count_files.size());
	total_counts.resize(count_files.size());
	for (uint64_t i = 0; i < count_files.size(); i++) {
		if (IOTools::fileExists(count_files[i] + ".sorted.bin")
				|| (count_files[i].size() > 11
						&& ".sorted.bin"
								== count_files[i].substr(
										count_files[i].size() - 11))) {
			if (IOTools::fileExists(count_files[i] + ".sorted.bin")) {
				std::cerr << "File " << count_files[i]
						<< " has already a sorted bin file associated that will be used.\n";
				count_files[i] += ".sorted.bin";
			} else {
				std::cerr << "The file " << count_files[i]
						<< " is already in binary format.\n";
			}
		} else {
			std::cerr << i << " - " << count_files[i]
					<< "\nReading the sorted tsv kmer count text file.\n";
			BinaryDB::create(count_files[i], prefix_size);
			count_files[i] += ".sorted.bin";
		}
		BinaryDB tmp(count_files[i]);
		tmp.getNext();
		k_len = tmp.getKmer().k_len;
		total_counts[i] = tmp.getTotCount();
		normalization_factors[i] = (double) (total_counts[i] / rescale_factor);
		tmp.close();
	}

}

void BinaryMatrix::save(std::string file) {
	std::vector<uint64_t> total_prefix;
	std::vector<uint64_t> total_suffix;
	std::vector<uint64_t> prefix_size_header;
	for (auto count_file : count_files) {
		BinaryDB db(count_file);
		total_prefix.push_back(db.getTotPrefix());
		total_suffix.push_back(db.getTotSuffix());
		prefix_size_header.push_back(db.getPrefixSize());
	}

	std::cout << "Saving the matrix header to " << file << "\n";
	json header = { { "count_files", count_files },
			{ "groups", this->col_groups }, { "names", this->col_names }, {
					"total_prefix", total_prefix }, { "total_suffix",
					total_suffix }, { "total_counts", total_counts }, { "k_len",
					k_len }, { "prefix_size", prefix_size_header }, {
					"rescale_factor", rescale_factor } };
	std::ofstream ofs(file);
	ofs << header.dump() << '\n';
	ofs.close();
}

void BinaryMatrix::load(std::string file) {
	clear();
	source_file = file;
	std::ifstream ifs(file);
	json header = json::parse(ifs);
	ifs.close();
	for (auto e : header["count_files"]) {
		count_files.push_back(e);
	}
	for (auto e : header["groups"]) {
		col_groups.push_back(e);
	}
	for (auto e : header["names"]) {
		col_names.push_back(e);
	}
	for (auto e : header["total_counts"]) {
		total_counts.push_back(e);
	}
	rescale_factor = header["rescale_factor"];
	normalization_factors.clear();
	for (auto c : total_counts) {
		normalization_factors.push_back(double(c / rescale_factor));
	}
	if (header.count("k_len")) {
		k_len = header["k_len"];
	} else {
		k_len = header["key_len"]; // Little typo still present in some matrices.
	}
	initGroupMaps();
	initDBs();
	n_of_bd = bin_databases.size();
}

void BinaryMatrix::initDBs() {
	bin_databases.resize(count_files.size());
	current_kmers.clear();
	if (!custom_buffer_size) {
		if (getenv("IMOKA_MAX_MEM_GB")) {
			try {
				uint32_t max_mem = std::stoll(getenv("IMOKA_MAX_MEM_GB"));
				BinaryDB tmp(count_files[0]);
				int64_t up_size = tmp.getUnitPrefixSize(), us_size =
						tmp.getUnitSuffixSize(), n_thr = omp_get_max_threads(),
						n_db = count_files.size();
				double max_mem_bit = max_mem * 1000000000;
				max_mem_bit -= (up_size * 1000 * n_db * n_thr);
				binary_db_buffer = std::ceil(
						(max_mem_bit) / (us_size * n_db * n_thr));
				tmp.close();
				if (binary_db_buffer < 1000) {
					binary_db_buffer = 1000;
				}
			} catch (std::exception &e) {
				std::cerr << "WARNING: environmental IMOKA_MAX_MEM_GB "
						<< getenv("IMOKA_MAX_MEM_GB")
						<< " has to be an integer number.\n" << e.what()
						<< "\n";
			}
		} else {
			if (getenv("IMOKA_INNER_BUFFER_SIZE")) {
				try {
					binary_db_buffer = std::stoll(
							getenv("IMOKA_INNER_BUFFER_SIZE"));
				} catch (std::exception &e) {
					std::cerr
							<< "WARNING: environmental IMOKA_INNER_BUFFER_SIZE "
							<< getenv("IMOKA_INNER_BUFFER_SIZE")
							<< " has to be an integer number.\n" << e.what()
							<< "\n";
				}
			}
		}
	}
	for (uint64_t sample = 0; sample < count_files.size(); sample++) {
		bin_databases[sample].setBufferSize(binary_db_buffer);
		if (!bin_databases[sample].open(count_files[sample])) {
			std::cerr << "WARNING! Database " << count_files[sample]
					<< " is empty! \n";
		}
	}
}

std::vector<Kmer> BinaryMatrix::getPartitions(uint64_t n) {
	BinaryDB &biggest = bin_databases[0];
	for (auto &db : bin_databases) {
		if (db.size() > biggest.size()) {
			biggest = db;
		}
	}
	return biggest.getPartitions(n);
}

void BinaryMatrix::clear() {
	for (auto &bdb : bin_databases) {
		bdb.close();
	}
	current_line = 0;
}

bool BinaryMatrix::getLine(KmerMatrixLine<uint32_t> &line) {
	if (!isOpen()) {
		for (uint64_t sample = 0; sample < count_files.size(); sample++) {
			if (bin_databases[sample].getNext()) {
				current_kmers.insert(bin_databases[sample].getKmer());
			}
		}
		if (!isOpen()) {
			return false;
		}
	}

	if (line.count.size() != n_of_bd) {
		line.count.resize(bin_databases.size());
	}
	line.setKmer(*(current_kmers.begin()));
	current_kmers.erase(current_kmers.begin());
	line.index = current_line++;
	for (uint64_t i = 0; i < n_of_bd; i++) {
		if (bin_databases[i].getKmer() == line.getKmer()) {
			line.count[i] = (bin_databases[i].getCount());
			if (bin_databases[i].getNext()) {
				current_kmers.insert((bin_databases[i].getKmer()));
			}
		} else {
			line.count[i] = 0;
		}
	}
	return true;
}

bool BinaryMatrix::getLine(KmerMatrixLine<double> &line) {
	if (!isOpen()) {
		for (uint64_t sample = 0; sample < count_files.size(); sample++) {
			if (bin_databases[sample].getNext()) {
				current_kmers.insert(bin_databases[sample].getKmer());
			}
		}
		if (!isOpen()) {
			return false;
		}
	}

	if (line.count.size() != n_of_bd) {
		line.count.resize(bin_databases.size());
	}
	line.setKmer(*(current_kmers.begin()));
	current_kmers.erase(current_kmers.begin());
	line.index = current_line++;
	for (uint64_t i = 0; i < n_of_bd; i++) {
		if (bin_databases[i].getKmer() == line.getKmer()) {
			line.count[i] = ((bin_databases[i].getCount())
					/ normalization_factors[i]);
			if (bin_databases[i].getNext()) {
				current_kmers.insert((bin_databases[i].getKmer()));
			}
		} else {
			line.count[i] = 0;
		}
	}
	return true;

}

void BinaryMatrix::getLines(std::vector<Kmer> &request,
		std::vector<KmerMatrixLine<double>> &response) {
	response.clear();
	response.resize(request.size());
	uint64_t row = 0;
	for (auto &l : response) {
		l.count.resize(normalization_factors.size(), 0);
		l.setKmer(request[row]);
		l.index = row;
		row++;
	}
	std::vector<std::vector<double>> columns(bin_databases.size());
#pragma omp parallel for schedule(dynamic, 1)
	for (uint64_t i = 0; i < bin_databases.size(); i++) {
		columns[i] = bin_databases[i].getKmers(request);
	}
	for (uint64_t i = 0; i < bin_databases.size(); i++) {
		for (uint64_t j = 0; j < response.size(); j++) {
			if (columns[i][j] != 0.0)
				response[j].count[i] = columns[i][j] / normalization_factors[i];
		}
	}
	return;
}

void BinaryMatrix::getLine(Kmer &request, KmerMatrixLine<uint32_t> &response) {
	response.count.resize(normalization_factors.size(), 0);
	response.setKmer(request);
	std::vector<std::vector<double>> columns(bin_databases.size());
#pragma omp parallel for schedule(dynamic, 1)
	for (uint64_t i = 0; i < bin_databases.size(); i++) {
		if (bin_databases[i].go_to(request)) {
			response.count[i] = bin_databases[i].getCount();
		} else {
			response.count[i] = 0;
		}
	}
	return;
}

void BinaryMatrix::getLines(std::vector<Kmer> &request,
		std::vector<KmerMatrixLine<uint32_t>> &response) {
	response.clear();
	response.resize(request.size());
	uint64_t row = 0;
	for (auto &l : response) {
		l.count.resize(normalization_factors.size(), 0);
		l.setKmer(request[row]);
		l.index = row;
		row++;
	}
	std::vector<std::vector<double>> columns(bin_databases.size());
#pragma omp parallel for schedule(dynamic, 1)
	for (uint64_t i = 0; i < bin_databases.size(); i++) {
		columns[i] = bin_databases[i].getKmers(request);
	}
	for (uint64_t i = 0; i < bin_databases.size(); i++) {
		for (uint64_t j = 0; j < response.size(); j++) {
			if (columns[i][j] != 0.0)
				response[j].count[i] = columns[i][j];
		}
	}
	return;
}

/// @return the percentage (approximate) of the current position

double BinaryMatrix::perc() {
	double out = 0;
	for (uint64_t i = 0; i < bin_databases.size(); i++) {
		out += bin_databases[i].perc();
	}
	return out / bin_databases.size();
}

bool BinaryMatrix::go_to(Kmer &target) {
	current_kmers.clear();
	for (auto &bdb : bin_databases) {
		bdb.go_to(target);
		if (bdb.getKmer() >= target) {
			current_kmers.insert(bdb.getKmer());
		}

	}
	return true;
}

}
}
