/*
 * GeneralGraph.h
 *
 *  Created on: Jan 22, 2019
 *      Author: claudio
 */

#ifndef GRAPHS_KMERGRAPHSET_H_
#define GRAPHS_KMERGRAPHSET_H_

#include "../Annotation/Gene.h"
#include "../Annotation/MapperResultLine.h"
#include "BNode.h"
#include "KmerGraph.h"
#include "../Matrix/BinaryMatrix.h"
#include "../Matrix/TextMatrix.h"
#include "../Utils/MLpack.h"


namespace imoka { namespace graphs {
using namespace matrix;
using namespace annotation;


class KmerGraphSet {
public:
	KmerGraphSet( uint64_t offset, std::string count_matrix) :  w(offset){ setCountMatrix(count_matrix);};
	virtual ~KmerGraphSet();
	void makeEdges();
	void makeGraphsFromBestExtension(double);
	void correctHolmBonferroni(double);
	void generateSequencesFromGraphs(double);
	void alignSequences(Mapper &);
	void recoverWinners(double corr);
	void setCountMatrix(std::string file);
	void filter(double , uint64_t);
	bool load(std::string in_file, double threshold);
	void annotate(std::string, std::string, double);
	void rescale();
	void processUnAnnotated(std::vector<bool>);
	uint64_t size() { return nodes.size(); };
	void setPerfectMatch(bool perfect_match ) {this->perfect_match=perfect_match;};
	std::vector<std::string> graph_type;
	void write_json(std::string);
	void write_tsv(std::string);
	std::vector<BNode*> winning_nodes;
	std::map<std::string, std::pair<uint64_t, uint64_t>> graph_type_count;
	std::vector<std::vector<uint64_t>> group_map;
	std::vector<double>normalization_factors;
	std::vector<BNode> nodes;
	std::vector<std::vector<uint64_t>> winner_events;
	std::vector<std::vector<uint64_t>> winner_pos;
	std::vector<KmerGraph> graphs;
	std::vector<GraphSequence> sequences;
	std::vector<MapperResultLine> mapper_results;
	std::vector<MapperResultLine> winner_mapper_results;
	std::vector<AlignmentDerivedFeature> alignmentDerivedFeatures;
	std::vector<Gene> genes;
	std::vector<Event> events;
	std::vector<std::string> predictors_groups;
	std::vector<std::string> sample_groups_names;
	std::vector<std::string> kmer_sequences;
	std::vector<KmerMatrixLine> counts;
	uint64_t n_columns;
	uint64_t n_groups;
	uint64_t k_len;
	std::vector<uint64_t> groups;

	json infos={{"version", "0.0.1"}};
	bool has_matrix=false;
private:
	bool perfect_match=false;
	std::vector<double> max_values;
	uint64_t w; // it's the offset
	std::string matrix_file="None";
	void assignGraph(std::vector<uint64_t> & vect, uint64_t node, int64_t graph);
	bool checkNeighbour(uint64_t, uint64_t, double);
	void getNeighbours(uint64_t n, uint64_t neighbour_size, std::set<uint64_t> & neighbour);
	void findSplicing(MapperResultLine &);
	std::set<uint64_t> findNodes(BNode & node, uint64_t l);
	void write_genes_json(std::ofstream &);
	void write_sequences_json(std::ofstream &);
	void write_signatures_json(std::ofstream &);
	void write_kmers(std::ofstream &);
	int64_t addWinningNode(Event & );
	json generate_kmer_json(uint64_t node_idx);
	BNode & getMaxKmer(std::string seq, uint64_t graph);
	std::vector<std::vector<double>> generateValues(GraphSequence &);
	void getNodeCounts();
	void getNodePositions();
	int aggregateCorrelated(double corr_thr);
	void addKmerPosition(uint64_t , uint64_t);
	std::pair<BNode*, bool> getBestKmerAndBorder(GraphSequence & gs, AlignmentDerivedFeature & sig, std::string strand);


	double sequence_threshold=0;
};
} }
#endif /* GRAPHS_KMERGRAPHSET_H_ */
