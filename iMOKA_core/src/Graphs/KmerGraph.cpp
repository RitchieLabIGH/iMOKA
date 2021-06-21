/*
 * KmerGraph.cpp
 *
 *  Created on: Jan 31, 2019
 *      Author: claudio
 */

#include "KmerGraph.h"
namespace imoka {
namespace graphs {

KmerGraph::~KmerGraph() {
	// TODO Auto-generated destructor stub
}

uint64_t KmerGraph::getByID(uint64_t id) {
	std::vector<BNode>::iterator nit = std::find_if(nodes.begin(), nodes.end(),
			[&id](const BNode &a) {
				return a.id == id;
			});
	if (nit == nodes.end()) {
		std::cerr << "ERROR! " << id << "\n" << "nodes = " << nodes.size()
				<< "\ntype=" << graph_type << "\n";
		std::cerr.flush();
		exit(0);
	}
	return std::distance(nodes.begin(), nit);
}

uint64_t KmerGraph::find_overlap(const Kmer &a, const Kmer &b) {
	bool right = true;
	std::string a_s = a.str(), b_s = b.str();
	for (uint64_t ov = 1; ov < a_s.size(); ov++) {
		right = true;
		for (uint64_t i = 0; i < a_s.size() - ov; i++) {
			if (a_s[i + ov] != b_s[i]) {
				right = false;
				break;
			}
		}
		if (right) {
			return ov;
		}
	}
	return 0;
}
/// Generate the sequences from the graphs, starting from the roots and keeping only the segments having a
/// k-mer with a value equal or greater than min_value
/// @param min_value
void KmerGraph::generateSequences(double min_value) {
	assignBestAccuracy();
	double best_value = 0;
	for (double v : best_accuracies) {
		best_value = best_value > v ? best_value : v;
	}

	if (best_value < min_value) {
		return;
	}
	threshold = min_value;

	uint64_t current_node = 0;
	visited_nodes.clear();

	while (current_node < nodes.size()
			&& this->nodes_vsorted[current_node]->getBestValue() >= threshold) {
		GraphSequence gs;
		extractSequence(this->nodes_vsorted[current_node], gs);
		sequences.push_back(gs);
		current_node++;
		while (current_node < nodes.size()
				&& visited_nodes.count(this->nodes_vsorted[current_node]->id)
						!= 0) {
			current_node++;
		}
	}

	return;
}

/// Return the next node with the means closer to the current node.
/// If the closest has a percentage of change higher than 0.9 ( 90% different ), drop it.
/// @param nodes_id
/// @param ref_id
/// @return pair<uint64_t,double>{ node_id , error }
std::pair<uint64_t, double> KmerGraph::getNextNode(std::set<uint64_t> nodes_id,
		uint64_t ref_id) {
	if (nodes_id.size() == 0)
		return {0, -1};
	int64_t ref_idx = getByID(ref_id);
	int n_of_means = nodes[ref_idx].means.size();
	std::vector<std::pair<uint64_t, double>> errors(nodes_id.size());
	int c = 0;
	double mean = 0;
	for (auto id : nodes_id) {
		uint64_t idx = getByID(id);
		errors[c].first = id;
		errors[c].second = IOTools::averageLog2FC(nodes[idx].means, nodes[ref_idx].means);
		c++;
	}
	std::sort(errors.begin(), errors.end(), [](const auto a, const auto b) {
		return a.second < b.second;
	});
	return errors[0];
}
;

void KmerGraph::extractSequence(BNode *node, GraphSequence &gs) {
	visited_nodes.insert(node->id);
	// add next nodes
	gs.addNode(*node, -1);
	if (node->edgesOut.size() != 0) {
		BNode *next_node = node;
		std::pair<uint64_t, double> best_next = getNextNode(node->edgesOut,
				node->id);
		uint64_t max_next_idx, ov;
		while (best_next.second != -1) {
			max_next_idx = getByID(best_next.first);
			ov = find_overlap(next_node->kmer, nodes[max_next_idx].kmer);
			next_node = &(nodes[max_next_idx]);
			gs.addNode(*next_node, ov);
			if (visited_nodes.count(next_node->id) == 0) {
				visited_nodes.insert(next_node->id);
				best_next = getNextNode(next_node->edgesOut, next_node->id);
			} else {
				best_next = { 0, -1 };
			}

		}
	}
	if (node->edgesIn.size() != 0) {
		BNode *prev_node = node;
		std::pair<uint64_t, double> best_prev = getNextNode(node->edgesIn,
				node->id);
		uint64_t max_prev_idx, ov;
		while (best_prev.second != -1) {
			max_prev_idx = getByID(best_prev.first);
			ov = find_overlap(nodes[max_prev_idx].kmer, prev_node->kmer);
			prev_node = &(nodes[max_prev_idx]);
			gs.addPrevNode(*prev_node, ov);
			if (visited_nodes.count(prev_node->id) == 0) {
				visited_nodes.insert(prev_node->id);
				best_prev = getNextNode(prev_node->edgesIn, prev_node->id);
			} else {
				best_prev = { 0, -1 };
			}

		}
	}
}

void KmerGraph::assignBestAccuracy() {
	if (nodes.size() > 0) {
		best_accuracies = nodes[0].values;
		for (uint64_t i = 1; i < nodes.size(); i++) {
			for (uint64_t j = 0; j < best_accuracies.size(); j++)
				if (best_accuracies[j] < nodes[i].values[j])
					best_accuracies[j] = nodes[i].values[j];
		}
		if (best_accuracies.size() > 1) {
			uint64_t n_of_el = best_accuracies.size();
			best_accuracies.push_back(0);
			for (uint64_t i = 0; i < n_of_el; i++)
				best_accuracies[n_of_el] += best_accuracies[i];
		}
	} else {
		best_accuracies.clear();
	}
}
;

bool KmerGraph::containsNode(uint64_t id) {
	std::vector<BNode>::iterator nit = std::find_if(nodes.begin(), nodes.end(),
			[&id](const BNode &a) {
				return a.id == id;
			});
	return nit != nodes.end();
}
}
}
