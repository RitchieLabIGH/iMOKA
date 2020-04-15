



# iMOKA CLI

- [Install](#install)
- [Preprocessing](#preprocess)
- [Experiment design](#design)
- [Run the core software](#core):
	- [First feature reduction](#fr1)
	- [Second feature reduction](#fr2)
	- [Random forest models creation](#models)
	- [Self Organising Map](#SOM)
- [Additional informations](#additional):
	- [Aligner configuration](#mapper)


## <a name="install"></a> Install
iMOKA doesn't require any installation apart from [singularity](https://sylabs.io/guides/3.0/user-guide/quick_start.html#quick-installation-steps). 
Once you have installed it, you can download the iMOKA image using the following command:
``` 
sudo singularity build iMOKA.img docker://cloxd/imoka:1.0
```
This command will create an image, iMOKA.img, that will be used to run every part of the software, increasing the reproducibility of the experiments.
Furthermore, if you want to take advantage of the mapping step during the last filter, in order to aggregate more efficiently the k-mers that are biologically closer, you need to [configure the aligner.](#mapper)
You can also download the [base image](https://sourceforge.net/projects/imoka/files/iMOKA_core/iMOKA/download) or the [extended one](https://sourceforge.net/projects/imoka/files/iMOKA_core/iMOKA_extended/download) (containing the hg38 blat reference) from SourceForge: 

## <a name="preprocess"></a> Preprocessing
The preprocessing step converts takes as input biological reads and count the k-mers using [KMC3](https://github.com/refresh-bio/KMC) 
The input file ( that we'll call source.tsv ) have to include three tab separeted columns:
```
sample_1_name	sample_1_group	sample_1_reads_file
sample_2_name	sample_2_group	sample_2_reads_file
```
Where:
- sample_x_name : is the ID that will be associated with the sample.
- sample_x_group: is the name of the group to whom the sample belong. If unknown, you can use "NA" or any other string. 
- sample_x_reads_file : It can be fasta/fastq/bam files, compressed with gzip or not. In case of bam files, they will be extracted in the corresponding fastq files.
	- A local file ( the full path is necessary )
	- A remote file ( include the htpp:// or the ftp:// ).
	- One or more SRR or ERR entries, that will be downloaded

To run the preprocess script, you can use the following command:
```
singularity exec iMOKA.img preprocess.sh -i source.tsv 
```
The script will produce a file in the folder where the command had been launched, called by default create_matrix.tsv. This will be the inptu file of the next step.

The script accepts multiple arguments that will influence the preprocess step. They are described in the help message:
```
singularity exec iMOKA.img preprocess.sh -h 
```


Each preprocess is independent by the other, so if you are workin on a cluster or a server, you can run them in parallel without any interference.
Note that the preprocess script is an utility to download the data and run KMC3 within the singularity environment in order to generate the sorted k-mer count files, that are the first real input of iMOKA. You can use other softwares or pipelines to generate those files. 
For example, you can use jellyfish, dump in column formatted text file ( flag -c) and sort that file with the GNU sort command.


## <a name="design"></a> Experimental design
This is the real first step of the software that generates a json file containing all the informations to generate the k-mer count matrix. The length of k has to be the same for all the samples.

iMOKA requires as input a tab separeted text file containing the position of the sorted k-mer count file, the name of the sample and his group. For example:
```
/path/to/directory/sample_1_counts.tsv	sample_1	responsive
/path/to/directory/sample_2_counts.tsv	sample_2	responsive
/path/to/directory/sample_3_counts.tsv	sample_3	responsive
/path/to/directory/sample_4_counts.tsv	sample_4	resistent
/path/to/directory/sample_5_counts.tsv	sample_5	resistent
/path/to/directory/sample_6_counts.tsv	sample_6	resistent
...
```
The preprocess.sh script creates already this file, called create_matrix.tsv. 
We strongly raccomend to give the full path of the k-mer counts.

A k-mer count file should look like this:
```
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA	1322
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC	256
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG	48
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAT	456
```

You can use the following command to create the matrix: 
```
singularity exec iMOKA.img iMOKA_core create \
	 -i ./create_matrix.tsv -o ./matrix.json 
```
This will convert each count file in binary format, adding the suffix ".sorted.bin". 
If you used the preprocess.sh script, the file is already converted and the creation of the matrix will be faster.
You can use from two to any number of classes per experiment and you can reuse in different experiments the same samples, creating matrices designed in according to your needs.

Each sample will be normalized using the total sum of the the counts and, in order to not have number too small, they're rescaled multiplying by a rescale factor (by default 1e9). 
The formula for the normalization of the i*th* k-mer of the j*th* sample is the following:

> normalized_value_i_j = (raw_count_i_j * rescale_factor) / (total_counts_j )

If you want to change the normalization, you can modify the array having the key "total_counts" in the json file. 



## <a name="core"></a> Run the core software
The main software aims to reduce the k-mers to a non redundant subset having the potential to classify the samples in the given classes. The final list of k-mer can be directly explored using the GUI (TODO link), where it's also possible to refine the list with filters and criterias in according to the user's needs.

The refined lists can be used to build classification models, for example using the Random Forest model generator included in iMOKA, a more explorative algorithm as GECKO (https://github.com/RitchieLabIGH/GECKO) or a custom software. 
Furthermore iMOKA offers a self organizing map based clusterization module that allows to clusterize the k-mers in order to have a visual rapresentation of the samples. 

###  <a name="fr1"></a> First feature reduction: Reduce
The first filter reduce the k-mers in according to their ability to classify the samples within a Baeysian Classifier. To run the process use the following command:

```
singularity exec iMOKA.img iMOKA_core reduce -i matrix.json -o reduced.matrix
```

Additional argument are described with 

```
singularity exec iMOKA.img iMOKA_core reduce -h
```

The output file, reduced.matrix, is a tab separated text file containing the k-mers in the first column and the accuracies values for each pairwise comparison. In case of three classes, for example A, B and C, the file will contains:

```
kmer_name	A_vs_B	A_vs_C	B_vs_C
```

###  <a name="fr2"></a> Second feature reduction: Aggregate
This second filter aggregates the k-mers that overlap, reducing the redundancy of information.
Furthermore, the sequences generated by the full trasversal of the graphs can be mapped to a reference genome, allowing to aggregate the k-mers that overlap the same biological elements. This step is skipped by default, but we reccomand to include it.
The mapping step require to configure a mapper in the configuration file and to give an annotation file to use. For more informations about how to setup the mapper, read the [dedicated paragraph ](#mapper) . 
The extended version of iMOKA (available on SourceForge ) contains a prebuilt version of the human reference hg38 blat database. You can use it with the default argument. 
```
singularity exec iMOKA.img iMOKA_core aggregate -i reduced.matrix -c matrix.json -m default
```
For further informations about the arguments, you can use the command:
```
singularity exec iMOKA.img iMOKA_core aggregate -h
```

###  <a name="models"></a> Random forest models creation
We suggest to use a Random Forest based approach to create predictive models from k-mers. The python script "random_forest.py" included with iMOKA takes as input a k-mer matrix in text file, output of the aggregation step or of the GUI "save matrix" button in the k-mer list application.
To run the script from the command line: 
```
singularity exec iMOKA.img random_forest.py input.matrix ./output 
```
By default it will first reduce the number of features used by the final model through a random forest with 1000 trees and  keeping only the 10 k-mers with the highest feature information. 
The best parameters for the final model are then searched using a cross validated grid search procedure of 5 fold, that optimize the balanced accuracy tuning the number of trees ( 1000 or 500), the decision trees criterion ( gini or entropy) and the "min_samples_split" ( 0.05, 0.10 , 0.15 ).
For further informations about those parameters, refers to [sklearn library's RandomForestClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html).
The accuracy of the final model is then asserted through a 10 fold cross validation procedure.
The output of the program consists in: 
 -  **output.json** : containing all the results of the process in JSON format and readable by iMOKA GUI
 - **output_predictions.tsv** : the aggregation of the prediction made by all the models generated, sample-wise.
 - **output_fi.tsv** : a table containing the average feature importances, feature-wise.
 - **./output_models/** : a folder containing 
   - **X_tree_acc_Y.dot/png** : a [DecisionTreeClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.tree.DecisionTreeClassifier.html) in dot and png format, trained with the features selected at the round X and having an accuracy of Y
   - **X_RF.pickle**: a pickle file containing the model generated in the round X and loadable using the prediction.py script.

The program allows to tune different parameters, whose description is available using
```
singularity exec iMOKA.img random_forest.py -h
```



###  <a name="SOM"></a> Self Organising Map

## <a name="additional"></a> Additional informations

### <a name="mapper"></a> Mapper configuration

The [aggregation step](#fr2) can use a mapper to increase the efficiency of the redundancy reduction and to have a first level of annotation. The singularity image contains blat, gmap and STAR. 
To consult the versions installed in the current image, you can run
```
singularity run iMOKA.img STAR --version
singularity run iMOKA.img gmap --version
```
The extended version of iMOKA uses blat and a pre-installed version of the blat database of the human reference genome hg38 ( GENCODE v29 ), embedded in the singularity image in the position /blat_ref/. 

To print the default configuration JSON file, you can use the command:
```
singularity run iMOKA.img iMOKA_core config
```
If you prefer a lighter version, you can use the basic image.



