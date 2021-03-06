/*
 * GeneralGraph.cpp
 *
 *  Created on: Jan 22, 2019
 *      Author: claudio
 */

#include "KmerGraphSet.h"
namespace imoka {
namespace graphs {

using namespace matrix;
using namespace annotation;

KmerGraphSet::~KmerGraphSet() {
	// TODO Auto-generated destructor stub
}

bool KmerGraphSet::load(std::string in_file, double threshold) {
	nodes.clear();
	uint64_t bufferSize = 10000 * omp_get_num_threads();
	std::vector<std::string> buffer;
	TextMatrix mat(in_file);
	TextMatrixLine row;
	predictors_groups = mat.col_groups;
	bool keep;
	while (mat.getLine(row)) {
		keep = false;
		for (auto v : row.count) {
			if (v >= threshold)
				keep = true;
		}
		if (keep) {
			nodes.push_back(BNode(row));
		}
	}
	nodes.shrink_to_fit();
	infos["input_infos"] = mat.infos;
	if (nodes.size() < 1) {
		return false;
	} else {
		for (uint64_t i = 0; i < nodes.size(); i++) {
			nodes[i].id = i;
		}
		k_len = nodes[0].kmer.k_len;
		infos["k_len"] = k_len;
		infos["initial_kmers"] = nodes.size();
		infos["predictors"] = predictors_groups;
		return true;
	}

}

void KmerGraphSet::setCountMatrix(std::string file) {
	matrix_file = file;
	has_matrix = IOTools::fileExists(file);
	if (has_matrix) {
		BinaryMatrix binm(matrix_file);
		normalization_factors = binm.normalization_factors;
		sample_groups_names = binm.unique_groups;
		n_columns = binm.col_names.size();
		n_groups = sample_groups_names.size();
		groups = binm.groups;
		group_map = binm.group_map;
		infos["groups"] = groups;
		infos["count_normalization"] = binm.normalization_factors;
		infos["groups_names"] = sample_groups_names;
		infos["samples_names"] = binm.col_names;
	}

}

/// Find the nodes that overlap the one given in the argument for k-l
/// @param node the reference node
/// @param l the length of the shift
/// @return a set of nodes that overlap in the list "nodes"
std::set<uint64_t> KmerGraphSet::findNodes(BNode &node, uint64_t l) {
	std::set<uint64_t> out;
	Kmer compBegin(node.kmer.str().substr(l) + std::string(l, 'A'));
	Kmer compEnd(node.kmer.str().substr(l) + std::string(l, 'T'));
	BNode comp_node(compBegin);
	uint64_t b = std::distance(nodes.begin(),
			std::lower_bound(nodes.begin(), nodes.end(), comp_node,
					[](const BNode &a, const BNode &b) {
						return a.kmer < b.kmer;
					}));
	comp_node.kmer = compEnd;
	uint64_t e = std::distance(nodes.begin(),
			std::upper_bound(nodes.begin(), nodes.end(), comp_node,
					[](const BNode &a, const BNode &b) {
						return a.kmer < b.kmer;
					}));
	e = e == 0 ? 0 : e - 1;
	if (b <= e) {
		for (uint64_t el = b; el <= e; el++) {
			out.insert(el);
		}
	}
	return out;
}

/// Links the k-mers (nodes) overlapping for a maximum of k-w ( w defined in the object)
///
void KmerGraphSet::makeEdges() {
	uint64_t n_nodes = nodes.size();
#pragma omp parallel for firstprivate(n_nodes)
	for (uint64_t i = 0; i < n_nodes; i++) {
		for (uint64_t l = 1; l <= w; l++) {
			std::set<uint64_t> partners = findNodes(nodes[i], l);
			if (partners.size() < 4) {
				for (uint64_t p : partners)
					if (p != i) {
						nodes[i].edgesOut.insert(p);
					}
			}
			if (partners.size() > 0) {
				l = w + 1;
			}
		}
	}
	for (uint64_t i = 0; i < n_nodes; i++) {
		for (auto j : nodes[i].edgesOut) {
			nodes[j].root = false;
			nodes[j].edgesIn.insert(i);
		}
		if (nodes[i].edgesOut.size() > 4) {
			std::cerr << "\n\nWARINING! " << i << "  " << nodes[i].kmer
					<< "\n---\n";
			for (auto n : nodes[i].edgesOut) {
				std::cerr << nodes[n].kmer << "\n";
			}
		}
	}
	// remove the short brench and reduce multiple bifurcations
	std::set<uint64_t> to_remove;
	double max_val = 0, mv = 0;
	int64_t max_idx = -1;
	for (uint64_t i = 0; i < n_nodes; i++) {
		if (nodes[i].edgesOut.size() > 1) {
			to_remove.clear();
			max_val = 0;
			mv = 0;
			max_idx = -1;
			for (auto j : nodes[i].edgesOut) {
				if (nodes[j].edgesOut.size() == 0) { /// this is a short bifurcation, just remove it
					to_remove.insert(j);
				} else if (nodes[j].edgesOut.size() == 1) { /// here there is one single out edge.
					for (auto w : nodes[j].edgesOut)
						if (nodes[w].edgesOut.size() == 0) { /// If that brench end, it means that the bifurcation was made of only two k-mers. remove it
							to_remove.insert(j);
						} //// Otherwise it's untouched
				} else { /// If there are multiple edges after a bifurcation, keep the best edge attached and detach the others.
					mv = *std::max_element(nodes[j].values.begin(),
							nodes[j].values.end());
					if (max_val < mv) {
						max_idx = j;
						max_val = mv;
					}
					to_remove.insert(j);
				}
			}
			for (auto j : to_remove) {
				if (j != max_idx) {
					nodes[i].edgesOut.erase(j);
					nodes[j].edgesIn.erase(i);
				}
			}
		}
		if (nodes[i].edgesIn.size() > 1) { /// do the same for the edgesIn
			to_remove.clear();
			max_val = 0;
			mv = 0;
			max_idx = -1;
			for (auto j : nodes[i].edgesIn) {
				if (nodes[j].edgesIn.size() == 0) {
					to_remove.insert(j);
				} else if (nodes[j].edgesIn.size() == 1) {
					for (auto w : nodes[j].edgesIn)
						if (nodes[w].edgesIn.size() == 0) {
							to_remove.insert(j);
						}
				} else {
					mv = *std::max_element(nodes[j].values.begin(),
							nodes[j].values.end());
					if (max_val < mv) {
						max_idx = j;
						max_val = mv;
					}
					to_remove.insert(j);
				}
			}
			for (auto j : to_remove) {
				if (j != max_idx) {
					nodes[i].edgesIn.erase(j);
					nodes[j].edgesOut.erase(i);
				}
			}
		}
	}
	for (uint64_t i = 0; i < nodes.size(); i++) { /// reassign the root to the nodes with no edges in input
		if (nodes[i].edgesIn.size() == 0) {
			nodes[i].root = true;
		}
	}
}

void KmerGraphSet::assignGraph(std::vector<uint64_t> &v, uint64_t i,
		int64_t graph) {
	v.push_back(i);
	nodes[i].graph = graph;
	for (auto n : nodes[i].edgesOut) {
		if (nodes[n].graph != graph) {
			assignGraph(v, n, graph);
		}
	}
	for (auto n : nodes[i].edgesIn) {
		if (nodes[n].graph != graph) {
			assignGraph(v, n, graph);
		}
	}
}

void KmerGraphSet::makeGraphsFromBestExtension(double threshold) {
	std::vector<uint64_t> order(nodes.size());
	std::iota(order.begin(), order.end(), 0);
	std::map<std::string, uint64_t> stats;
	for (uint64_t pg = 0; pg < predictors_groups.size(); pg++) {
		std::sort(order.begin(), order.end(), [&](uint64_t a, uint64_t b) {
			return nodes[a].values[pg] > nodes[b].values[pg];
		});
		for (uint64_t i = 0; i < order.size(); i++) {
			uint64_t n = order[i];
			if (nodes[n].graph == -1
					&& (nodes[n].edgesOut.size() > 0
							|| nodes[n].edgesIn.size() > 0)) { // avoid singleton
				if (i > 10 && nodes[n].values[pg] < threshold) {
					break;
				}

				std::vector<uint64_t> g;
				assignGraph(g, n, graph_type.size());
				if (g.size() == 1) {
					nodes[g[0]].graph = -1;
				} else {
					std::string g_type = "linear";
					for (uint64_t el : g)
						if (nodes[el].edgesOut.size() > 1
								|| nodes[el].edgesIn.size() > 1)
							g_type = "complex";
					bool hasRoot = false;
					for (uint64_t el : g) {
						hasRoot = hasRoot || nodes[el].root;
					}
					if (!hasRoot) {
						g_type += "_circular";
						nodes[g[0]].root = true;
						for (auto e : nodes[g[0]].edgesIn) {
							nodes[e].edgesOut.erase(g[0]);
						}
						nodes[g[0]].edgesIn.clear();
					}
					graph_type.push_back(g_type);
					graph_type_count[g_type].first++;
					graph_type_count[g_type].second += g.size();
				}
			}
		}
		graphs.resize(graph_type.size());
	}
	uint64_t tot_nodes = nodes.size();
	uint64_t n = nodes.size() - 1;
	bool tokeep;
	while (nodes.size() > 0) {
		if (nodes[n].graph >= 0) {
			graphs[nodes[n].graph].nodes.push_back(nodes[n]);
		}
		nodes.pop_back();
		n--;
	}

	for (int i = 0; i < graphs.size(); i++) {
		graphs[i].graph_type = graph_type[i];
	}
	infos["graphs"] = graph_type_count;

}

void KmerGraphSet::generateSequencesFromGraphs(double thr) {
	infos["threshold"] = thr;
	sequence_threshold = thr;
	uint64_t gs = graphs.size();
#pragma omp parallel for firstprivate(gs) schedule(dynamic, 10)
	for (uint64_t g = 0; g < gs; g++) {
		graphs[g].generateSequences(thr);
	}
	uint64_t tot = 0;
	sequences.clear();
	for (uint64_t gi = 0; gi < graphs.size(); gi++) {
		KmerGraph &g = graphs[gi];
		for (auto &s : g.sequences) {
			if (s.sequence.size() > k_len + 3) {
				s.id = tot++;
				s.graph = gi;
				g.sequences_idx.push_back(sequences.size());
				sequences.push_back(s);
			}
		}
		g.sequences.clear();
	}
	std::cerr << "Found " << tot << " sequences.\n";
	infos["n_sequences"] = tot;
	return;
}

void KmerGraphSet::correctHolmBonferroni(double thr) {
	double pval_thr = std::pow(10, -thr);
	std::cerr << "Pvalue threshold: " << pval_thr << "\n";
	uint64_t m = sequences.size();
	std::vector<uint64_t> order(m);
	std::iota(order.begin(), order.end(), 0);
	std::vector<bool> pass(sequences.size(), false);
	for (int comp = 0; comp < sequences[0].best_kmer->values.size(); comp++) {
		std::cerr << "sorting...";
		std::cerr.flush();
		std::sort(order.begin(), order.end(),
				[&](const uint64_t &a, const uint64_t &b) {
					return sequences[a].best_kmer->values[comp]
							> sequences[b].best_kmer->values[comp];
				});
		std::cerr << "done.\nEvaluating new pvalues....";
		std::cerr.flush();
		for (uint64_t i = 0; i < order.size(); i++) {
			pass[order[i]] = pass[order[i]]
					|| sequences[order[i]].best_kmer->values[comp]
							> (-log10(pval_thr / (m - i)));
		}
	}
	for (uint64_t i = sequences.size() - 1; i >= 0; i--) {
		if (!pass[i])
			sequences.erase(sequences.begin() + i);
	}
	std::cerr << "New number of sequences = " << sequences.size() << "\n";

}

void KmerGraphSet::alignSequences(Mapper &mapper) {
	uint64_t s;
	std::string input_file = "./sequences_" + IOTools::timestamp() + ".fa";
	std::ofstream ofs(input_file);
	for (s = 0; s < sequences.size(); s++) {
		ofs << ">seq_" << s << "\n" << sequences[s].sequence << "\n";
	}
	ofs.close();
	std::string output_file = mapper.align(input_file);
	std::ifstream ifs(output_file);
	std::string line;
	int64_t new_pos = -1, tot_pos = 0;
	std::cerr << "\n";
	while (getline(ifs, line)) {
		if (!mapper.isCommentLine(line)) {
			MapperResultLine res_line(line, mapper.output_type);
			if (!(res_line.flag & SAMflags::isUnmappedQuery)) {
				new_pos = -2;
				if (sequences[res_line.query_index].alignments.size() > 0) {
					for (auto idx : sequences[res_line.query_index].alignments) {
						if (mapper_results[idx].match < res_line.match) {
							new_pos = idx;
						}
					}
					if (new_pos == -2) {
						for (auto idx : sequences[res_line.query_index].alignments) {
							if (mapper_results[idx].match == res_line.match) {
								new_pos = -1;
							}
						}
					}
				} else {
					new_pos = -1;
				}
				if (new_pos != -2) {
					for (auto &sig : res_line.signatures) {
						std::pair<BNode*, bool> res = getBestKmerAndBorder(
								sequences[res_line.query_index], sig,
								res_line.strand);
						if (res.second && sig.signature_type != "clipping"
								&& !perfect_match) {
							sig.generates_event = true;
						}
						sig.best_kmer = res.first;
					}
					if (new_pos == -1) {
						sequences[res_line.query_index].alignments.push_back(
								mapper_results.size());
						res_line.id = mapper_results.size();
						mapper_results.push_back(res_line);
					} else if (new_pos >= 0) {
						res_line.id = new_pos;
						mapper_results[new_pos] = res_line;
					}
				}
			}
		}
	}
	ifs.close();
	remove(input_file.c_str());
	remove(output_file.c_str());

}

void KmerGraphSet::annotate(std::string annotation_files, std::string bed_out,
		double coverage_limit) {
	std::cerr << "Writing the bed file of " << mapper_results.size()
			<< " sequences... \n";
	std::string tmp_bed_file_out = bed_out + ".intersected.bed";
	std::ofstream tmp_bed(bed_out);
	for (uint64_t i = 0; i < mapper_results.size(); i++) {
		tmp_bed << mapper_results[i].to_bed();
	}
	tmp_bed.close();
	int r =
			system(
					std::string(
							"bedtools intersect -loj -a " + bed_out + " -b "
									+ annotation_files + " > "
									+ tmp_bed_file_out).c_str());
	std::ifstream ifs(tmp_bed_file_out);
	std::string line;
	std::vector<std::string> content, coordinate;
	uint64_t i, b, start, end, sp_start, sp_end;
	std::cerr << "generated the intersection " << tmp_bed_file_out
			<< ", parsing...";
	std::cerr.flush();
	std::vector<std::string> buffer;
	uint64_t max_buffer = 10000 * omp_get_max_threads();
	std::vector<std::vector<Annotation>> results(omp_get_max_threads());
	std::map<std::string, std::set<uint64_t>> genes_ids;
	std::map<std::string, std::string> gene_names;
	bool running = true;
	while (running) {
		running = getline(ifs, line) ? true : false;
		if (running)
			buffer.push_back(line);
		if (buffer.size() >= max_buffer || !running) {
#pragma omp parallel for
			for (uint64_t l = 0; l < buffer.size(); l++) {
				Annotation ann(buffer[l]);
				results[omp_get_thread_num()].push_back(ann);
			}
			for (int n = 0; n < results.size(); n++) {
				for (auto &ann : results[n]) {
					mapper_results[ann.map_result_id].annotations.push_back(
							ann);
					if (ann.gene_id != "") {
						genes_ids[ann.gene_id].insert(ann.map_result_id);
						gene_names[ann.gene_id] = ann.gene_name;
					}
				}
				results[n].clear();
			}
			buffer.clear();
		}
	}
	std::cerr << "Done.\nIdentified " << genes_ids.size() << " genes.\n";
	remove(tmp_bed_file_out.c_str());
	std::cerr << "Finding splicing....";

	alignmentDerivedFeatures.clear();
	uint64_t grp, o;
	for (auto &r : mapper_results) {
		findSplicing(r);
		for (auto &sig : r.signatures) {
			auto other = std::find(alignmentDerivedFeatures.begin(),
					alignmentDerivedFeatures.end(), sig);
			if (other != alignmentDerivedFeatures.end()) {
				o = std::distance(alignmentDerivedFeatures.begin(), other);
				alignmentDerivedFeatures[o].alignments.push_back(r.id);
				r.signatures_id.push_back(alignmentDerivedFeatures[o].id);
				if (*std::max_element(
						alignmentDerivedFeatures[o].best_kmer->values.begin(),
						alignmentDerivedFeatures[o].best_kmer->values.end())
						< *std::max_element(sig.best_kmer->values.begin(),
								sig.best_kmer->values.end())) {
					alignmentDerivedFeatures[o].best_kmer = sig.best_kmer;
				}
				alignmentDerivedFeatures[o].generates_event =
						sig.generates_event
								&& alignmentDerivedFeatures[o].generates_event;
			} else {
				sig.alignments.push_back(r.id);
				sig.id = alignmentDerivedFeatures.size();
				r.signatures_id.push_back(sig.id);
				alignmentDerivedFeatures.push_back(sig);
			}
		}
		r.signatures.clear();
	}

	std::cerr << "Done.\n Retrieving the genes length...";
	ifs.close();
	std::map<std::string, std::map<std::string, std::vector<Segment>>> gene_exons;
	std::vector<std::string> columns;
	ifs.open(annotation_files);
	std::smatch matches;
	std::string gname, gid;
	std::regex rgx_trID = std::regex(GENCODE_regex::rgx_transcript_id);
	std::regex rgx_gene_name = std::regex(GENCODE_regex::rgx_gene_name);
	std::regex rgx_gene_id = std::regex(GENCODE_regex::rgx_gene_id);
	while (getline(ifs, line)) {
		boost::split(columns, line, boost::is_any_of("\t"));
		if (line[0] != '#' && columns[2] == "exon"
				&& std::regex_search(line, matches, rgx_gene_id)) {
			if (genes_ids.count(matches[1])) {
				gid = matches[1];
				std::regex_search(line, matches, rgx_gene_name);
				gname = matches[1];
				if (std::regex_search(line, matches, rgx_trID)) {
					gene_exons[gid][matches[1]].push_back(
							Segment(std::stoll(columns[3]),
									std::stoll(columns[4])));
				}
			};
		}
	}
	ifs.close();

	std::cerr << "done, producing the genes annotations...";
	genes.clear();
	std::vector<std::string> gene_ids_keys;
	for (auto &gn : genes_ids) {
		gene_ids_keys.push_back(gn.first);
	}
	std::vector<bool> sequences_done(sequences.size(), false);

	for (uint64_t i = 0; i < gene_ids_keys.size(); i++) {
		Gene g;
		g.init(gene_ids_keys[i], gene_names[gene_ids_keys[i]], coverage_limit,
				gene_exons[gene_ids_keys[i]], genes_ids[gene_ids_keys[i]],
				mapper_results, alignmentDerivedFeatures, sequences,
				perfect_match);
		if (g.best_kmer != 0) {
			g.id = genes.size();
			genes.push_back(g);
			for (auto idx : genes[g.id].alignments) {
				mapper_results[idx].genes.insert(g.id);
			}
			for (auto s : g.sequences)
				sequences_done[s] = true;
		}
	}
	std::cerr << "reduced to " << genes.size() << " genes.\n";
	std::cerr << "Producing the alignment derived features...";
	std::map<uint64_t, uint64_t> sig_to_ev;
	for (auto &sig : alignmentDerivedFeatures) {
		if (sig.generates_event) {
			if (sig_to_ev.count(sig.id) == 0) {
				Event ev(sig.signature_type + "_borders", { }, sig.best_kmer);
				ev.signatures.push_back(sig.id);
				for (auto aln : sig.alignments) {
					for (auto &ann : mapper_results[aln].annotations) {
						ev.gene_name.insert(ann.gene_name);
					}
				}
				sig_to_ev[sig.id] = events.size();
				ev.id = events.size();
				events.push_back(ev);
			} else {
				Event &ev = events[sig_to_ev[sig.id]];
				for (auto aln : sig.alignments) {
					for (auto &ann : mapper_results[aln].annotations) {
						ev.gene_name.insert(ann.gene_name);
					}
				}
			}
		}
	}
	std::cerr << IOTools::format_space_human(IOTools::getCurrentProcessMemory())
			<< "\n";
	for (auto &g : genes) {
		for (int64_t j = g.events.size() - 1; j >= 0; j--) {
			bool to_add = true;
			if (g.events[j].type == "gene") {
				for (auto &ev : events) {
					if (ev.best_kmer == g.events[j].best_kmer) {
						to_add = false;
						ev.gene_name.insert(g.gene_name);
					}
				}
			}
			if (to_add) {
				g.events_idx.push_back(events.size());
				g.events[j].id = events.size();
				events.push_back(g.events[j]);
			}
			g.events.pop_back();
		}
	}

	std::cerr << "done.\n";
	processUnAnnotated(sequences_done);

}

void KmerGraphSet::processUnAnnotated(std::vector<bool> sequences_done) {
	for (uint64_t s = 0; s < sequences.size(); s++) {
		if (!sequences_done[s]) {
			GraphSequence &seq = sequences[s];
			bool represented = false;
			for (auto &ev : events) {
				if (ev.best_kmer == seq.best_kmer) {
					represented = true;
				}
			}
			if (!represented) {
				Event new_ev;
				new_ev.best_kmer = seq.best_kmer;
				if (seq.alignments.size() == 0) {
					new_ev.type = "unmapped";
				} else if (seq.alignments.size() > 1) {
					new_ev.type = "multimap";
					std::set<std::string> gene_names;
					for (auto &aln : seq.alignments) {
						for (auto g : mapper_results[aln].genes)
							new_ev.gene_name.insert(genes[g].gene_name);
					}
				} else {
					MapperResultLine &aln = mapper_results[seq.alignments[0]];
					for (auto &ann : aln.annotations) {
						if (ann.gene_name != "")
							new_ev.gene_name.insert(ann.gene_name);
					}
					if (new_ev.gene_name.size() == 0) {
						new_ev.type = "intergenic";
					} else {
						if (perfect_match){
							represented=true;
						}
						new_ev.type = "intragenic";
					}
				}
				if (!represented){
					new_ev.alignments = seq.alignments;
					new_ev.id = events.size();
					events.push_back(new_ev);
				}

			}
		} else { /// Add multimap event for k-mers with multiple alignments
			GraphSequence &seq = sequences[s];
			if (seq.alignments.size() > 1) {
				bool to_add = true;
				for (Event &ev : events) {
					if (ev.best_kmer == seq.best_kmer
							&& ev.type == "multimap") {
						to_add = false;
					}
				}
				if (to_add) {
					Event new_ev;
					new_ev.best_kmer = seq.best_kmer;
					new_ev.type = "multimap";
					std::set<std::string> gene_names;
					for (auto &aln : seq.alignments) {
						for (auto g : mapper_results[aln].genes)
							new_ev.gene_name.insert(genes[g].gene_name);
					}
				}
			}
		}
	}
}

std::pair<BNode*, bool> KmerGraphSet::getBestKmerAndBorder(GraphSequence &gs,
		AlignmentDerivedFeature &sig, std::string strand) {
	int start = sig.q_position.start - k_len + 1;
	int end = sig.q_position.end + k_len - 1;
	int border_start = start - (k_len * 2) - 3;
	int border_end = end + (k_len * 2) + 3;
	if (start < 0)
		start = 0;
	if (border_start < 0)
		border_start = 0;
	if (end > gs.sequence.size())
		end = gs.sequence.size();
	if (border_end > gs.sequence.size())
		border_end = gs.sequence.size();
	if (strand == "-") {
		int tmp = start, tmp_border = border_start;
		start = gs.sequence.size() - end;
		border_start = gs.sequence.size() - border_end;
		end = gs.sequence.size() - tmp;
		border_end = gs.sequence.size() - tmp_border;
	}

	BNode &best_kmer = getMaxKmer(gs.sequence.substr(start, end - start),
			gs.graph);
	double best_val = *std::max_element(best_kmer.values.begin(),
			best_kmer.values.end());
	bool keep = true;
	if (start - border_start > k_len) {
		BNode &lower_border_best_kmer = getMaxKmer(
				gs.sequence.substr(border_start, start - border_start),
				gs.graph);
		double lb_best_val = *std::max_element(
				lower_border_best_kmer.values.begin(),
				lower_border_best_kmer.values.end());
		keep = keep && (best_val > lb_best_val);
	}
	if (border_end - end > k_len) {
		BNode &higher_border_best_kmer = getMaxKmer(
				gs.sequence.substr(end, border_end - end), gs.graph);
		double hb_best_val = *std::max_element(
				higher_border_best_kmer.values.begin(),
				higher_border_best_kmer.values.end());
		keep = keep && (best_val > hb_best_val);
	}
	return {&best_kmer, keep};
}

void KmerGraphSet::findSplicing(MapperResultLine &mr) {
	int a, b;
	std::set<std::string> exon_a, exon_b;
	if (mr.t_blocks.size() > 1) {
		for (int i = 1; i < mr.t_blocks.size(); i++) {
			a = mr.t_blocks[i - 1].end;
			b = mr.t_blocks[i].start;
			if (a != b) {
				exon_a.clear();
				exon_b.clear();
				for (auto &ann : mr.annotations) {
					if (ann.position.end == a)
						exon_a.insert(ann.exon_id);
					if (ann.position.start == b)
						exon_b.insert(ann.exon_id);
				}
				std::string left = "", right = "";
				if (exon_a.size() == 0)
					left = "?";
				else {
					for (auto &en : exon_a)
						left += (left == "" ? "" : "-") + en;
				}
				if (exon_b.size() == 0)
					right = "?";
				else {
					for (auto &en : exon_b)
						right += (right == "" ? "" : "-") + en;
				}
				if ((right != "?" || left != "?") || b - a > 10) {
					AlignmentDerivedFeature sig("splice", Segment(a, b),
							Segment(mr.q_blocks[i - 1].end,
									mr.q_blocks[i].start), mr.chromosome,
							left + " -> " + right);
					GraphSequence &gs = sequences[mr.query_index];
					std::pair<BNode*, bool> res = getBestKmerAndBorder(
							sequences[mr.query_index], sig, mr.strand);
					sig.best_kmer = res.first;
					if (res.second) {
						sig.generates_event = true;
					}
					mr.signatures.push_back(sig);
				}
			}
		}
	}
}

void KmerGraphSet::write_json(std::string out_file) {
	std::ofstream json_out(out_file);
	json_out << "{ \"info\" : " << infos.dump() << ", \n ";
	write_kmers(json_out);
	if (winning_nodes.size() > 0)
		json_out << ",\n";
	write_genes_json(json_out);
	if (genes.size() > 0)
		json_out << ",\n";
	write_signatures_json(json_out);
	if (alignmentDerivedFeatures.size() > 0)
		json_out << ",\n";
	write_sequences_json(json_out);
	json_out << "}\n";
	json_out.close();

}

void KmerGraphSet::write_genes_json(std::ofstream &ofs) {
	bool first = true;
	json data;
	for (auto &g : genes) {
		ofs << (first ? " \"genes\" : [\n" : ",\n") << g.to_json().dump();
		first = false;
	}
	ofs << (first ? "" : "\n]\n");
}

void KmerGraphSet::write_signatures_json(std::ofstream &ofs) {
	bool first = true;
	for (auto &s : alignmentDerivedFeatures) {
		ofs << (first ? "\"signatures\" : [\n" : ",\n") << s.to_json().dump();
		first = false;
	}
	ofs << (first ? "" : "\n]\n");
}

void KmerGraphSet::write_sequences_json(std::ofstream &ofs) {
	bool first = true;
	for (int64_t i = 0; i < sequences.size(); i++) {
		GraphSequence &s = sequences[i];
		json data = s.to_json();
		if (max_values.size() > 0) {
			data.erase("best_kmer_values");
			std::vector<double> values = s.best_kmer->values;
			for (int i = 0; i < values.size(); i++) {
				values[i] = (values[i] / 100) * max_values[i];
			}
			data["best_kmer_values"] = values;
		}
		data.erase("alignments");
		json alignments;
		for (auto a : s.alignments) {
			alignments.push_back(mapper_results[a].to_json());
		}
		data["alignments"] = alignments;
		ofs << (first ? "\"sequences\" : [\n" : ",\n") << data.dump();
		first = false;
	}
	ofs << (first ? "" : "\n]\n");
}

void KmerGraphSet::write_kmers(std::ofstream &ofs) {
	bool first = true;
	for (int64_t i = 0; i < winning_nodes.size(); i++) {
		if (!winning_nodes[i]->masked) {
			ofs << (first ? "\"kmers\" : [\n" : ",\n")
					<< generate_kmer_json(i).dump();
			first = false;
		}
	}
	ofs << (first ? "" : "\n]\n");
}

BNode& KmerGraphSet::getMaxKmer(std::string seq, uint64_t graph_idx) {
	std::set<Kmer> kmers = Kmer::generateKmers(seq, k_len);
	KmerGraph &gr = graphs[graph_idx];
	double best = -1;
	int best_idx = 0;
	for (int i = 0; i < gr.nodes.size(); i++) {
		BNode &node = gr.nodes[i];
		if (kmers.count(node.kmer) != 0
				&& (best == -1
						|| best
								< *std::max_element(node.values.begin(),
										node.values.end()))) {
			best_idx = i;
			best = *std::max_element(node.values.begin(), node.values.end());
		}
	}
	if (best == -1) {
		std::cerr << "ERROR! the graph " << graph_idx
				<< " doesn't contain any of the kmers in " << seq << "\n";
	}
	return gr.nodes[best_idx];
}
;

std::vector<std::vector<double>> KmerGraphSet::generateValues(
		GraphSequence &gs) {
	KmerGraph &gr = graphs[gs.graph];
	int groups = gr.best_accuracies.size();
	std::vector<std::vector<double>> out;
	Kmer kmer;
	std::vector<double> toadd;
	for (int grp = 0; grp < groups; grp++) {
		for (int i = 0; i < gs.sequence.size() - k_len; i++) {
			kmer = Kmer(gs.sequence.substr(i, k_len));
			toadd.clear();
			for (auto &n : gr.nodes) {
				if (n.kmer == kmer) {
					toadd = n.values;
				}
			}
			out.push_back(toadd);
		}
	}
	return out;
}
;

void KmerGraphSet::rescale() {
	max_values.clear();
	max_values.resize(nodes[0].values.size());
	int nv = max_values.size(), i;
	for (auto &n : nodes) {
		for (i = 0; i < nv; i++) {
			if (max_values[i] < n.values[i])
				max_values[i] = n.values[i];
		}
	}
	for (auto &n : nodes) {
		for (i = 0; i < nv; i++) {
			n.values[i] = (n.values[i] * 100) / max_values[i];
		}
	}
}

int KmerGraphSet::aggregateCorrelated(double corr_thr) {
	if (corr_thr == 1) {
		return 0;
	}
	std::vector<std::set<uint64_t>> genes_per_node(winning_nodes.size());
	for (int i = 0; i < winning_nodes.size(); i++) {
		winning_nodes[i]->masked = false;
		for (auto &j : winner_pos[i]) {
			for (auto &g : winner_mapper_results[j].genes)
				genes_per_node[i].insert(g);
		}
	}
	std::set<uint64_t> intersection;
	int masked = 0;
	for (int i = 0; i < winning_nodes.size(); i++) {
		for (int j = i + 1; j < winning_nodes.size(); j++) {
			intersection.clear();
			std::set_intersection(genes_per_node[i].begin(),
					genes_per_node[i].end(), genes_per_node[j].begin(),
					genes_per_node[j].end(),
					std::inserter(intersection, intersection.begin()));
			if ((genes_per_node[i].size() == 0 && genes_per_node[j].size() == 0)
					|| intersection.size() > 0) {
				if (Stats::correlationCoefficient(counts[i].count,
						counts[j].count) > corr_thr) {
					double max_a = *std::max_element(
							winning_nodes[i]->values.begin(),
							winning_nodes[i]->values.end());
					double max_b = *std::max_element(
							winning_nodes[j]->values.begin(),
							winning_nodes[j]->values.end());
					if (max_a > max_b) {
						winning_nodes[j]->masked = true;
					} else {
						winning_nodes[i]->masked = true;
					}
					masked++;
				}
			}
		}
	}
	return masked;
}

void KmerGraphSet::recoverWinners(double corr) {
	winning_nodes.clear();
	for (auto &ev : events) {
		addWinningNode(ev);
	}
	getNodePositions();
	std::cerr << "Found " << winning_nodes.size()
			<< " nodes.\nRetrieving the counts...";
	getNodeCounts();
	std::cerr
			<< "Done.\nAggregating the nodes with high correlation and in the gene or unmapped.\n";
	int masked = aggregateCorrelated(corr);

	std::cerr << "Masked " << masked << " k-mers.\n";
	std::cerr.flush();
	infos["correlation_thr"] = corr;
}

void KmerGraphSet::getNodePositions() {
	winner_pos.resize(winning_nodes.size());
	winner_mapper_results.clear();
	std::map<std::string, uint64_t> stats;
	for (uint64_t i = 0; i < winning_nodes.size(); i++) {
		std::set<uint64_t> map_results;
		for (auto j : winner_events[i]) {
			for (auto k : events[j].signatures) {
				map_results.insert(
						alignmentDerivedFeatures[k].alignments.begin(),
						alignmentDerivedFeatures[k].alignments.end());
			}
			for (auto k : events[j].alignments) {
				map_results.insert(k);
			}
		}
		for (auto j : map_results) {
			addKmerPosition(i, j);
		}
		if (map_results.size() > 0 && winner_pos[i].size() == 0) {
			std::cerr << "kmer " << winning_nodes[i]->kmer
					<< " not found !\nSigning as \'misalign\'";
			for (auto idx : map_results) {
				MapperResultLine &mrl = mapper_results[idx];
				std::cerr << mrl.id << " " << mrl.chromosome << " " << mrl.name
						<< " " << mrl.strand << "\n";
			}
			Event ev("misalign", { }, winning_nodes[i]);
			ev.id = events.size();
			events.push_back(ev);
			winner_events[i].push_back(ev.id);
		}
	}
}

void KmerGraphSet::addKmerPosition(uint64_t kmer_idx, uint64_t map_result_idx) {
	MapperResultLine &mrl = mapper_results[map_result_idx];
	BNode &node = *(winning_nodes[kmer_idx]);
	GraphSequence &gs = sequences[mrl.query_index];
	std::string kmer = node.kmer.str();
	size_t q_pos = gs.sequence.find(kmer);
	if (q_pos != std::string::npos) {

		gs.nodes.insert(kmer_idx);
		Segment q_segment;

		q_pos += 1;
		if (mrl.strand == "+") {
			q_segment.start = q_pos;
			q_segment.end = q_segment.start + k_len;
		} else {
			q_segment.start = gs.sequence.size() - q_pos - k_len + 2;
			q_segment.end = q_segment.start + k_len;
		}
		MapperResultLine new_mrl;
		new_mrl.query = q_segment;
		for (int b = 0; b < mrl.q_blocks.size(); b++) {
			Segment q_block = mrl.q_blocks[b];
			if (q_segment.isOverlapping(q_block)) {
				Segment t_block = mrl.t_blocks[b];
				if (q_block.start < q_segment.start) {
					t_block.start += (q_segment.start - q_block.start);
					q_block.start = q_segment.start;
				}
				if (q_block.end > q_segment.end) {
					t_block.end -= (q_block.end - q_segment.end);
					q_block.end = q_segment.end;
				}
				if (q_block.end != q_block.start) {
					new_mrl.q_blocks.push_back(q_block);
					new_mrl.t_blocks.push_back(t_block);
				}
			}
		}
		if (new_mrl.t_blocks.size() == 0)
			return;
		for (auto s : mrl.signatures_id) {
			bool keep = false;
			if (alignmentDerivedFeatures[s].signature_type == "splice") {
				if (new_mrl.t_blocks.size() > 1) {
					for (int i = 1; i < new_mrl.t_blocks.size(); i++) {
						if (new_mrl.t_blocks[i - 1].end
								== alignmentDerivedFeatures[s].position.start
								&& new_mrl.t_blocks[i].start
										== alignmentDerivedFeatures[s].position.end)
							keep = true;
					}
				}

			} else {
				for (auto &bl : new_mrl.t_blocks) {
					if (bl.isContained(
							alignmentDerivedFeatures[s].position.start)
							&& bl.isContained(
									alignmentDerivedFeatures[s].position.end
											- 1))
						keep = true;
				}

			}

			if (keep)
				new_mrl.signatures_id.push_back(s);
		}
		new_mrl.genes = mrl.genes;
		new_mrl.strand = mrl.strand;
		new_mrl.match = mrl.match;
		new_mrl.chromosome = mrl.chromosome;
		new_mrl.target.start = new_mrl.t_blocks[0].start;
		new_mrl.target.end = new_mrl.t_blocks[new_mrl.t_blocks.size() - 1].end;
		bool keep = true;
		for (auto other : winner_pos[kmer_idx]) {
			if (winner_mapper_results[other] == new_mrl)
				keep = false;
		}
		if (keep) {
			new_mrl.id = winner_mapper_results.size();
			new_mrl.query_index = kmer_idx;
			winner_pos[kmer_idx].push_back(new_mrl.id);
			winner_mapper_results.push_back(new_mrl);
		}
	}
}

int64_t KmerGraphSet::addWinningNode(Event &ev) {
	double max_val = *std::max_element(ev.best_kmer->values.begin(),
			ev.best_kmer->values.end());
	if (max_val < sequence_threshold) {
		return -1;
	}
	int64_t winner_idx = -1;
	for (uint64_t i = 0; i < winning_nodes.size(); i++) {
		if (winning_nodes[i]->id == ev.best_kmer->id) {
			winner_idx = i;
			i = winning_nodes.size();
		}
	}
	if (winner_idx == -1) {
		winner_idx = winning_nodes.size();
		winning_nodes.push_back(ev.best_kmer);
		winner_events.resize(winner_idx + 1);
	}
	winner_events[winner_idx].push_back(ev.id);
	return winner_idx;
}

json KmerGraphSet::generate_kmer_json(uint64_t node_idx) {
	BNode &node = *(winning_nodes[node_idx]);
	json json_events;
	for (auto e : winner_events[node_idx]) {
		json_events.push_back(events[e].to_json());
	}
	json json_alignments;
	for (auto a : winner_pos[node_idx]) {
		json_alignments.push_back(winner_mapper_results[a].to_json());
	}

	std::vector<double> values = node.values;
	if (max_values.size() == values.size()) { // rescale the values before printing them
		for (int i = 0; i < values.size(); i++) {
			values[i] = (values[i] / 100) * max_values[i];
		}
	}

	json data = { { "id", node.id }, { "kmer", node.kmer.str() }, { "values",
			values }, { "graph", graphs[node.graph].graph_type }, { "graph_id",
			node.graph } };
	data["alignments"] = json_alignments;
	data["events"] = json_events;
	if (has_matrix) {
		data["counts"] = counts[node_idx].count;
		std::vector<double> mean_by_group(n_groups), sd_by_group(n_groups);
		std::vector<std::vector<double>> group_counts(n_groups);
		for (int i = 0; i < n_groups; i++) {
			for (int j : group_map[i])
				group_counts[i].push_back(
						counts[node_idx].count[j] / normalization_factors[j]);
		}
		for (int i = 0; i < n_groups; i++) {
			double mean = Stats::mean(group_counts[i]);
			mean_by_group[i] = mean;
			sd_by_group[i] = Stats::stdev(group_counts[i], mean);
		}
		std::vector<double> fold_change;
		std::vector<double> pvalues;
		for (int i = 0; i < n_groups - 1; i++) {
			for (int j = i + 1; j < n_groups; j++) {
				double fc;
				if (mean_by_group[i] == 0) {
					fc = std::numeric_limits<double>::infinity();
				} else if (mean_by_group[j] == 0) {
					fc = -std::numeric_limits<double>::infinity();
				} else {
					fc = (mean_by_group[i] > mean_by_group[j] ?
							mean_by_group[i] / mean_by_group[j] :
							-(mean_by_group[j] / mean_by_group[i]));
				}
				fold_change.push_back(fc);
				pvalues.push_back(
						Stats::t_test_unequalVar(group_counts[i],
								group_counts[j]).second);
			}
		}
		data["means"] = mean_by_group;
		data["stdevs"] = sd_by_group;
		data["fc"] = fold_change;
		data["pvalues"] = pvalues;
	}
	return data;
}

void KmerGraphSet::write_tsv(std::string out_file) {
	std::cerr << "Writing " << out_file << "\n";
	std::ofstream tsv_out(out_file);
	std::string sep = "\t";
	tsv_out << "kmer" << sep << "graph_number" << sep << "graph_type" << sep
			<< "events" << sep << "genes";
	for (auto el : this->predictors_groups) {
		tsv_out << sep << el << "_acc";
	}
	for (auto el : this->predictors_groups) {
		tsv_out << sep << el << "_pval";
	}
	for (auto el : this->predictors_groups) {
		tsv_out << sep << el << "_fc";
	}
	tsv_out << "\n";
	tsv_out.flush();
	for (int i = 0; i < winning_nodes.size(); i++) {
		if (!winning_nodes[i]->masked) {
			json node = generate_kmer_json(i);
			tsv_out << node["kmer"] << sep << node["graph_id"] << sep
					<< node["graph"] << sep;
			std::set<std::string> genes;
			for (auto ev : node["events"]) {
				tsv_out << ev["type"] << ";";
				for (auto gen : ev["gene"]) {
					genes.insert(gen.dump());
				}
			}
			tsv_out << sep;
			for (auto gen : genes) {
				tsv_out << gen << ";";
			}
			for (auto val : node["values"]) {
				tsv_out << sep << val;
			}
			for (auto val : node["pvalues"]) {
				tsv_out << sep << val;
			}
			for (auto val : node["fc"]) {
				tsv_out << sep << val;
			}
			tsv_out << "\n";
		}
	}
}

void KmerGraphSet::getNodeCounts() {
	if (has_matrix) {
		uint64_t mc = omp_get_max_threads();
		std::vector<std::vector<Kmer>> requests(mc);
		uint64_t t = 0, kmer_per_core = std::floor(winning_nodes.size() / mc);
		for (auto &node : winning_nodes) {
			requests[t].push_back(node->kmer);
			if (t < mc - 1 && requests[t].size() == kmer_per_core) {
				t++;
			}
		}
		counts.resize(winning_nodes.size());
#pragma omp parallel
		{
			BinaryMatrix bm(matrix_file);
			bm.setNormalized(false);
			auto res = bm.getLines(requests[omp_get_thread_num()]);
#pragma omp critical
			{
				uint64_t from = omp_get_thread_num() * kmer_per_core;
				for (auto l : res) {
					counts[from++] = l;
				}
			}
		}
	}
}
}
}
