/*
 * MLpack.cpp
 *
 *  Created on: Feb 11, 2019
 *      Author: claudio
 */

#include "MLpack.h"

namespace imoka {

MLpack::MLpack() {
	// TODO Auto-generated constructor stub

}

MLpack::~MLpack() {
	// TODO Auto-generated destructor stub
}

template<class T>
std::string MLpack::modelToString(T & model) {
	std::ostringstream oss;
	boost::archive::text_oarchive oa(oss);
	oa << model;
	return oss.str();
}

template<class T>
void MLpack::stringToModel(std::string & s, T & model) {
	std::istringstream iss(s);
	boost::archive::text_iarchive ia(iss);
	ia >> model;
	return;
}

std::vector<double> MLpack::logisticRegressionClassifier(
		const std::vector<std::vector<double>> & values,
		const std::vector<uint64_t> groups,
		const std::map<uint64_t, uint64_t> group_counts,
		const uint64_t crossValidation, double sd, double perc_test) {
	classifier cl =
			[](const arma::Mat<double>& trainingData,const arma::Row<size_t>& trainingLabels,const arma::Mat<double>& testData, const arma::Row<size_t>& testLabels) {
				mlpack::regression::LogisticRegression<> lr(trainingData,trainingLabels);
				return lr.ComputeAccuracy(testData, testLabels);
			};
	return pairwise_classification(cl, values, groups, group_counts,
			crossValidation, sd, perc_test);
}

double MLpack::softmaxClassifier(const std::vector<std::vector<double>> values,
		const std::vector<uint64_t> groups,
		const std::map<uint64_t, uint64_t> group_counts,
		const uint64_t crossValidation, const double sd, double perc_test) {
	const int n_grp = group_counts.size();
	classifier cl =
			[n_grp](const arma::Mat<double>& trainingData,const arma::Row<size_t>& trainingLabels,const arma::Mat<double>& testData,const arma::Row<size_t>& testLabels) {
				mlpack::regression::SoftmaxRegression softmax(trainingData,
						trainingLabels, n_grp);

				return softmax.ComputeAccuracy(testData, testLabels);
			};
	return multiclass_classification(cl, values, groups, group_counts,
			crossValidation, sd, perc_test);
}

json MLpack::softmaxClassifierBaggingModel(
		const std::vector<std::vector<double>> values,
		const std::vector<uint64_t> groups,
		const std::map<uint64_t, uint64_t> group_counts,
		const uint64_t crossValidation, const double sd,  double perc_test) {
	const int n_grp = group_counts.size();
	std::vector<std::pair<double, mlpack::regression::SoftmaxRegression>> models;
	classifier cl =
			[&](const arma::Mat<double>& trainingData,const arma::Row<size_t>& trainingLabels,const arma::Mat<double>& testData,const arma::Row<size_t>& testLabels) {
				mlpack::regression::SoftmaxRegression softmax(trainingData,
						trainingLabels, n_grp);
				double acc=softmax.ComputeAccuracy(testData, testLabels);
				models.push_back( {acc, softmax});
				return acc;
			};
	multiclass_classification(cl, values, groups, group_counts, crossValidation,
			sd, perc_test);
	std::vector<std::string> models_string;
	for (int i = 1; i < models.size(); i++) {
		models_string.push_back(MLpack::modelToString(models[i].second));
	}
	return { {"model", models_string}, {"algorithm" , "softmax"}, {"format" , "bagging"}};
}

std::vector<double> MLpack::pairwiseNaiveBayesClassifier(
		const std::vector<std::vector<double>> & values,
		const std::vector<uint64_t> groups,
		const std::map<uint64_t, uint64_t> group_counts,
		const uint64_t crossValidation, double sd,double perc_test) {
	classifier cl =
			[](const arma::Mat<double>& trainingData,const arma::Row<size_t>& trainingLabels,const arma::Mat<double>& testData, const arma::Row<size_t>& testLabels) {
				mlpack::naive_bayes::NaiveBayesClassifier<> naiv (trainingData, trainingLabels , 2, false );
				arma::Row<size_t> predictedLabels(testLabels.n_elem);
				naiv.Classify(testData, predictedLabels);
				/*arma::Mat<double> predictionProbs;
				naiv.Classify(testData, predictedLabels, predictionProbs);
				std::cerr << predictionProbs << "\n";*/
				return accuracy(predictedLabels, testLabels);
			};
	return pairwise_classification(cl, values, groups, group_counts,
			crossValidation, sd,  perc_test);
}

double MLpack::naiveBayesClassifier(
		const std::vector<std::vector<double>> values,
		const std::vector<uint64_t> groups,
		const std::map<uint64_t, uint64_t> group_counts,
		const uint64_t crossValidation, const double sd,double perc_test) {
	const int n_grp = group_counts.size();
	classifier cl =
			[n_grp](const arma::Mat<double>& trainingData,const arma::Row<size_t>& trainingLabels,const arma::Mat<double>& testData,const arma::Row<size_t>& testLabels) {
				mlpack::naive_bayes::NaiveBayesClassifier<> naiv (trainingData, trainingLabels , n_grp, false);
				arma::Row<size_t> predictedLabels(testLabels.n_elem);
				naiv.Classify(testData, predictedLabels);
				return accuracy(predictedLabels, testLabels);
			};
	return multiclass_classification(cl, values, groups, group_counts,
			crossValidation, sd,  perc_test);
}

json MLpack::naiveBayesClassifierBaggingModel(
		const std::vector<std::vector<double>> values,
		const std::vector<uint64_t> groups,
		const std::map<uint64_t, uint64_t> group_counts,
		const uint64_t crossValidation, const double sd, double perc_test) {
	const int n_grp = group_counts.size();
	std::vector<std::pair<double, mlpack::naive_bayes::NaiveBayesClassifier<>>> models;
	classifier cl =
			[&](const arma::Mat<double>& trainingData,const arma::Row<size_t>& trainingLabels,const arma::Mat<double>& testData,const arma::Row<size_t>& testLabels) {
				mlpack::naive_bayes::NaiveBayesClassifier<> naiv (trainingData, trainingLabels , n_grp, false);
				arma::Row<size_t> predictedLabels(testLabels.n_elem);
				naiv.Classify(testData, predictedLabels);
				double acc=accuracy(predictedLabels, testLabels);
				models.push_back( {acc, naiv});
				return acc;
			};
	multiclass_classification(cl, values, groups, group_counts, crossValidation,
			sd, perc_test);
	std::vector<std::string> models_string;
	for (int i = 1; i < models.size(); i++) {
		models_string.push_back(MLpack::modelToString(models[i].second));
	}
	json model = { { "model", models_string }, { "algorithm", "nbc" }, {
			"format", "bagging" } };
	return model;
}

double MLpack::randomForestClassifier(
		const std::vector<std::vector<double>> values,
		const std::vector<uint64_t> groups,
		const std::map<uint64_t, uint64_t> group_counts,
		const uint64_t crossValidation, const double sd, double perc_test,
		int numTrees, int minimumLeafSize) {

	const int n_grp = group_counts.size();
	classifier cl =
			[n_grp,numTrees,minimumLeafSize ](const arma::Mat<double>& trainingData,const arma::Row<size_t>& trainingLabels,const arma::Mat<double>& testData,const arma::Row<size_t>& testLabels) {
				mlpack::tree::RandomForest<> rf(trainingData, trainingLabels, n_grp, numTrees, minimumLeafSize);
				arma::Row<size_t> predictedLabels(testLabels.n_elem);
				rf.Classify(testData, predictedLabels);
				return accuracy(predictedLabels, testLabels);
			};
	return multiclass_classification(cl, values, groups, group_counts,
			crossValidation, sd,  perc_test);
}

/// The model is computed with all the samples as training
///
/// @param values
/// @param groups
/// @param group_counts
/// @param numTrees
/// @param minimumLeafSize
/// @return
json MLpack::randomForestClassifierModelBagging(
		const std::vector<std::vector<double>> values,
		const std::vector<uint64_t> groups,
		const std::map<uint64_t, uint64_t> group_counts,
		const uint64_t crossValidation, const double sd,
		const double perc_test, int numTrees, int minimumLeafSize) {
	const int n_grp = group_counts.size();
	std::vector<std::pair<double, mlpack::tree::RandomForest<>>> models;
	classifier cl =
			[&](const arma::Mat<double>& trainingData,const arma::Row<size_t>& trainingLabels,const arma::Mat<double>& testData,const arma::Row<size_t>& testLabels) {
				mlpack::tree::RandomForest<> rf(trainingData, trainingLabels, n_grp, numTrees, minimumLeafSize);
				arma::Row<size_t> predictedLabels(testLabels.n_elem);
				rf.Classify(testData, predictedLabels);
				double acc=accuracy(predictedLabels, testLabels);
				models.push_back( {acc, rf});
				return acc;
			};
	multiclass_classification(cl, values, groups, group_counts, crossValidation,
			sd, perc_test);
	std::vector<std::string> models_string;
	for (int i = 1; i < models.size(); i++) {
		models_string.push_back(MLpack::modelToString(models[i].second));
	}
	return { {"model", models_string}, {"algorithm" , "random_forest"}, {"format" , "bagging"}};
}


/// Compute the probability given a string representig a machine learning model of type T .
/// The probability output doesn't contain infinite or nan values.
///
/// @param model_str
/// @param data
/// @return
template<typename T>
arma::Mat<double> MLpack::predict_probabilities(
		const std::string & model_str, const arma::Mat<double> & data) {
	arma::Mat<double> probability;
	std::istringstream iss(model_str);
	boost::archive::text_iarchive ia(iss);
	T model;
	ia >> model;
	arma::Row<size_t> prediction;
	model.Classify(data, prediction, probability);
	if (!probability.is_finite()) {
			for (int r = 0; r < probability.n_rows; r++) {
				for (int c = 0; c < probability.n_cols; c++) {
					if (probability(r, c) == arma::datum::inf
							|| probability(r, c) == arma::datum::nan) {
						probability(r, c) = prediction(c) == r ? 1 : 0;
					}
				}
			}
		}
	return probability;
}

json MLpack::predict(json model, std::vector<std::vector<double>> data) {
	arma::Mat<double> probabilities;
	arma::Mat<double> dat(data.size(), data[0].size());
	for (int r = 0; r < dat.n_rows; r++) {
		for (int c = 0; c < dat.n_cols; c++) {
			dat(r, c) = data[r][c];
		}
	}
	std::vector<std::string> models_str;
	if (model.count("format") && model["format"] == "bagging") {
		for ( auto e : model["model"]) models_str.push_back(e);
	} else {
		models_str.push_back(model["model"]);
	}
	for (std::string model_str : models_str) {
		if (model["algorithm"] == "softmax") {
			if (probabilities.n_elem == 0) {
				probabilities = predict_probabilities<
						mlpack::regression::SoftmaxRegression>(model_str, dat);
			} else {
				probabilities += predict_probabilities<
						mlpack::regression::SoftmaxRegression>(model_str, dat);
			}
		} else if (model["algorithm"] == "nbc") {
			if (probabilities.n_elem == 0) {
				probabilities = predict_probabilities<
						mlpack::naive_bayes::NaiveBayesClassifier<>>(model_str,
						dat);
			} else {
				probabilities += predict_probabilities<
						mlpack::naive_bayes::NaiveBayesClassifier<>>(model_str,
						dat);
			}
		} else if (model["algorithm"] == "random_forest") {
			if (probabilities.n_elem == 0) {
				probabilities = predict_probabilities<
						mlpack::tree::RandomForest<> >(model_str, dat);
			} else {
				probabilities += predict_probabilities<
						mlpack::tree::RandomForest<> >(model_str, dat);
			}
		} else
			throw "Model not supported.";
	}
	arma::Row<size_t> prediction(1,probabilities.n_cols);
	probabilities/= models_str.size();
	double max_prob;
	for ( int c=0; c < probabilities.n_cols; c++){
		max_prob = arma::max(probabilities.col(c));
		for ( int r=0; r < probabilities.n_rows; r++){
			if ( probabilities(r,c) >= max_prob ){
				prediction(c) = r;
			}
		}
	}
	return { {"probabilities", probabilities}, {"prediction", prediction}};

}

std::vector<double> MLpack::pairwise_classification(
		const classifier classification_fun,
		const std::vector<std::vector<double>> & values,
		const std::vector<uint64_t> groups,
		const std::map<uint64_t, uint64_t> group_counts,
		const uint64_t crossValidation, const double sd, double perc_test) {
	arma::Mat<double> trainingData, testData;
	arma::Row<size_t> trainingLabels, testLabels;

	std::vector<double> results;
	uint64_t min_group = 10000;
	for (auto g : group_counts) {
		min_group = g.second < min_group ? g.second : min_group;
	}

	if ( crossValidation < 2 ){ // Use the training accuracy
		min_group=0;
	}
	for (uint64_t g = 0; g < group_counts.size(); g++) {
		for (uint64_t h = g + 1; h < group_counts.size(); h++) {
			std::vector<double> accuracies;
			for (int cv = 0; cv < crossValidation; cv++) {
				splitTrainingTest(values, groups, trainingData, testData,
						trainingLabels, testLabels, perc_test, min_group, { g,
								h });
				for (int i = 0; i < testLabels.n_elem; i++) {
					if (testLabels(i) == g)
						testLabels(i) = 0;
					else
						testLabels(i) = 1;
				}
				for (int i = 0; i < trainingLabels.n_elem; i++) {
					if (trainingLabels(i) == g)
						trainingLabels(i) = 0;
					else
						trainingLabels(i) = 1;
				}
				accuracies.push_back(
						classification_fun(trainingData, trainingLabels,
								testData, testLabels));
				if (accuracies.size() > 10) {
					if (Stats::stderr(accuracies) < sd) {
						cv = crossValidation;
					}
				}
			}
			results.push_back(Stats::mean(accuracies));
		}
	}
	return results;
}

double MLpack::multiclass_classification(const classifier cl,
		const std::vector<std::vector<double>> values,
		const std::vector<uint64_t> groups,
		const std::map<uint64_t, uint64_t> group_counts,
		const uint64_t crossValidation, const double sd, double perc_test) {
	std::vector<double> accuracies;
	std::vector<double> mean_accuracies;
	arma::Mat<double> trainingData, testData;
	arma::Row<size_t> trainingLabels, testLabels;
	std::vector<double> results;
	double mean;
	uint64_t min_group = 10000;
	std::set<uint64_t> groups_to_use;
	for (auto g : group_counts) {
		min_group = g.second < min_group ? g.second : min_group;
		groups_to_use.insert(g.first);
	}
	for (int cv = 0; cv < crossValidation; cv++) {
		splitTrainingTest(values, groups, trainingData, testData,
				trainingLabels, testLabels, perc_test, min_group,
				groups_to_use);
		accuracies.push_back(
				cl(trainingData, trainingLabels, testData, testLabels));
		mean=Stats::mean(accuracies);
		mean_accuracies.push_back(mean);
		if (mean_accuracies.size() > 10) {
			if (Stats::stdev(mean_accuracies) < sd ) {
				cv = crossValidation;
			}
			mean_accuracies.erase(mean_accuracies.begin());
		}
	}
	return Stats::mean(mean_accuracies);
}

double MLpack::accuracy(const arma::Row<size_t> & prediction,
		const arma::Row<size_t> & real) {
	size_t count = 0;
	for (size_t i = 0; i < prediction.n_elem; i++) {
		if (prediction(i) == real(i))
			count++;
	}
	return (double) (count * 100) / prediction.n_elem;
}

/// @param data
/// @param fun
/// @return
ClusterizationResult MLpack::clusterize(
		const std::vector<std::vector<double>> & data,
		const std::function<int64_t(arma::Mat<double> &, arma::Row<size_t> &)> & fun) {
	ClusterizationResult result;
	result.data = data;
	arma::Mat<double> input_data(data.size(), data[0].size());
	arma::Row<size_t> clusters = arma::zeros<arma::Row<size_t>>(data[0].size());
	int r = 0, c = 0;
	for (auto & v : result.data) {
		Stats::rescale(v);
		c = 0;
		for (auto & val : v) {
			input_data(r, c++) = val;
		}
	}
	result.number_of_clusters = fun(input_data, clusters);
	c = 0;
	for (auto & e : clusters) {
		result.clusters.push_back(e);
	}
	result.distances = Stats::euclideanDistance(input_data);
	Stats::computeSilhuettes(result.distances, clusters, result.silhuettes,
			result.number_of_clusters);
	result.silhuettes_score = Stats::mean(result.silhuettes);
	return result;
}

/// @param data
/// @param epsilon
/// @param minCluster
/// @return
ClusterizationResult MLpack::DBSCAN(
		const std::vector<std::vector<double>> & data, const double epsilon,
		const double min_dimension) {
	return clusterize(data,
			[epsilon, min_dimension](arma::Mat<double> & input_data, arma::Row<size_t> & clusters) {
				mlpack::dbscan::DBSCAN<> dbscan(epsilon, min_dimension , false);
				size_t n_clusters=dbscan.Cluster(input_data, clusters);

				// Replace MAX with n_clusters ( DBSCAN will assign MAX to the unclustered points )
				for (size_t i = 0; i < clusters.n_elem; ++i) {
					clusters[i] = clusters[i] == SIZE_MAX? n_clusters : clusters[i];
				}
				return n_clusters;
			});
}

/// Compute a KMEANS using mlpack and check if the smallest cluster has more than minCluster.
/// If not, return 0, otherwise the number of clusters.
/// @param data
/// @param n_clusters
/// @param minCluster
/// @return
ClusterizationResult MLpack::KMEANS(
		const std::vector<std::vector<double>> & data, const double n_clusters,
		const size_t min_dimension) {
	return clusterize(data,
			[n_clusters, min_dimension](arma::Mat<double> & input_data, arma::Row<size_t> & clusters) {
				mlpack::kmeans::KMeans<> kmeans;
				kmeans.Cluster(input_data, n_clusters, clusters);
				size_t numClusters = arma::max(clusters) + 1;
				arma::Col<size_t> counts(numClusters, arma::fill::zeros);
				for (size_t i = 0; i < clusters.n_elem; ++i) counts[clusters[i]]++;
				// Now assign clusters to new indices.
				size_t currentCluster = 0;
				arma::Col<size_t> newAssignments(numClusters);
				for (size_t i = 0; i < counts.n_elem; ++i)
				{
					if (counts[i] >= min_dimension)
						newAssignments[i] = currentCluster++;
					else
						newAssignments[i] = SIZE_MAX;
				}
				// Now reassign. The sizemax will be an additional cluster ( currentCluster + 1 )

				for (size_t i = 0; i < clusters.n_elem; ++i) {
					clusters[i] = newAssignments[clusters[i]] == SIZE_MAX? currentCluster : newAssignments[clusters[i]];
				}
				return currentCluster;
			});
}

void MLpack::splitTrainingTest(const std::vector<std::vector<double>> & values,
		const std::vector<uint64_t> & groups, arma::Mat<double> & trainingData,
		arma::Mat<double> & testData, arma::Row<size_t> & trainingLabels,
		arma::Row<size_t> & testLabels, double perc_test, uint64_t min_group,
		std::set<uint64_t> groups_to_use) {

	if (groups_to_use.size() == 0)
		for (auto & el : groups)
			groups_to_use.insert(el);

	if ( min_group == 0 ){ // retrieve all the training as test ( for training accuracies )
		uint64_t n_samples=0;
		for ( auto  & g : groups) {
			if ( groups_to_use.count(g) != 0 ) n_samples++;
		}
		trainingData.resize(values.size(), n_samples);
		trainingLabels.resize(n_samples);
		testData.resize(values.size(),n_samples);
		testLabels.resize(n_samples);
		for ( uint64_t i=0; i< groups.size(); i++) {
			if (groups_to_use.count(groups[i]) != 0 ){
				for (int r = 0; r < values.size(); r++) {
					trainingData(r, i) = values[r][i];
					testData(r, i) = values[r][i];
				}
				trainingLabels[i]=groups[i];
				testLabels[i]=groups[i];
			}
		}
		return;
	}
	// Otherwise procede with the division of the groups
	std::map<uint64_t, uint64_t> g_count;
	const arma::Col<size_t> order = arma::shuffle(
				arma::linspace<arma::Col<size_t>>(0, groups.size() - 1,
						groups.size()));
	uint64_t c_train = 0, c_test = 0, n_rows = values.size(), n_groups =
			groups_to_use.size();
	uint64_t n_test = std::floor(min_group * perc_test);
	if (n_test < 2 && min_group > 5)
		n_test = 2;
	uint64_t n_training = min_group - n_test;
	trainingData.resize(n_rows, n_training * n_groups);
	trainingLabels.resize(n_training * n_groups);
	testData.resize(n_rows, n_test * n_groups);
	testLabels.resize(n_test * n_groups);
	for (auto i : order) {
		if (g_count[groups[i]] < min_group
				&& (groups_to_use.count(groups[i]) != 0)) {
			if (g_count[groups[i]] < n_training) {
				trainingLabels(c_train) = groups[i];
				for (int r = 0; r < n_rows; r++) {
					trainingData(r, c_train) = values[r][i];
				}
				c_train++;
			} else {
				testLabels(c_test) = groups[i];
				for (int r = 0; r < n_rows; r++) {
					testData(r, c_test) = values[r][i];
				}
				c_test++;
			}
			g_count[groups[i]]++;
		}
	}
}
}
