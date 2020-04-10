/*
 * Gene.cpp
 *
 *  Created on: May 14, 2019
 *      Author: claudio
 */

#include "Gene.h"
namespace imoka {
namespace annotation {
using namespace matrix;
using namespace graphs;

void Gene::init(std::string geneId, std::string geneName, double coverage_limit,
		std::map<std::string, std::vector<Segment>> transcripts_exons,
		 std::set<uint64_t> mapper_results_idxs,
		 std::vector<MapperResultLine> & all_mapper_results,
		 std::vector<AlignmentDerivedFeature> & all_signatures,
		 std::vector<GraphSequence> & all_sequences) {
	gene_id = geneId;
	gene_name = geneName;
	std::map<std::string, std::vector<Segment>> exon_covered_positions;
	std::map<std::string, std::vector<std::vector<Segment>>> intron_covered_positions;
	std::map<std::string, std::vector<std::vector<BNode*>>> intron_best_kmers;
	std::set<uint64_t> seq_set;
	uint64_t best_kmer_mapper_result;
	std::vector<Segment> exons;
	double max_val = 0;
	double cmax;
	std::map<std::string, std::set<uint64_t>> covering_aln;
	std::map<std::string, std::vector<std::set<uint64_t>>> intron_covering_aln;
	alignments = mapper_results_idxs;
	std::map<std::string, std::vector<Segment>> transcripts_introns;
	for (auto & pair : transcripts_exons) {
		transcripts_introns[pair.first].clear();
		std::sort(pair.second.begin(), pair.second.end());
		for (int i = 1; i < pair.second.size(); i++) {
			transcripts_introns[pair.first].push_back(
					Segment(pair.second[i - 1].end, pair.second[i].start));
		}
		intron_covered_positions[pair.first].resize(pair.second.size() - 1);
		intron_best_kmers[pair.first].resize(pair.second.size() - 1);
		intron_covering_aln[pair.first].resize(pair.second.size() - 1);
	}
	for (auto & s : mapper_results_idxs) {
		const MapperResultLine & mrl = all_mapper_results[s];
		chromosome = mrl.chromosome;
		alignmentDerivedFeatures.insert(mrl.signatures_id.begin(),
				mrl.signatures_id.end());
		for (auto & seg : mrl.t_blocks) {
			for (auto & pair : transcripts_exons) {
				for (auto & exon : pair.second) {
					if (seg.isOverlapping(exon)) {
						Segment ov_seg(
								exon.start < seg.start ? seg.start : exon.start,
								exon.end > seg.end ? seg.end : exon.end);
						add_segments(std::vector<Segment> { ov_seg },
								exon_covered_positions[pair.first]);
						covering_aln[pair.first].insert(s);
					}
				}
			}
			for (auto & pair : transcripts_introns) {
				for (int intron = 0; intron < pair.second.size(); intron++) {
					if (seg.isOverlapping(pair.second[intron])) {
						Segment ov_seg(
								pair.second[intron].start < seg.start ?
										seg.start : pair.second[intron].start,
								pair.second[intron].end > seg.end ?
										seg.end : pair.second[intron].end);
						add_segments(std::vector<Segment> { ov_seg },
								intron_covered_positions[pair.first][intron]);
						intron_best_kmers[pair.first][intron].push_back(
								all_sequences[mrl.query_index].best_kmer);
						intron_covering_aln[pair.first][intron].insert(s);
					}
				}
			}
		}
		seq_set.insert(mrl.query_index);
		cmax = *std::max_element(
				all_sequences[mrl.query_index].best_kmer->values.begin(),
				all_sequences[mrl.query_index].best_kmer->values.end());
		if (cmax > max_val) {
			max_val = cmax;
			best_kmer = all_sequences[mrl.query_index].best_kmer;
			best_kmer_mapper_result = s;
		}
	}
	for (auto & s : seq_set) {
		sequences.insert(s);
	}
	double intron_cov;
	for (auto & transcript : transcripts_introns) {
		for (int i = 0; i < transcript.second.size(); i++) {
			intron_cov = 0;
			for (auto & s : intron_covered_positions[transcript.first][i]) {
				intron_cov += (s.end - s.start);
			}
			intron_cov = (std::floor(
					intron_cov * 10000
							/ (transcript.second[i].end
									- transcript.second[i].start)) / 100);
			if (intron_cov > coverage_limit) {
				std::vector<BNode*> & bkv =
						intron_best_kmers[transcript.first][i];
				BNode* bk = bkv[0];
				double max_val = *std::max_element(bk->values.begin(),
						bk->values.end());
				double c_val;
				for (int j = 1; j < bkv.size(); j++) {
					c_val = *std::max_element(bkv[j]->values.begin(),
							bkv[j]->values.end());
					if (c_val > max_val) {
						bk = bkv[j];
						max_val = c_val;
					}
				}
				bool found = false;
				for (int64_t e = events.size() - 1; e > 0; --e) {
					if (events[e].gene_name.count(gene_name) != 0
							&& events[e].type == "intron"
							&& events[e].best_kmer == bk) {
						found = true;
						events[e].info += "\n" + transcript.first + " intron "
								+ std::to_string(i) + " cov "
								+ std::to_string(intron_cov);
						e = 0;
					}
				}
				if (!found) {
					Event ev("intron", { gene_name }, bk);
					ev.info = transcript.first + "_intron_" + std::to_string(i)
							+ "_cov_" + std::to_string(intron_cov);
					for (auto el : intron_covering_aln[transcript.first][i])
						ev.alignments.push_back(el);
					events.push_back(ev);
				}
			}
		}
	}
	std::vector<std::string> high_coverage_transcripts;
	std::map<std::string, uint64_t> transcripts_length;
	for (auto & pair : transcripts_exons)
		for (auto & exon : pair.second)
			transcripts_length[pair.first] += (exon.end - exon.start);

	for (auto & pos : exon_covered_positions) {
		for (auto & seg : pos.second)
			coverage[pos.first] += (seg.end - seg.start);
		coverage[pos.first] = (std::floor(
				(double) coverage[pos.first] * 10000
						/ transcripts_length[pos.first]) / 100);
		if (coverage[pos.first] > coverage_limit)
			high_coverage_transcripts.push_back(pos.first);
	}
	if (high_coverage_transcripts.size() > 0) {
		double bkval = -1;
		isDE = true;
		BNode * bk;
		std::set<uint64_t> all_covering_aln;
		for (auto & trans : high_coverage_transcripts) {
			for (auto idx : covering_aln[trans]) {
				const GraphSequence & gs =
						all_sequences[all_mapper_results[idx].query_index];
				if (bkval < 0
						|| *std::max_element(gs.best_kmer->values.begin(),
								gs.best_kmer->values.end()) > bkval) {
					bk = gs.best_kmer;
					bkval = *std::max_element(gs.best_kmer->values.begin(),
							gs.best_kmer->values.end());
				}
				all_covering_aln.insert(idx);
			}
		}
		Event ev("DE", { gene_name }, bk);
		ev.alignments.insert(ev.alignments.end(), all_covering_aln.begin(),
				all_covering_aln.end());
		ev.info = "";
		for (auto hct : high_coverage_transcripts ) {
			ev.info += hct + " [ " + std::to_string(std::round(coverage[hct]))
					+ "% of coverage ]\n";
		}
		events.push_back(ev);
	}
	for (auto i : alignmentDerivedFeatures) {
		AlignmentDerivedFeature & sa = all_signatures[i];
		if (sa.generates_event && *std::max_element(sa.best_kmer->values.begin(),
				sa.best_kmer->values.end()) < (max_val-3) ){
			sa.generates_event=false;
		}
	}
	for (auto i : alignmentDerivedFeatures) {
		const AlignmentDerivedFeature & sa = all_signatures[i];
		if ( ads_stats.count(sa.signature_type) == 0 )ads_stats[sa.signature_type]=0;
		ads_stats[sa.signature_type]+=1;
		for (auto j : alignmentDerivedFeatures) {
			if (j > i) {
				const AlignmentDerivedFeature & sb = all_signatures[j];
				if ((sa.signature_type == "splice")
						&& (sb.signature_type == "splice")
						&& ((sa.position.start == sb.position.start
								&& sa.position.end != sb.position.end)
								|| (sa.position.start != sb.position.start
										&& sa.position.end == sb.position.end))) {
					Event ev("multiple_splice_junctions", { gene_name },
							sa.best_kmer);
					ev.signatures= {sa.id, sb.id};
					if (*std::max_element(sb.best_kmer->values.begin(),
							sb.best_kmer->values.end())
							> *std::max_element(sa.best_kmer->values.begin(),
									sa.best_kmer->values.end())) {
						ev.best_kmer = sb.best_kmer;
					}
					ev.info = sa.info + " OR " + sb.info;
					events.push_back(ev);
				}
			}
		}
	}
	bool represented = false;

	for (auto & ev : events) {
		if (ev.best_kmer == best_kmer) {
			represented = true;
		}
	}

	if (!represented) {
		Event ev("gene", { gene_name }, best_kmer);
		ev.info = "Best k-mer in gene " + gene_name;
		ev.alignments.push_back(best_kmer_mapper_result);
		events.push_back(ev);
	}

}

void Gene::add_segments(const std::vector<Segment> & new_segments,
		std::vector<Segment> & target) {
	bool added;
	for (auto & s : new_segments) {
		added = false;
		for (auto & r : target) {
			if (s.isOverlapping(r)) {
				if (r.start > s.start)
					r.start = s.start;
				if (r.end < s.end)
					r.end = s.end;
				added = true;
			}
		}
		if (!added)
			target.push_back(s);
	}
	std::sort(target.begin(), target.end());
}

json Gene::to_json() {

	json out = { { "gene_id", gene_id }, { "name", gene_name }, { "chromosome",
			chromosome }, { "ads", ads_stats }, { "id", id }, {
			"alignments", alignments }, { "best_kmer", best_kmer->id }, {
			"coverages", coverage }  };

	return out;
}
}
}
