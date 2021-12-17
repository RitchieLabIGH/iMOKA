/*
 * SplitBamRead.cpp
 *
 *  Created on: Nov 18, 2021
 *      Author: claudio
 */

#include "SplitBamRead.h"

namespace imoka {

SplitBamRead::~SplitBamRead() {
	// TODO Auto-generated destructor stub
}

void SplitBamRead::load_clusters(std::string cluster_file) {
	std::vector<std::string> lines = IOTools::getLinesFromFile(cluster_file);
	std::vector<std::string> arr;
	int cluster;
	max_cluster = 0;
	cb_to_clusters.clear();
	for (int i = 1; i < lines.size(); i++) {
		IOTools::split(arr, lines[i], ',');
		cluster = std::stoi(arr[1]);
		cb_to_clusters[arr[0]] = cluster;
		if (cluster > max_cluster) {
			max_cluster = cluster;
			clusters_sizes.resize(max_cluster, 0);
		}
		clusters_sizes[cluster-1]+=1;
	}
	out_file_names.clear();
	for (int i = 0; i < max_cluster; i++) {
		out_file_names.push_back(base_file + std::to_string(i + 1) + ".fq");
		std::ofstream *ofs = new std::ofstream(
				base_file + std::to_string(i + 1) + ".fq");
		clusters.push_back(ofs);
	}
}
void SplitBamRead::split(bam_read_core &a, bam_read_core &b) {
	std::map<std::string, std::string> aux = a.getAuxiliary();
	std::string out;
	if (aux.count("CB") == 1 && cb_to_clusters.count(aux["CB"]) == 1 ) {
		out=a.fastq();
		clusters[cb_to_clusters[aux["CB"]] - 1]->write(out.data(),out.size() );
	}
	if (b.empty)
		return;
	aux = b.getAuxiliary();
	if (aux.count("CB") == 1 && cb_to_clusters.count(aux["CB"]) == 1) {
		out=b.fastq();
		clusters[cb_to_clusters[aux["CB"]] - 1]->write(out.data(),out.size() );
	}

}

} /* namespace imoka */
