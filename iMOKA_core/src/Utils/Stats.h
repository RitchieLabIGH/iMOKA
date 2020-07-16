/*
 * Stats.h
 *
 *  Created on: Nov 9, 2018
 *      Author: claudio
 */

#ifndef UTILS_STATS_H_
#define UTILS_STATS_H_



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
class Stats {
public:
	Stats();
	virtual ~Stats();
	static double stderr(std::vector<double> & v) {
			return stdev(v, mean(v)) / std::sqrt(v.size());
	}

	static double stdev(std::vector<double> & v) {
		return stdev(v, mean(v));
	}
	static double stdev(std::vector<double> & v, double mean) {
		return std::sqrt(var(v, mean));
	}
	static double var(std::vector<double> & v){
		return var(v, mean(v));
	}
	static double var(std::vector<double> & v, double mean){
		double var = 0;
		for (auto & p : v) var += ((p - mean) * (p-mean));
		return var/(v.size()-1);
	}

	static double mean(std::vector<double> & v) {
		double sum = std::accumulate(v.begin(), v.end(), 0.0);
		return sum / (double) v.size();
	}
	/// Reascale the values in the the input vector. If zero scale, the old min is 0, otherwise it's calculated.
	/// @param values
	/// @param zero_scale
	/// @param new_max
	/// @param new_min
	template <class T>
	static void rescale(std::vector<T> & values, bool zero_scale=true, T new_max=100, T new_min=0) {
		T max = *std::max_element(values.begin(), values.end());
		T min =zero_scale? 0 :  *std::min_element(values.begin(), values.end());
		for (uint64_t i = 0; i < values.size(); i++) {
			values[i] = ((values[i]-min) * ((new_max-new_min )/( max-min ))) + new_min;
		}
	}

	static std::vector<int64_t> distanceFromMean(std::string file,
			std::map<std::string, std::vector<uint64_t>> & groupMap);
	static std::pair<double, double> f_test(std::vector<double> & vect,
			std::vector<uint64_t> & groups,
			std::map<uint64_t, uint64_t> & grp_counts);
	static std::pair<double, double> t_test(std::vector<double> & a,std::vector<double> & b, bool equalVar);
	static std::pair<double, double> t_test_unequalVar(std::vector<double> & a,std::vector<double> & b){
		return Stats::t_test(a, b ,false);
	}
	static std::pair<double, double> MannWhitneyUTest(const std::vector<double> & a,const std::vector<double> & b);
	static std::pair<double, double> wald_log_test(std::vector<double> & a,std::vector<double> & b);
	static double correlationCoefficient(std::vector<double> &,
			std::vector<double> &);
	static double max_fold(std::vector<double> &, std::vector<double>& );
	static double median(std::vector<double> );
	static double entropy(std::vector<double> );
	static std::vector<double> getQuartiles(std::vector<double>);
	static std::vector<double> ranks(const std::vector<double> & );
	static double tiecorrect(const std::vector<double> & );
	static arma::Mat<double> euclideanDistance(const arma::Mat<double> & points);
	static void computeSilhuettes(const arma::Mat<double> &, arma::Row<size_t> &, std::vector<double> & , size_t );
	static std::pair<std::vector<uint32_t>, double> discretize(const std::vector<double> & data, const uint32_t & n_bin,const double & min_nonzero);

};
}
#endif /* UTILS_STATS_H_ */
