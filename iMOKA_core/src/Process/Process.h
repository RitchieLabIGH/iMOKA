/*
 * Process.h
 *
 *  Created on: Sep 24, 2019
 *      Author: claudio
 */

#ifndef PROCESS_PROCESS_H_
#define PROCESS_PROCESS_H_

#include "../Utils/IOTools.hpp"
#include "../Matrix/BinaryMatrix.h"
#include "../Utils/MLpack.h"

namespace imoka {
namespace process {

using namespace imoka::matrix;
/* General process interface
 *
 */
class Process {
public:
	Process(std::streambuf *messages) :
			log(messages) {
	}
	;
	virtual ~Process() {
	}
	;
	virtual bool run(int argc, char **argv) {
		return false;
	}
	;
protected:
	std::ostream log;
};

template<class T>
class KmerLineProcess {
public:
	KmerLineProcess() {
	}
	;
	virtual ~KmerLineProcess() {
	}
	;
	virtual void run(KmerMatrixLine<T> &line) {
	}
	;
	virtual void close() {
	}

};

using reduction_fun= std::function<void(const std::vector<std::vector<double>> & ,const std::vector<uint64_t> ,const std::map<uint64_t, uint64_t> , const uint64_t , const double, const double , std::vector<double> & )>;

class ReductionProcess: public KmerLineProcess<double> {
public:
	ReductionProcess(uint64_t thread_number, std::ofstream &file_out,
			std::ofstream &log_file, std::vector<double> adjustments,
			BinaryMatrix &bm, int cv, bool entropy_evaluation, double stdev,
			double min_accuracy, double percentage_test, uint64_t starting_kmer,
			uint64_t ending_kmer) :
			ofs(file_out), tlog(log_file) {
		kmer_A = starting_kmer;
		kmer_Z = ending_kmer;
		thread = thread_number;
		sd = stdev;
		min_acc = min_accuracy;
		perc_test = percentage_test;

		ofs << std::fixed << std::setprecision(3);
		adj_down = adjustments[0];
		adj_up = adjustments[1];
		groups = bm.groups;
		group_counts = bm.group_counts;
		means.resize(group_counts.size());
		use_entropy = adj_down != 0 && adj_up != 0;
		verbose_entropy = entropy_evaluation && use_entropy;
		cross_validation = cv;
		use_cv = cross_validation >= 3;
		start = std::chrono::high_resolution_clock::now();
		tlog << "Perc\tTotal\tKept\tMinEntropy\tRunningTime\n";
		tlog.flush();

	}
	;
	std::chrono::_V2::system_clock::time_point start;
	bool use_entropy;
	bool verbose_entropy;
	bool use_cv;
	int cross_validation;
	reduction_fun fun = MLpack::pairwiseNaiveBayesClassifier;
	uint64_t thread = 0;
	std::ofstream &ofs;
	std::ofstream &tlog;
	uint64_t kmer_A;
	uint64_t kmer_Z;
	double max_entropy = 1000000.00;
	double localMinEntropy = max_entropy;
	double minEntropy = 0;
	double adj_down;
	double adj_up;
	double entropy = 0;
	double sd;
	double min_acc;
	double perc_test;
	bool keep = true;
	std::vector<double> means;
	uint64_t tot_lines = 0;
	uint64_t kept = 0;
	uint64_t entropy_update_every = 30;
	uint64_t last_update = 0;
	std::vector<uint64_t> groups;
	std::map<uint64_t, uint64_t> group_counts;
	std::vector<double> res;

	void run(KmerMatrixLine<double> &line) {
		tot_lines++;
		if (use_entropy)
			entropy = Stats::entropy(line.count);
		if (!use_entropy || entropy >= minEntropy || verbose_entropy) {
			fun( { line.count }, groups, group_counts, cross_validation, sd,
					perc_test, res);
			keep = false;
			for (double &v : res)
				keep = keep || v >= min_acc;
			if (keep) {
				kept++;
				if (use_entropy) {
					localMinEntropy =
							localMinEntropy < entropy ?
									localMinEntropy : entropy;
					last_update++;
					if (last_update >= entropy_update_every) {
						minEntropy =
								minEntropy == 0 ?
										localMinEntropy
												- (localMinEntropy * adj_down
														* 2) :
								localMinEntropy - (localMinEntropy * adj_down)
										< minEntropy ?
										minEntropy
												- (localMinEntropy * adj_down) :
										minEntropy + (localMinEntropy * adj_up);
						last_update = 0;
						entropy_update_every = entropy_update_every + 30;
						localMinEntropy = max_entropy;
					}
				}
			}
			if (keep || verbose_entropy) {
				ofs << line.getKmer();
				for (double &v : res)
					ofs << "\t" << v;
				std::fill(means.begin(), means.end(), 0);
				for (int i = 0; i < groups.size(); i++) {
					means[groups[i]] += line.count[i];
				}
				for (int g = 0; g < group_counts.size(); g++) {
					ofs << "\t" << (means[g] / group_counts[g]);
				}

				if (verbose_entropy) {
					ofs << "\t" << entropy << "\t" << minEntropy;
				}
				ofs << "\n";
			}
		}
		if (tot_lines % 100000 == 0) {
			log(line.getKmer().to_int());
		}
	}

	void close() {
		log(kmer_Z);
		tlog.close();
		ofs.close();
	}
private:
	void log(uint64_t current_kmer) {
		double perc =
				((current_kmer - kmer_A) / (long double) (kmer_Z - kmer_A))
						* 100;
		tlog << perc << "\t" << tot_lines << "\t" << kept << "\t" << minEntropy
				<< "\t"
				<< IOTools::format_time(
						std::chrono::duration_cast<std::chrono::seconds>(
								std::chrono::high_resolution_clock::now()
										- start).count()) << "\n";
		tlog.flush();
	}

}
;

class KmerMeanStdLine {
public:
	KmerMeanStdLine() {
		kmer = "";
		mean = 1;
		stdev = 0;
	}
	KmerMeanStdLine(std::string kmer, double mean, double stdev) :
			kmer(kmer), mean(mean), stdev(stdev) {
	}
	;
	virtual ~KmerMeanStdLine() {
	}
	;
	std::string kmer;
	double mean;
	double stdev;

};

class StableProcess: public KmerLineProcess<double> {
public:
	StableProcess(std::pair<double, double> stable_thr, uint64_t n_of_kmers,
			std::vector<std::vector<KmerMeanStdLine>> &results) :
			means_ranges(stable_thr) {
		max_n = n_of_kmers;
		res = &results;
		res->clear();
		res->resize(3);
	}
	;
	std::pair<double, double> means_ranges;
	uint64_t max_n = 10;
	double mean = 0;
	double sd = 0;
	std::vector<std::vector<KmerMeanStdLine>> *res = NULL;
	std::vector<KmerMeanStdLine> *vect = NULL;

	static std::pair<double, double> estimate_stable_thresholds(
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

	void run(KmerMatrixLine<double> &line) {
		if (*std::min_element(line.count.begin(), line.count.end()) > 0) {
			mean = Stats::mean(line.count);
			if (mean < means_ranges.first) {
				vect = &(res->at(0));
			} else if (mean > means_ranges.second) {
				vect = &(res->at(2));
			} else {
				vect = &(res->at(1));
			}
			sd = Stats::stdev(line.count, mean);
			if (vect->size() < max_n || sd < vect->at(max_n - 1).stdev) {
				vect->push_back( { line.getKmer().str(), mean, sd });
				if (vect->size() > max_n) {
					std::sort(vect->begin(), vect->end(), [](auto &a, auto &b) {
						return a.stdev < b.stdev;
					});
					vect->resize(max_n);
				}
			}
		}

	}

};

} /* namespace process */
;

} /* namespace imoka */

#endif /* PROCESS_PROCESS_H_ */
