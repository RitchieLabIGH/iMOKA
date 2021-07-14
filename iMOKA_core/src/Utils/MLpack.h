/*
 * MLpack.h
 *
 *  Created on: Feb 11, 2019
 *      Author: claudio
 */

#ifndef MACHINELEARNING_MLPACK_H_
#define MACHINELEARNING_MLPACK_H_

#include <map>
#include <vector>

#include "IOTools.hpp"
#include <mlpack/methods/logistic_regression/logistic_regression.hpp>
#include <mlpack/methods/softmax_regression/softmax_regression.hpp>
#include <mlpack/methods/naive_bayes/naive_bayes_classifier.hpp>
#include <mlpack/methods/random_forest/random_forest.hpp>
#include <mlpack/core/data/split_data.hpp>
#include <boost/archive/text_iarchive.hpp>
#include <boost/archive/text_oarchive.hpp>
#include <mlpack/methods/dbscan/dbscan.hpp>
#include <mlpack/methods/kmeans/kmeans.hpp>
#include "Stats.hpp" // Contains already mlpack/core, necessary for armadillo library inclusion

namespace imoka {
typedef const std::function<double(const arma::Mat<double>&,const arma::Row<size_t>&, const arma::Mat<double>&,const arma::Row<size_t>& )> classifier;

struct ClusterizationResult {
	std::vector<std::vector<double>> data;
	std::vector<size_t> clusters;
	std::vector<double> silhuettes;
	double silhuettes_score;
	arma::Mat<double> distances;
	int number_of_clusters;
};
///Interface for the MLPack library : http://mlpack.org/doc/mlpack-3.1.1/doxygen/index.html
///
class MLpack {
public:
	MLpack();
	virtual ~MLpack();
	static std::vector<double> logisticRegressionClassifier(const std::vector<std::vector<double>> & values,const std::vector<uint64_t> groups,const std::map<uint64_t, uint64_t>  group_counts, const uint64_t crossValidation, const double sd,  const double perc_train);
	static double softmaxClassifier(const std::vector<std::vector<double>> values,const std::vector<uint64_t> groups,const std::map<uint64_t, uint64_t>  group_counts, const uint64_t crossValidation, const double sd,  const double perc_train);
	static json softmaxClassifierBaggingModel(const std::vector<std::vector<double>> values,const std::vector<uint64_t> groups,const std::map<uint64_t, uint64_t>  group_counts, const uint64_t crossValidation,  const double sd,  const double perc_train);
	static void pairwiseNaiveBayesClassifier(const std::vector<std::vector<double>> & values,const std::vector<uint64_t> groups,const std::map<uint64_t, uint64_t>  group_counts, const uint64_t crossValidation, const double sd, const double perc_train, std::vector<double> & out);
	static double naiveBayesClassifier(const std::vector<std::vector<double>> values,const std::vector<uint64_t> groups,const std::map<uint64_t, uint64_t>  group_counts, const uint64_t crossValidation, const double sd,  const double perc_train);
	static json naiveBayesClassifierBaggingModel(const std::vector<std::vector<double>> values,const std::vector<uint64_t> groups,const std::map<uint64_t, uint64_t>  group_counts, const uint64_t crossValidation,  const double sd,  const double perc_train);
	static double randomForestClassifier(const std::vector<std::vector<double>> values,const std::vector<uint64_t> groups,const std::map<uint64_t, uint64_t>  group_counts, const uint64_t crossValidation, const double sd,  const double perc_train, int numTrees, int minimumLeafSize);
	static json randomForestClassifierModelBagging(const std::vector<std::vector<double>> values,const std::vector<uint64_t> groups,const std::map<uint64_t, uint64_t>  group_countss, const uint64_t crossValidation, const double sd,  const double perc_train, int numTrees, int minimumLeafSize);
	static double accuracy(const arma::Row<size_t> & prediction,const arma::Row<size_t> & real);
	static json predict(json model, std::vector<std::vector<double>> data);
	static void splitTrainingTest(const std::vector<std::vector<double>> & values,
			const std::vector<uint64_t> & groups, arma::Mat<double> & trainingData,
			arma::Mat<double> & testData, arma::Row<size_t> & trainingLabels,
			arma::Row<size_t> & testLabels, double perc_train, uint64_t min_group, std::set<uint64_t> groups_to_use);
	static ClusterizationResult DBSCAN(const std::vector<std::vector<double>> & data, const double epsilon, const double minCluster );
	static ClusterizationResult KMEANS(const std::vector<std::vector<double>> & data, const double clusters, const size_t minCluster );
	template<class T>
	static std::string modelToString(T & model);
	template<class T>
	static void stringToModel(std::string & s, T & model);
	template<typename T>
	static arma::Mat<double>  predict_probabilities(const std::string & model_str,const arma::Mat<double> & data );
private:
	static std::vector<double> pairwise_classification(const classifier & classification_function , const std::vector<std::vector<double>> & values,const std::vector<uint64_t> & groups,const std::map<uint64_t, uint64_t> & group_counts, const uint64_t & crossValidation , double & sd,  double & perc_test);
	static void pairwise_classification(const classifier & classification_function , const std::vector<std::vector<double>> & values,const std::vector<uint64_t> & groups,const std::map<uint64_t, uint64_t> & group_counts, const uint64_t & crossValidation, double & sd,  double & perc_train, std::vector<double> & out);
	static double multiclass_classification(const classifier classification_function, const std::vector<std::vector<double>> values,const std::vector<uint64_t> groups,const std::map<uint64_t, uint64_t>  group_counts, const uint64_t crossValidation,double sd, const double perc_train);
	static ClusterizationResult clusterize(const std::vector<std::vector<double>> & data,const std::function<int64_t(arma::Mat<double> &, arma::Row<size_t>&)> & fun);
};
}
#endif /* MACHINELEARNING_MLPACK_H_ */
