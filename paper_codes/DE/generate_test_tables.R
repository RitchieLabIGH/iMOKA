#!/usr/bin/env Rscript
library(BiocParallel, lib.loc = .Library[1])
register(MulticoreParam(8))
### Analyse results from Salmon
args <- commandArgs(trailingOnly = T)

source_file="./test.tsv"
result_dir="../salmon_counts/"

tx2gene_file="./tx2gene.gencode.v29.tsv"

if (length(args) != 4 ){
  stop( "Usage: source_file result_dir output_file tx2genes")
}

source_file = args[1]
result_dir=args[2]
output_file=args[3]
tx2gene_file= args[4]

sf = read.table(source_file, stringsAsFactors = F)
conditions = unique(sf[,2])

files <- file.path(result_dir , sf[,1] , "/quant.sf")
file_check=file.exists(files)
if ( ! all(file_check) ) {
  print(files[!file_check])
  stop("ERROR! There are missing files! ")
}

informations=data.frame(condition=sf[,2] , name = sf[,1], stringsAsFactors=F)
tx2gene=read.table(tx2gene_file, stringsAsFactors=F)


### Dependencies
library(tximport, lib.loc = .Library[1])
library(readr, lib.loc = .Library[1])

txi <- tximport(files, type="salmon", txOut=T)

for (gtx in c("txs", "genes")){
  for (tpm_or_reads in c("Reads", "TPM")){
    if ( gtx == "txs"){
      if (tpm_or_reads == "Reads" ){
        in_df = round(txi$counts)
      }else {
        in_df = txi$abundance
      }
    } else if (gtx == "genes"){
      txi_genes <- summarizeToGene(txi, tx2gene)
      if (tpm_or_reads == "Reads" ){
        in_df = round(txi_genes$counts)
      }else {
        in_df = txi_genes$abundance
      }
    }
    fname=paste0(output_file, "_", gtx ,"_", tpm_or_reads, ".matrix")
    write.table( t(c("", t(informations[,2]))) , file=fname, quote = F, row.names = F, col.names = F, sep = "\t")
    write.table( t(c("group", as.character(t(informations[,1])))) , file=fname, quote = F, row.names = F, col.names = F, sep = "\t", append = T)
    write.table( in_df , file=fname, quote = F, row.names = T, col.names = F, sep = "\t", append = T)
  }
}

