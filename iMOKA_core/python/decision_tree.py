#!/usr/bin/env python3 

## Basics
import numpy as np
import pandas as pd
import os
import sys
import json 
import argparse
import math
import pickle
import subprocess

### Classifiers
from sklearn.tree import DecisionTreeClassifier


### Evaluation
from sklearn.model_selection import cross_val_predict
from sklearn.model_selection import cross_validate
from sklearn.metrics import classification_report
from sklearn.metrics import balanced_accuracy_score, accuracy_score
from sklearn.calibration import CalibratedClassifierCV

### Utils
from sklearn.tree import export_graphviz
from utils.IOTools import *
from sklearn.base import clone
from sklearn.metrics import confusion_matrix
from sklearn.preprocessing import normalize
from sklearn.utils import class_weight
from sklearn.decomposition import PCA
from sklearn.model_selection import ShuffleSplit
from sklearn.preprocessing import StandardScaler

        

def saveModel(model_file,  clf , model_features,classnames):
    stream_out = open(model_file, "wb")
    pickle.dump([ clf, model_features, classnames ], stream_out)
    stream_out.close();
    with open("{}.features".format(model_file), 'w') as f:
        for mf in model_features:
            f.write(str(mf)+"\n")
    return

def feature_importance(file_input, file_output, cross_v = 10):
    samples, groups, dimensions, values = read_kmer_matrix(file_input)
    classnames, Y = np.unique(groups, return_inverse=True)
    groupcount = np.bincount(Y)
    print("Original data have {} dimensions with {} samples, divided in {} groups:".format(values.shape[1],  values.shape[0],len(classnames)))
    for c in range(0, len(classnames)) :
        print("\t{} - {} \t {} samples".format(c, classnames[c] ,groupcount[c])) 
    
    out_file = { "info" : 
                { "groups_names" : classnames.tolist(), 
                 "sample_groups" : Y.tolist(),
                 "method" : "DecisionTree",
                 "sample_names" : samples.tolist(),
                 "groupcount" : groupcount.tolist(),
                 "total_features" : len(dimensions),
                 } , "samples_probabilities" : [] }
    sample_probabilities=[]
    seed = round(np.random.rand()*nmodels*1000)
    print("Seed : {}".format(seed))
    
    tree=DecisionTreeClassifier(max_features=None,  min_samples_split=0.05)
    acc = np.mean(cross_validate(tree, values, Y, scoring="balanced_accuracy", cv=ShuffleSplit(n_splits=cross_v, test_size=0.30), n_jobs=cpus,  return_train_score=False)["test_score"] )
    tree.fit(values, Y)
    tree_file= "{}.dot".format(file_output)
    export_graphviz(tree,
                    out_file=tree_file,
                    feature_names = np.array(dimensions)[mask][support],
                    class_names = classnames,
                    rounded = True, proportion = False, 
                    precision = 2, filled = True )
    gviz = json.loads(subprocess.check_output(["dot", "-Txdot_json", tree_file]))
    gviz["accuracy"]=acc
    output_tree_png="{}.png".format(file_output)
    tsne= TSNE(n_components=3, init='pca', random_state=123, perplexity=5, early_exaggeration=12, learning_rate=200, n_iter=1000, n_iter_without_progress=300);
    pca = PCA(n_components=3)
    
    subprocess.call(["dot", "-Tpng", tree_file , "-o{}".format(output_tree_png)])
    sample_probabilities=cross_val_predict(clf.best_estimator_,values, Y,cv=cross_v, method="predict_proba")
    out_file["tsne"] =clone(tsne).fit_transform(StandardScaler().fit_transform(values)).tolist()
    out_file["pca"]=clone(pca).fit_transform(StandardScaler().fit_transform(values[:,mask][:,support])).tolist() 
    saveModel( "{}.pickle".format(file_output), tree, np.array(dimensions).tolist(), classnames )
    with open(file_output+"_predictions.tsv","w") as f:    
        f.write("sample\tgroup\tprediction\tprobabilites\n")
        preds = np.argmax(sample_probabilities, axis=1)
        for i in range(0, len(samples)):
            out_file["samples_probabilities"].append(sample_probabilities[i,:].tolist())
            f.write("{}\t{}\t{}\t{}\n".format(samples[i], groups[i], classnames[preds[i]], sample_probabilities[i,:].tolist() ))
        f.close()
    with open(file_output+".json", 'w') as f:
        json.dump(out_file, f, indent=1)
        
    return;
    
    
def main():
    parser = argparse.ArgumentParser(description="Build a Decision Tree with the given features/samples.");
    parser.add_argument("input", help="Input file, containing the k-mer or feature matrix. First line have to contain the samples names, the second line the corresponding groups, or NA if unknown. The first column has to be the feaures names. The matrix is then organized with features on the rows and samples on the columns.")
    parser.add_argument("output", help="Output file in json format")
    parser.add_argument("-c", "--cross-validation", default=10, type=int, help="Cross validation used to determine the metrics of the models. Default: 10 ")
    args = parser.parse_args();
    if args.threads == -1 and os.environ.__contains__("OMP_NUM_THREADS"):
         args.threads=int(os.environ["OMP_NUM_THREADS"])
    if args.threads == -1 and os.environ.__contains__("SLURM_NTASKS"):
         args.threads=int(os.environ["SLURM_NTASKS"])
    decision_tree(args.input, args.output, args.cross_validation);
    return 



if __name__ == "__main__":
    main();
