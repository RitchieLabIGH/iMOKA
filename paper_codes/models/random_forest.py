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
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import ExtraTreesClassifier

### Evaluation
from sklearn.model_selection import cross_val_predict
from sklearn.model_selection import cross_validate
from sklearn.metrics import classification_report
from sklearn.metrics import balanced_accuracy_score, accuracy_score
from sklearn.model_selection import GridSearchCV
from sklearn.manifold import TSNE

### Utils
from sklearn.tree import export_graphviz
from sklearn.base import clone
from sklearn.metrics import confusion_matrix
from sklearn.utils import class_weight
from sklearn.decomposition import PCA
from sklearn.model_selection import ShuffleSplit
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import SelectFromModel



def read_kmer_matrix(file_name):
    '''
    Import a feature matrix in text format tsv, organised as follow: 
        sample1    sample2    sample3
    groups    g1    g2    g3
    feat1    v11    v12    v13
    feat2    v21    v22    v23
    ...
    featN    vN1    vN2    vN3
    
    :param file_name: the location of the matrix file
    '''
    header = np.array(pd.read_csv(file_name, decimal=".", sep='\t', nrows=2, header=None))
    samples= header[0, 1:]
    groups= header[1, 1:]
    table = pd.read_csv(file_name, decimal=".", sep='\t', skiprows=2, header=None)
    dimensions = np.array(table[[0]]).T[0].tolist()
    values=np.nan_to_num(np.array(table.loc[:,1:] , dtype="float64"), copy=False)
    return samples, groups, dimensions, values.T;




def run(training, test, file_output, n_trees=100, nmodels=1, max_features = 20, cpus=-1 ):
    base_clf=RandomForestClassifier(n_estimators= n_trees , class_weight="balanced", oob_score=True );
    samples, groups, dimensions, values = read_kmer_matrix(training)
    test_samples, test_groups, test_dimensions, test_values = read_kmer_matrix(test)
    support=[]
    for d in dimensions: 
        try:
            support.append(test_dimensions.index(d))
        except:
            print("ERROR! Feature {} is not in the input matrix.".format(d))
            exit(1)
    test_values = test_values[:,support]
    classnames, Y = np.unique(groups, return_inverse=True)
    Y_test=np.zeros(test_groups.shape, dtype=int)
    for i in range(0, len(classnames)):
        Y_test[test_groups == classnames[i]]=i
    n_dim=values.shape[1]
    groupcount = np.bincount(Y)
    print("Starting the creation of {} models.".format(nmodels))
    print("Original data have {} dimensions with {} samples, divided in {} groups:".format(n_dim, values.shape[0],len(classnames)))
    for c in range(0, len(classnames)) :
        print("\t{} - {} \t {} samples".format(c, classnames[c] ,groupcount[c])) 
    ofs=open(file_output, "w")
    for i in range(0, nmodels):
        print("\n\nRound {}".format(i), flush=True)
        fsel = SelectFromModel(DecisionTreeClassifier(), max_features=max_features, threshold=-np.inf)
        fsel.fit( values, Y)
        for j in range(2, max_features+1):
            fsel.max_features=j
            clf=clone(base_clf)
            clf.fit(fsel.transform(values), Y)
            acc=balanced_accuracy_score(Y_test, clf.predict(fsel.transform(test_values)))
            toprint="{}\t{}\t{}\t{}".format(i, j, acc, clf.oob_score_ )
            ofs.write(toprint+"\n")
            print(toprint, flush=True)
    return;
    
    
def main():
    parser = argparse.ArgumentParser(description="Assert the accuracy of an external test set.");
    parser.add_argument("train", help="Training")
    parser.add_argument("test", help="Test")
    parser.add_argument("output", help="Output file")
    parser.add_argument("-r", "--rounds", default=1, type=int, help="The number of random forests to create. Default:1")
    parser.add_argument("-t", "--threads", default=-1, type=int, help="The number of threads to use. Default: -1 (automatic)")
    parser.add_argument("-m", "--max-features", default=20, type=int, help="The maximum number of features to use. Default: 20 ")
    parser.add_argument("-n", "--n-trees", default=100, type=int, help="The number of trees used to evaluate the feature importance. Default: 100 ")
    args = parser.parse_args();
    if args.threads == -1 and os.environ.__contains__("OMP_NUM_THREADS"):
         args.threads=int(os.environ["OMP_NUM_THREADS"])
    if args.threads == -1 and os.environ.__contains__("SLURM_NTASKS"):
         args.threads=int(os.environ["SLURM_NTASKS"])
    run(args.train,args.test, args.output,args.n_trees,  args.rounds , args.max_features, args.threads);
    return 



if __name__ == "__main__":
    main();
