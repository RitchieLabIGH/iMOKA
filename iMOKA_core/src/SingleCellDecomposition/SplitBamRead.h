/*
 * SplitBamRead.h
 *
 *  Created on: Nov 18, 2021
 *      Author: claudio
 */

#ifndef SINGLECELLDECOMPOSITION_SPLITBAMREAD_H_
#define SINGLECELLDECOMPOSITION_SPLITBAMREAD_H_

#include "../Utils/BamReader.h"

namespace imoka {

/*
 *
 */
class SplitBamRead {
public:
	SplitBamRead(std::string output_folder){
		base_file=output_folder+"/Cluster_";
		IOTools::makeDir(output_folder);
	}
	virtual ~SplitBamRead();
	void load_clusters(std::string cluster_file);
	void split(  bam_read_core & a,  bam_read_core & b);
	void close(){
		for (auto a : clusters){
			a->close();
		}
		clusters.clear();
		cb_to_clusters.clear();
	}

	std::vector<uint32_t> getClustersSizes(){
		 return clusters_sizes;
	}
	std::vector<std::string> getOutFiles(){
		return out_file_names;
	}
private:
	std::map<std::string, int> cb_to_clusters;
	std::vector<uint32_t> clusters_sizes;
	std::vector<std::string> out_file_names;
	std::vector<std::ofstream*> clusters;
	std::string base_file;
	int max_cluster= 0;

};

} /* namespace imoka */

#endif /* SINGLECELLDECOMPOSITION_SPLITBAMREAD_H_ */
