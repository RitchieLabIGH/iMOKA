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
			[&id](const BNode & a) {return a.id == id;});
	if (nit == nodes.end()) {
		std::cerr << "ERROR! " << id << "\n" << "nodes = " << nodes.size()
				<< "\ntype=" << graph_type << "\n";
		std::cerr.flush();
		exit(0);
	}
	return std::distance(nodes.begin(), nit);
}

uint64_t KmerGraph::find_overlap(const Kmer & a, const Kmer & b) {
	bool right = true;
	std::string a_s= a.str(), b_s = b.str();
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
	std::set<uint64_t> roots, new_roots;
	bool has_new_roots = true;
	visited_nodes.clear();
	while (has_new_roots) {
		new_roots.clear();
		for (uint64_t i = 0; i < nodes.size(); i++) {
			if (nodes[i].root && roots.count(i) == 0) {
				roots.insert(i);
				new_roots.insert(i);
			}
		}
		has_new_roots = new_roots.size() > 0;
		for (auto i : new_roots) {
			GraphSequence gs;
			if ( nodes[i].edgesIn.size() > 0 ){ // It's generated after a bifurcation, add 3 k-mers before it
				std::vector<uint64_t> path;
				uint64_t c_node = i;
				while ( nodes[c_node].edgesIn.size() > 0 && path.size() < 3){
					c_node = getByID(*(nodes[c_node].edgesIn.begin()));
					path.push_back(c_node);
				}
				for (int j=path.size()-1; j > 0; --j ){
					uint64_t ov = find_overlap(nodes[path[j]].kmer,
										nodes[path[j-1]].kmer);
					gs.addNode(nodes[path[j]], ov);
				}
				uint64_t ov = find_overlap(nodes[path[0]].kmer, nodes[i].kmer);
				gs.addNode(nodes[path[0]], ov);
			}
			extractBestSequence(i, gs);
		}
		if ( visited_nodes.size() != nodes.size() && ! has_new_roots ){
			for (uint64_t i = 0; i < nodes.size(); i++) {
				if (visited_nodes.count(i) == 0 ){
					nodes[i].root=true;
					i=nodes.size();
					has_new_roots=true;
				}
			}
		}
	}

	return;
}

/// Retrun the next node with the values closer to the current node. If none, return -1 as value
/// To be considered close, a node must have an average distance of value lower than 3
/// from the previous node and the alternative must have a distance higher than 5 from the best one.
///
/// @param nodes_id
/// @param ref_id
/// @return pair<uint64_t,double>{ node_id , error }
std::pair<uint64_t, double> KmerGraph::getNextNode(std::set<uint64_t> nodes_id,
		uint64_t ref_id) {
	int64_t ref_idx = getByID(ref_id);
	int n_of_val = nodes[ref_idx].values.size();
	std::vector<std::pair<uint64_t, double>> errors(nodes_id.size());
	int c = 0;
	for (auto id : nodes_id) {
		uint64_t idx = getByID(id);
		errors[c].first = id;
		errors[c].second = 0;
		for (uint64_t v_i = 0; v_i < n_of_val; v_i++) {
			errors[c].second += std::abs(
					nodes[idx].values[v_i] - nodes[ref_idx].values[v_i]);
		}
		errors[c].second /= n_of_val;
		c++;
	}
	std::sort(errors.begin(), errors.end(), [](const auto a, const auto b) {
		return a.second < b.second;
	});
	if ((errors[1].second - errors[0].second) < 5 || errors[0].second > 3 ) { // the two best options are too close each other or too far from the common path
		return {0, -1};
	} else {
		return errors[0];
	}
}
;

void KmerGraph::extractBestSequence(uint64_t node_i, GraphSequence & gs) {
	double global_max = 0;
	double kmer_max = *std::max_element(nodes[node_i].values.begin(),
			nodes[node_i].values.end());
	/// Identify the best kmer
	if (gs.best_kmer != NULL && gs.best_kmer->values.size() > 0) {
		global_max = *std::max_element(gs.best_kmer->values.begin(),
				gs.best_kmer->values.end());
	}
	if (global_max < kmer_max) {
		gs.best_kmer = &(nodes[node_i]);
		global_max = kmer_max;
	}
	if (visited_nodes.count(node_i) > 0) {
		if (global_max >= threshold) {
			gs.addNode(nodes[node_i], -1);
			sequences.push_back(gs);
		}
		return;
	}
	visited_nodes.insert(node_i);

	if (nodes[node_i].edgesOut.size() == 0) { // end of the sequence
		if (global_max >= threshold) {
			gs.addNode(nodes[node_i], -1);
			sequences.push_back(gs);
		}
	} else if (nodes[node_i].edgesOut.size() == 1) {
		uint64_t next_idx = getByID(*(nodes[node_i].edgesOut.begin()));
		uint64_t ov = find_overlap(nodes[node_i].kmer, nodes[next_idx].kmer);
		gs.addNode(nodes[node_i], ov);
		extractBestSequence(next_idx, gs);

	} else { // It's a bifurcation
		std::pair<uint64_t, double> best_next = getNextNode(
				nodes[node_i].edgesOut, nodes[node_i].id);
		for (auto next_node : nodes[node_i].edgesOut) {
			if (best_next.second < 0 || next_node != best_next.first ) { // Set root the path not seen, so they can generate the suboptimal paths.
				nodes[getByID(next_node)].root = true;
			}
		}
		if (best_next.second < 0) {
			if (global_max >= threshold) {
				gs.addNode(nodes[node_i], -1);
				sequences.push_back(gs);
			}
		} else {
			uint64_t max_next_idx = getByID(best_next.first);
			uint64_t ov = find_overlap(nodes[node_i].kmer,
					nodes[max_next_idx].kmer);
			gs.addNode(nodes[node_i], ov);
			extractBestSequence(max_next_idx, gs);
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
			[&id](const BNode & a) {return a.id == id;});
	return nit != nodes.end();
}
}
}
