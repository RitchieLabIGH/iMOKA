#!/usr/bin/env Rscript
library(BiocParallel, lib.loc = .Library[1])
register(MulticoreParam(8))
### Analyse results from Salmon
p_val_thr=0.05
logfc_thr=0.58
args <- commandArgs(trailingOnly = T)

source_file="./training.tsv"
result_dir="../salmon_counts/"

tx2gene_file="./tx2gene.gencode.v29.tsv"
gtx="genes"
tpm_or_reads="Reads"
met="limmaVoom"

if (length(args) != 7 ){
  stop( "Usage: source_file result_dir output_file [TPM|Reads] [DESeq2|DRIMseq|edgeR|limmaVoom] [genes|txs] tx2genes")
}

source_file = args[1]
result_dir=args[2]
output_file=args[3]
tpm_or_reads = args[4]
met= args[5]
gtx= args[6]
tx2gene_file= args[7]

sf = read.table(source_file, stringsAsFactors = F)
conditions = unique(sf[,2])
if ( gtx == "txs"){
  id_col=2
} else if (gtx == "genes"){
  id_col=1
}else {
  stop(paste0("ERROR! ", gtx , " not valid. Use 'genes' or 'txs' "))
}

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
if (met == "DESeq2"){
  library(DESeq2, lib.loc = .Library[1])  
  if ( tpm_or_reads == "TPM" ){
    stop("Error! DESeq2 works only with read counts ")
  }
} else if ( met == "edgeR"){
  library(edgeR, lib.loc = .Library[1])  
} else if (met =="limmaVoom"){
  library(limma, lib.loc = .Library[1])  
  library(edgeR, lib.loc = .Library[1])
} else {
  stop (paste0("ERROR! method ", met, " unknown."))
}

output_features=c();

for (grpA in 1:(length(conditions)-1)){
  for ( grpB in (grpA+1):length(conditions) ) {
    mask=informations$condition== conditions[grpA] | informations$condition == conditions[grpB]
    tmp_info=informations[mask,]
    tmp_info$condition=factor(tmp_info$condition)
    ### Read the files
    txi = NULL
    in_df=NULL
    txi_genes=NULL
    gc()
    txi <- tximport(files[mask], type="salmon", txOut=T)
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
    
    if (met == "DESeq2"){
      dds <- DESeqDataSetFromMatrix( in_df,
                                     colData = tmp_info,
                                     design= ~ condition)                              
      dds <- DESeq(dds, parallel = T)
      res <- DESeq2::results(dds, contrast=c("condition", conditions[grpA],conditions[grpB]))
      res=res[!is.na(res$padj),]
      resOrdered <- res[order(res$pvalue),]
      filter= resOrdered$padj < p_val_thr & abs(resOrdered$log2FoldChange) > logfc_thr 
      if ( sum(filter) > 20 ){
        out=resOrdered[filter,]  
      } else {
        out=resOrdered[1:100,]  
      }
      write.table(out, file=paste0(output_file, "_" ,grpA , "_" , grpB) , quote = F)
      output_features = c(output_features, rownames(out))
    } else if ( met == "edgeR"){
      edge_r = DGEList(counts= in_df, group = tmp_info$condition)
      edge_r = calcNormFactors(edge_r, method="TMM")
      edge_r = estimateCommonDisp(edge_r)
      edge_r = estimateTagwiseDisp(edge_r, trend="movingave")
      edge_r.test = exactTest(edge_r)
      df= data.frame(tx = rownames(edge_r.test$table), padj = p.adjust(edge_r.test$table$PValue, method="BH"), logFC= edge_r.test$table$logFC )
      filter=df$padj< p_val_thr & abs(df$logFC) > logfc_thr
      if (sum(filter) > 20) {
        out = df[filter,]
      } else {
        out=df[order(df$padj), ]
        out=out[1:100,]
      }
      write.table(out, file=paste0(output_file, "_" ,grpA , "_" , grpB), quote=F, row.names = F)
      output_features=c(output_features, as.character(out[,1]))
      edge_r=NULL
    } else if (met =="limmaVoom"){
      nf = calcNormFactors(in_df, method = "TMM")
      voom.data = voom(in_df, design = model.matrix(~tmp_info$condition) , lib.size = colSums(in_df)*nf )
      voom.data$genes = rownames(in_df)
      voom.fitlimma = lmFit(voom.data, design = model.matrix(~tmp_info$condition))
      voom.fitbayes = eBayes(voom.fitlimma)
      #df=data.frame(gene=rownames(voom.fitbayes$p.value), padj= p.adjust(voom.fitbayes$p.value[, 2], method = "BH")) the TopTable already adjust the pvalue with BH
      out=topTable(voom.fitbayes, n=Inf)
      colnames(out)= c("name", "logFC", "AveExpr", "t" , "Pval", "padj", "B")
      filter= out$padj < p_val_thr & abs(out$logFC) > logfc_thr
      if ( sum(filter) > 20 ){
        out=out[filter,]
      } else {
        out=out[order(out$padj),]
        out=out[1:100,]
      }
      write.table(out, file=paste0(output_file, "_" ,grpA , "_" , grpB), row.names = F, quote = F)
      output_features=c(output_features, as.character(out[,1]))
    } else {
      print (paste0("ERROR! method ", met, " unknown."))
    }
  }
}

txi <- tximport(files, type="salmon", txOut=T)
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
fname=paste0(output_file, ".matrix")
write.table( t(c("", t(informations[,2]))) , file=fname, quote = F, row.names = F, col.names = F, sep = "\t")
write.table( t(c("group", as.character(t(informations[,1])))) , file=fname, quote = F, row.names = F, col.names = F, sep = "\t", append = T)
write.table( in_df[rownames(in_df) %in% output_features,  ] , file=fname, quote = F, row.names = T, col.names = F, sep = "\t", append = T)

