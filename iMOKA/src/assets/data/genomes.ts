export const genomes = {
	"hg38" : {   "id": "hg38",
    "name": "Human (GRCh38/hg38)",
    "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa",
    "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa.fai",
    "cytobandURL": "https://s3.amazonaws.com/igv.org.genomes/hg38/annotations/cytoBandIdeo.txt.gz",
    "tracks": [
      {
        "name": "Ensembl release 100",
		"format": "genepred",
		"sourceType" : "file",
        "url": `serve://${__dirname}/assets/data/genPred.sorted.txt.gz`,
        "indexURL": `serve://${__dirname}/assets/data/genPred.sorted.txt.gz.tbi`,
        "visibilityWindow": -1,
        "removable": false,
        "order": 1000000
      }
    ]
  },
  "hg19" : {
    "id": "hg19",
    "name": "Human (CRCh37/hg19)",
    "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta",
    "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta.fai",
    "cytobandURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/cytoBand.txt",
    "tracks": [
      {
        "name": "Refseq Genes",
        "format": "refgene",
        "url": "https://s3.amazonaws.com/igv.org.genomes/hg19/refGene.sorted.txt.gz",
        "indexURL": "https://s3.amazonaws.com/igv.org.genomes/hg19/refGene.sorted.txt.gz.tbi",
        "visibilityWindow": -1,
        "removable": false,
        "order": 1000000
      }
    ]
  },
}