/*
 * Analysis.cpp
 *
 *  Created on: Mar 5, 2019
 *      Author: claudio
 */

#include "Aggregation.h"

namespace imoka {
namespace process {


bool Aggregation::run(int argc, char** argv){
	try {
		std::string action = std::string(argv[1]);
		if (action == "aggregate") {
			cxxopts::Options options("iMOKA",
					"Aggregate overlapping k-mers");
			options.add_options()
					("i,input", "Input file containing the informations...",cxxopts::value<std::string>())
					("o,output", "Basename of the output files", cxxopts::value<std::string>()->default_value("./aggregated"))
					("h,help","Show this help")
					("w,shift","Maximum shift considered during the edges creation", cxxopts::value<uint64_t>()->default_value("1"))
					("t,origin-threshold","Mininum value needed to create a graph",cxxopts::value<double>()->default_value("80"))
					("T,global-threshold","Global minimum value for whom the nodes will be used to build the graphs",cxxopts::value<double>()->default_value("70"))
					("d,de-coverage-threshold","Consider ad differentially expressed a gene if at least one trascipt is covered for more than this threshold in sequences.",cxxopts::value<double>()->default_value("50"))
					("m,mapper-config", "Mapper configuration JSON file",cxxopts::value<std::string>()->default_value("nomap"))
					("corr","Agglomerate k-mers with a correlation higher than this threshold and in the same gene or unmapped.", cxxopts::value<double>()->default_value("1"))
					("c,count-matrix", "The count matrix.", cxxopts::value<std::string>()->default_value("nocount"))
					("p,perfect-match", "Don't consider sequences with mismatches or indels");
			auto parsedArgs = options.parse(argc, argv);
			if (IOTools::checkArguments(parsedArgs, {"input", "output"}, log)) {
				log << "\n" << options.help() << "\n";
				return false;
			}

			return redundancyFilter(parsedArgs["input"].as<std::string>(),
					parsedArgs["output"].as<std::string>(),
					parsedArgs["count-matrix"].as<std::string>(),
					parsedArgs["mapper-config"].as<std::string>(),
					parsedArgs["shift"].as<uint64_t>(),
					parsedArgs["global-threshold"].as<double>(),
					parsedArgs["origin-threshold"].as<double>(),
					parsedArgs["de-coverage-threshold"].as<double>(),
					parsedArgs["corr"].as<double>(),
					parsedArgs["perfect-match"].count() != 0);
		} else if (action == "config") {
			cxxopts::Options options(
					std::string(argv[0]) + " " + std::string(argv[1]),
					"Print the default configurations");
			options.add_options()("o,output", "Output file",
					cxxopts::value<std::string>()->default_value("default"))(
					"h,help", "Print this help");
			auto parsedArgs = options.parse(argc, argv);
			if (parsedArgs.count("help") != 0) {
				log << options.help() << "\n";
				return false;
			}
			std::string where =
					parsedArgs.count("output") == 0 ?
							"stdcout" : parsedArgs["output"].as<std::string>();
			print_conf(where);
			return true;
		}
	} catch (const cxxopts::OptionException& e) {
		log << "Error parsing options: " << e.what() << "\n";
		return false;
	}
	return true;
}


void Aggregation::print_conf(std::string where) {
	if (where != "stdcout") {
		std::ofstream ofs(where);
		ofs << def_conf.dump(1) << "\n";
		ofs.close();
	} else {
		std::cout << def_conf.dump(1) << "\n";
	}
}




/// Main orchestrator of the aggregation process.
///
/// @param in_file input file. It must be a tsv file having as row the k-mers and as column the score for each pair of comparison. Read by imoka::matrix::TextMatrix
/// @param out_file output files base name. out_file.json will contain all the informations of the winner k-mers and of the sequences generated by the overlapping k-mers.
/// @param count_matrix the original matrix from which extract the counts of the final k-mers
/// @param json_config configuration file for the mapping process
/// @param w extend the overlap from k-1 to k-w when looking for overlapping k-mers
/// @param threshold score threshold, the k-mers don't have at least one value higher than this thr won't be considered at all
/// @param final_thr final score threshold, every final k-mer will have at least one value higher than this threshold
/// @param coverage_limit consider DE or IR if an exon or an intron is covered for more than this value by k-mers.
/// @return bool True is succeed
bool Aggregation::redundancyFilter(std::string in_file, std::string out_file,
		std::string count_matrix, std::string json_config, uint64_t w,
		double threshold = 70, double final_thr = 80,
		double coverage_limit = 10, double corr=1, bool perfect_match=false) {
	std::string json_info_file = out_file+".info.json";
	std::ofstream infoJSON(json_info_file);
	int step=0;
	infoJSON << "{\"message\":\"running\"}\n";
	infoJSON.close();
	if (! IOTools::fileExists(in_file) ){
		std::cerr << "Error! file " << in_file << " doesn't exists!\n";
	}
	if ( json_config != "nomap"){
		if (! IOTools::fileExists(json_config) ){
			std::cerr << "Error! file " << in_file << " doesn't exists!\n";
		}
	}

	auto start = std::chrono::high_resolution_clock::now();
	std::cout << "Starting the analysis with the following arguments: \n"
			<< "\t- Input file= " << in_file << "\n"
			<< "\t- Output file= " << out_file << "\n"
			<< "\t- Count matrix file= " << count_matrix << "\n"
			<< "\t- Configuration file= " << json_config << "\n"
			<< "\t- Shift= " << w << "\n"
			<< "\t- General threshold= " << threshold << "\n"
			<< "\t- Source threshold= " << final_thr << "\n"
			<< "\t- Coverage limit= " << coverage_limit << "\n"
			<< "\t- Correlation thr= " << corr << "\n";
	json info = {{"input_file",in_file }, {"output_file" , out_file}, {"count_matrix", count_matrix},

	 {"shift", w}, {"global_threshold",threshold }, {"source_threshold",final_thr }, {"coverage_thr", coverage_limit}, {"correlation_thr", corr} ,
	{"starting_time", std::time(0)}};


	std::cout << "\nStep "<< step++ << " : Reading "<< in_file <<  "...";std::cout.flush();
	graphs::KmerGraphSet gg(w, count_matrix);
	gg.load(in_file, threshold);
	uint64_t or_nodes = gg.size();
	std::cout  << "\tdone. Read " << or_nodes << " kmers."
			<< "\n\tSpace occupied: "
			<< IOTools::format_space_human(IOTools::getCurrentProcessMemory())
	<< "\nStep " << step++ << " : Computing edges... ";std::cout.flush();
	info["kmers_total"]=or_nodes;
	info["mem_after_reading"] = IOTools::format_space_human(IOTools::getCurrentProcessMemory());
	gg.rescale(); // reascale the values in the node so that for each comparison the scale is 0-100
	gg.makeEdges();
	std::cout << "done.\n"<< "\tSpace occupied: " << IOTools::format_space_human(IOTools::getCurrentProcessMemory()) <<
			"\nStep " << step++ << " : Building the groups...";std::cout.flush();
	gg.makeGraphsFromBestExtension(final_thr);
	std::cout << "done.\n\tFound " << gg.graph_type.size() << " graphs : \n";
	info["n_of_graphs"]=gg.graph_type.size();
	uint64_t used_nodes = 0;
	for (auto gt : gg.graph_type_count) {
		std::cout << "\t  - " << gt.first << ": " << gt.second.first << ","
				<< gt.second.second << "\n";
		used_nodes += gt.second.second;
	}
	std::cout << "\t Nodes used: " << used_nodes << "/" << or_nodes << " ( "
			<< (or_nodes - used_nodes) << " discarded )\n";std::cout.flush();
	info["kmers_used"]=used_nodes;
	std::cout << "Step " << step++ << " : Extracting the sequences... ";std::cout.flush();
	gg.generateSequencesFromGraphs(final_thr);
	if ( gg.sequences.size() == 0 ) {
		log << "Try with a less stringent threshold, the current one doesn't allow the creation of any sequence.\n";
		return false;
	}
	std::cout << "done. \n\tFound  " <<  gg.sequences.size() << " sequences.\n";std::cout.flush();
	std::cout << "\tSpace occupied: " << IOTools::format_space_human(IOTools::getCurrentProcessMemory()) <<"\n";
	info["n_of_sequences"]=gg.sequences.size();
	if ( json_config != "nomap" ){
		std::string annotation_file;
		json user_conf;
		if (json_config.size() > 0 && json_config != "default") {
			user_conf = IOTools::parseJSON(json_config);
		}
		IOTools::getParameter(user_conf["annotation"], def_conf["annotation"], "file", annotation_file);
		if (! IOTools::fileExists(annotation_file)){
			std::cerr << "Error! file " << annotation_file << " doesn't exists.\n";
			return false;
		}
		Mapper mapper(user_conf, def_conf);
		if ( mapper.isInit() ){
			info["mapping"]= user_conf;
			std::cout << "Step " << step++ << " : Mapping the sequences... ";std::cout.flush();
			gg.setPerfectMatch(perfect_match);
			gg.alignSequences(mapper);
			std::cout << "\tSpace occupied: " << IOTools::format_space_human(IOTools::getCurrentProcessMemory()) <<"\n";
			std::cout << "Step " << step++ << " : Annotating...";
			std::cout.flush();
			gg.annotate(annotation_file, out_file + ".sequences.bed", coverage_limit);
			std::cout << "\tSpace occupied: " << IOTools::format_space_human(IOTools::getCurrentProcessMemory()) <<"\n";

		} else {
			std::cerr << "Warning: given configuration " << json_config << " is not valid: " << mapper.error_message << "\nThe job will proceed with nomap configurations.\n"  ;
			json_config= "nomap";
		}
	}

	if ( json_config == "nomap" ) {

		info["mapping"]="nomap";
		std::cout << "Step " << step++ << " : processing the best k-mers for each graph...";
		gg.processUnAnnotated();
		std::cout << "done.\n";
	}
	std::cout << "Step " << step++ << " : Recovering winners and counts...";
	gg.recoverWinners(corr);
	info["mem_after_winner"] = IOTools::format_space_human(IOTools::getCurrentProcessMemory());
	std::cout << "done.\nStep " << step++ << " : Writing output files...";
	std::ofstream out_str;
	out_str.open(out_file+".kmers.matrix");
	uint64_t n_of_winner=0;
	if ( gg.has_matrix ){
		matrix::BinaryMatrix bm(count_matrix);
		IOTools::printMatrixHeader(out_str, bm.col_names, bm.col_groups);

		for (int i=0; i < gg.counts.size() ;i++){
			if (! gg.winning_nodes[i]->masked ){
				out_str << gg.counts[i].getKmer() ;
				for (int j=0; j< gg.counts[i].count.size(); j++ ) out_str << "\t" << (gg.counts[i].count[j] / bm.normalization_factors[j] ) ;
				out_str << "\n";
				n_of_winner++;
			}
		}
		out_str.close();
		info["final_kmers"]=n_of_winner;
	} else {
		for (int i=0; i < gg.counts.size() ;i++){
			if (! gg.winning_nodes[i]->masked ) n_of_winner++;
		}
	}

	if ( json_config != "nomap" ){
		out_str.open(out_file+".kmers.bed");
		for (int i=0; i< gg.winning_nodes.size(); i++){
			auto & node = gg.winning_nodes[i];
			if (! node->masked){
				for ( auto pos : gg.winner_pos[i]){
					out_str << gg.winner_mapper_results[pos].to_bed() ;
				}
			}
		}
		out_str.close();
	}

	gg.write_json(out_file + ".json");
	gg.write_tsv(out_file+".tsv");
	info["end_time"]= std::time(0);

	infoJSON.open(json_info_file);
	infoJSON << info.dump() << "\n";
	infoJSON.close();
	std::cout << "done.\n\n";
	return true;
}
}
} /* namespace kma */

