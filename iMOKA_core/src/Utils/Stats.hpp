/*
 * Stats.h
 *
 *  Created on: Nov 9, 2018
 *      Author: claudio
 */

#ifndef UTILS_STATS_HPP_
#define UTILS_STATS_HPP_



#include <string>
#include <vector>
#include <map>
#include <numeric>
#include <math.h>
#include <algorithm>
#include <cmath>
#include <stdint.h>
#include <fstream>
#include <iostream>
#include "cephes/mconf.h"
#include <mlpack/core.hpp>


namespace imoka {



extern "C" {
double fdtrc(int ia, int ib, double x);
double stdtr(int k, double t);
double ndtr(double x);
double ndtri(double x);
}

template<class T>
double sum(const std::vector<T> &a) {
	double s = 0;
	for (int i = 0; i < a.size(); i++) {
		s += a[i];
	}
	return s;
}

template<class T>
double mean(const std::vector<T> &a) {
	return sum(a) / a.size();
}

template<class T>
double sqsum(const std::vector<T> &a) {
	double s = 0;
	for (int i = 0; i < a.size(); i++) {
		s += pow(a[i], 2);
	}
	return s;
}

template<class T>
std::vector<T> operator-(const std::vector<T> &a, const T &b) {
	std::vector<T> retvect(a.size());
	for (int i = 0; i < a.size(); i++) {
		retvect[i] = (a[i] - b);
	}
	return retvect;
}

template<class T>
std::vector<double> operator/(const std::vector<T> &a, const T &b) {
	std::vector<double> retvect(a.size());
	for (int i = 0; i < a.size(); i++) {
		retvect[i] = (a[i] / (double) b);
	}
	return retvect;
}

template<class T>
std::vector<T> operator*(const std::vector<T> &a, const std::vector<T> &b) {
	std::vector<T> retvect;
	for (int i = 0; i < a.size(); i++) {
		retvect.push_back(a[i] * b[i]);
	}
	return retvect;
}



class Stats {
public:
	Stats() {};
	virtual ~Stats() {};
	template<class T>
	static double stderr(std::vector<T> & v) {
			return stdev(v, mean(v)) / std::sqrt(v.size());
	}
	template<class T>
	static double stdev(std::vector<T> & v) {
		return stdev(v, mean(v));
	}
	template<class T>
	static double stdev(std::vector<T> & v, double mean) {
		return std::sqrt(var(v, mean));
	}

	template<class T>
	static double var(std::vector<T> & v){
		return var(v, mean(v));
	}

	template<class T>
	static double var(std::vector<T> & v, double mean){
		double var = 0;
		for (auto & p : v) var += ((p - mean) * (p-mean));
		return var/(v.size()-1);
	}
	template<class T>
	static double mean(std::vector<T> & v) {
		double sum = std::accumulate(v.begin(), v.end(), 0.0);
		return sum / (double) v.size();
	}
	/// Reascale the values in the the input vector. If zero scale, the old min is 0, otherwise it's calculated.
	/// @param values
	/// @param zero_scale
	/// @param new_max
	/// @param new_min
	template<class T>
	static void rescale(std::vector<T> & values, bool zero_scale=true, T new_max=100, T new_min=0) {
		T max = *std::max_element(values.begin(), values.end());
		T min =zero_scale? 0 :  *std::min_element(values.begin(), values.end());
		for (uint64_t i = 0; i < values.size(); i++) {
			values[i] = ((values[i]-min) * ((new_max-new_min )/( max-min ))) + new_min;
		}
	}

	template<class T>
	static std::pair<double, double> f_test(std::vector<T> &vect,
			std::vector<uint64_t> &groups,
			std::map<uint64_t, uint64_t> &grp_counts) {
		///
		/// Adapted from Python f_oneway function [sklearn]. It assumes the groups are ints in [0,n_of_groups)
		///

		if (vect.size() != groups.size()) {
			std::cerr
					<< "Stats::f_test [ERROR]= data and group vector have different size!\n";
			exit(1);
		}
		uint64_t n_classes = grp_counts.size();
		double n_samples = vect.size();
		//  n_samples_per_class = np.array([a.shape[0] for a in args]) -> grp_counts
		//  n_samples = np.sum(n_samples_per_class)  -> vect.size()
		double ss_alldata = 0;
		double summ_all = 0;
		std::vector<double> sums_args(n_classes, 0.);

		for (uint64_t i = 0; i < vect.size(); i++) {
			ss_alldata += (vect[i] * vect[i]);
			sums_args[groups[i]] += vect[i];
			summ_all += (vect[i]);

		}

		double square_of_sums_alldata = summ_all * summ_all;
		std::vector<double> square_of_sums_args;
		double ssbn = 0;
		for (uint64_t i = 0; i < n_classes; i++) {
			square_of_sums_args.push_back(sums_args[i] * sums_args[i]);
			ssbn += (square_of_sums_args[i] / grp_counts[i]);
		}

		ssbn -= (square_of_sums_alldata / n_samples);
		double sstot = (ss_alldata - (square_of_sums_alldata / n_samples));
		double sswn = sstot - ssbn;
		int dfbn = n_classes - 1;
		int dfwn = n_samples - n_classes;
		double msb = ssbn / (double) (n_classes - 1);
		double msw = sswn / (double) dfwn;
		double f = msb / msw;
		double prob = fdtrc(dfbn, dfwn, f);
		return std::pair<double, double>(f, prob);
	}


	template<class T>
	static std::pair<double, double> t_test(std::vector<T> &a, std::vector<T> &b,
			bool equal_val) {

		///
		/// Adapted from Python ttest_ind function [scipy]. It assumes the groups are ints in [0,1]. Verify with R t.test
		/// return pair<double, double> where first is the statistic and the second is the p-value

		if (a.size() == 0 || b.size() == 0) {
			std::cerr << "Stats::t_test [ERROR]  one of the group has size 0!\n";
			exit(1);
		}
		double v1 = var(a), v2 = var(b);
		int n1 = n1 = a.size(), n2 = b.size();
		double df, stderr, svar, d, t, prob;
		if (equal_val) {
			df = n1 + n2 - 2.0;
			svar = 0;
			if (n1 > 1)
				svar += (n1 - 1) * v1;
			if (n2 > 1)
				svar += (n2 - 1) * v2;
			svar /= df;

			stderr = sqrt(svar * ((1.0 / n1) + (1.0 / n2)));
		} else {
			double stderra = sqrt(v1 / n1), stderrb = sqrt(v2 / n2);
			stderr = sqrt(pow(stderra, 2) + pow(stderrb, 2));
			df = pow(stderr, 4)
					/ ((pow(stderra, 4) / (n1 - 1)) + (pow(stderrb, 4) / (n2 - 1)));
		}
		t = (mean(a) - mean(b)) / stderr;
		prob = 2 * stdtr(df, -abs(t));
		return std::pair<double, double>(t, prob);
	}

	template<class T>
	static std::pair<double, double> t_test_unequalVar(std::vector<T> & a,std::vector<T> & b){
		return Stats::t_test(a, b ,false);
	}


	template<class T>
	static std::pair<double, double> MannWhitneyUTest(const std::vector<T> &a,
			const std::vector<T> &b) {

		/// Impremented form scipy.stats.mannwhitneyu
		/// @param a
		/// @param b
		/// @return
		// Generate the ranks
		std::vector<double> X = a;
		X.insert(X.end(), b.begin(), b.end());
		int n1 = a.size(), n2 = b.size();
		std::vector<T> ranks = Stats::ranks(X);
		std::pair<double, double> out;
		out.first = (n1 * n2) + ((n1 * (n1 + 1)) / 2)
				- std::accumulate(ranks.begin(), ranks.begin() + n1, 0.0);
		out.first =
				out.first > n1 * n2 - out.first ? out.first : n1 * n2 - out.first; // Keep the max between U1 and U2
		double Tie = Stats::tiecorrect(ranks);
		if (Tie != 0) { // Otherwise all the ranks are equal
			double sd = std::sqrt(Tie * n1 * n2 * (n1 + n2 + 1) / 12.0), meanrank =
					((n1 * n2) / 2.0) + 0.5; /// 0.5 = continuity correction
			double z = (out.first - meanrank) / sd;
			out.second = ndtr(std::abs(z));
			out.second = 2 * (out.second > 0.5 ? (1 - out.second) : out.second);
		} else {
			out.second = 1;
		}
		return out;
	}


	template<class T>
	static std::pair<double, double> wald_log_test(std::vector<T> &a,
			std::vector<T> &b) {
		/// TODO: it's to fix. There must be something wrong since it doesn't follow the ttest
		/// @param a
		/// @param b
		/// @return pair < statistic, p-value >
		///
		/// From  doi: 10.1186/1752-0509-5-S3-S1
		///
		int n1 = a.size(), n2 = b.size();
		if (n1 == 0 || n1 == 0) {
			std::cerr
					<< "Stats::wald_log_test [ERROR]  one of the group has size 0!\n";
			exit(1);
		}
		double sum_a = sum(a), sum_b = sum(b);
		double t = log((sum_a / n1) / (sum_b / n2))
				/ sqrt((2 + (n1 / n2) + (n2 / n1)) / (sum_a + sum_b));
		double pval = 2 * ndtr(std::abs(t));
		return std::pair<double, double>(t, pval);
	}


	template<class T>
	static double correlationCoefficient(std::vector<T> &X, std::vector<T> &Y) {
		///
		/// from https://www.geeksforgeeks.org/program-find-correlation-coefficient/
		///
		int n = X.size();
		float sum_X = 0, sum_Y = 0, sum_XY = 0;
		float squareSum_X = 0, squareSum_Y = 0;
		for (int i = 0; i < n; i++) {
			// sum of elements of array X.
			sum_X = sum_X + X[i];

			// sum of elements of array Y.
			sum_Y = sum_Y + Y[i];

			// sum of X[i] * Y[i].
			sum_XY = sum_XY + X[i] * Y[i];

			// sum of square of array elements.
			squareSum_X = squareSum_X + X[i] * X[i];
			squareSum_Y = squareSum_Y + Y[i] * Y[i];
		}

		return (float) (n * sum_XY - sum_X * sum_Y)
				/ sqrt(
						(n * squareSum_X - sum_X * sum_X)
								* (n * squareSum_Y - sum_Y * sum_Y));
	}

	template<class T>
	static double max_fold(std::vector<T> &a, std::vector<T> &b) {
		double ma = mean(a), mb = mean(b);
		return ma == 0 && mb == 0 ? 0 :
				ma == 0 || mb == 0 ? std::numeric_limits<double>::infinity() :
				ma > mb ? ma / mb : mb / ma;
	}

	template<class T>
	static double median(std::vector<T> X) {
		std::sort(X.begin(), X.end());
		return X.size() % 2 == 0 ?
				X[X.size() / 2] : ((X[X.size() / 2] + X[(X.size() / 2) + 1]) / 2);
	}

	template<class T>
	static double entropy(std::vector<T> X) {
		///
		/// Cross checked with R package DescTools.
		///
		double tot = sum(X);
		X = X / tot;
		double H = 0;
		for (double &x : X) {
			H += (x * (x == 0 ? 0 : std::log2(x)));
		}
		return -H;
	}

	template<class T>
	static std::vector<T> getQuartiles(std::vector<T> X) {
		if (X.size() == 0) {
			return {0,0,0};
		}
		std::sort(X.begin(), X.end());
		if (X.size() > 2) {
			if ( X.size() % 2 == 0 ){
				return {X[std::round(X.size()*0.25)], X[std::round(X.size()*0.5)],X[std::round(X.size()*0.75)]};
			} else {
				return {X[std::round(X.size()*0.25)], (X[std::floor(X.size()*0.5)] + X[std::ceil(X.size()*0.5)])/2 ,X[std::round(X.size()*0.75)]};
			}
		} else {
			return {X[0], (X.size()==1 ? X[0] : ((X[0]+X[1]) /2)), X[X.size()==1 ? 0 : 1 ]};
		}
	}


	template<class T>
	static std::vector<T> ranks(std::vector<T> const &X) {
		int N = X.size(), r, s, i, j;
		std::vector<T> ranks(N);
		for (i = 0; i < N; i++) {
			r = 1;
			s = 1;
			for (j = 0; j < i; j++) {
				if (X[j] < X[i])
					r++;
				if (X[j] == X[i])
					s++;
			}
			for (j = i + 1; j < N; j++) {
				if (X[j] < X[i])
					r++;
				if (X[j] == X[i])
					s++;
			}
			ranks[i] = r + ((s - 1) * 0.5);
		}

		return ranks;
	}


	template<class T>
	static double tiecorrect(const std::vector<T> &ranks) {
		/// Correction value for tie ranks in MWU test
		/// @param ranks
		/// @return
		///
		if (ranks.size() < 2)
			return 1;
		std::map<double, int> counts;
		for (auto v : ranks)
			counts[v]++;
		double out = 0;
		for (auto &p : counts) {
			out += (std::pow(p.second, 3) - p.second);
		}
		out /= (std::pow(ranks.size(), 3) - ranks.size());
		return 1 - out;
	}


	static arma::Mat<double> euclideanDistance(const arma::Mat<double> &data) {
		/// Compute the eculidean distances for data formatted as features ( row) and samples (colums).
		/// Tested against https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.euclidean_distances.html
		/// @param data
		/// @return distances

		arma::Mat<double> distances(data.n_cols, data.n_cols);
		// Store in the diagonal the dot products
		for (int s = 0; s < data.n_cols; s++) {
			distances(s, s) = arma::dot(data.col(s), data.col(s));
		}
		// Compute the euclidean distances for the upper matrix
		for (int i = 0; i < data.n_cols; i++) {
			for (int j = i + 1; j < data.n_cols; j++) {
				distances(i, j) = sqrt(
						distances(i, i) - (2 * arma::dot(data.col(i), data.col(j)))
								+ distances(j, j));
			}
		}
		for (int s = 0; s < data.n_cols; s++)
			distances(s, s) = 0;

		return distances;
	}


	template<class T>
	static std::pair<std::vector<uint32_t>, double> discretize(
			const std::vector<T> &data, const uint32_t &n_bins,
			const double &min_nonzero) {
		std::vector<uint32_t> out(data.size());
		double min_v = 0, max_v = 0;
		std::vector<uint32_t> idxs;
		for (uint32_t i = 0; i < data.size(); i++) {
			out[i] = 0;
			if (data[i] != 0) {
				if (data[i] < min_v || min_v == 0)
					min_v = data[i];
				if (data[i] > max_v)
					max_v = data[i];
				idxs.push_back(i);
			}
		}
		double non_zero = ((double(idxs.size())) / data.size());
		if (non_zero >= min_nonzero) {
			std::vector<std::vector<uint32_t>> bins(n_bins);
			double bin_size = (max_v - min_v) / (n_bins - 1);
			for (uint32_t &i : idxs) {
				bins[std::floor((data[i] - min_v) / bin_size)].push_back(i);
			}
			uint64_t c_cluster = 1;
			for (uint32_t b = 0; b < n_bins; b++) {
				for (uint32_t &i : bins[b])
					out[i] = c_cluster;
				c_cluster++;
			}
		} else {
			out.resize(0);
		}
		return {out, non_zero};
	}

	static void computeSilhuettes(const arma::Mat<double> &distances,
			arma::Row<size_t> &clusters, std::vector<double> &silhuette,
			size_t number_of_clusters) {

		/// Compute the silhuette for a distance matrix.
		/// Tha values are saved in the vectore siluhette, one for each sample.
		/// From  https://en.wikipedia.org/wiki/Silhouette_(clustering)
		/// Tested against https://scikit-learn.org/stable/modules/generated/sklearn.metrics.silhouette_samples.html
		/// @param data
		/// @param clusters
		/// @param shiluette

		clusters.reshape(1, distances.n_cols);
		arma::Row<double> a = arma::zeros<arma::Row<double>>(distances.n_cols), b =
				arma::zeros<arma::Row<double>>(distances.n_cols);

		int i, j, c;
		arma::Row<double> el_per_cluster = arma::zeros<arma::Row<double>>(
				number_of_clusters);
		for (i = 0; i < distances.n_cols; i++)
			el_per_cluster[clusters[i]]++;
		for (i = 0; i < distances.n_cols; i++) {
			if (el_per_cluster[clusters[i]] == 1
					|| clusters[i] >= number_of_clusters) {
				a[i] = 0;
				b[i] = 0;
			} else {
				arma::Row<double> dist_k = arma::zeros<arma::Row<double>>(
						number_of_clusters); // distances of the point from the clusters
				for (j = 0; j < distances.n_cols; j++) {
					if (i != j && clusters[j] < number_of_clusters) {
						dist_k[clusters[j]] +=
								(distances(i, j) == arma::datum::inf
										|| distances(i, j) == arma::datum::nan) ?
										1 : distances(i, j);
					}
				}
				a[i] = dist_k[clusters[i]] / (el_per_cluster[clusters[i]] - 1); // a has to be divided by the number of element in that cluster minus 1 (itself)
				dist_k /= el_per_cluster;
				dist_k[clusters[i]] = arma::max(dist_k) + 1; // assign the highest value to the self cluster, so it will be exlcuded by the next min
				b[i] = arma::min(dist_k); // assign the min to find the neirest neighbour
				if (a[i] == arma::datum::inf || a[i] == arma::datum::nan
						|| b[i] == arma::datum::inf || b[i] == arma::datum::nan) {
					a[i] = 0;
					b[i] = 0;
				}
			}
		}
		silhuette.resize(distances.n_cols);
		for (i = 0; i < distances.n_cols; i++) {
			silhuette[i] = a[i] == b[i] ? 0 :
							a[i] < b[i] ? 1 - (a[i] / b[i]) : (b[i] / a[i]) - 1;
		}
	}

};
}


#endif /* UTILS_STATS_HPP_ */
