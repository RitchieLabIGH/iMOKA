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
from sklearn.ensemble import RandomForestClassifier, AdaBoostClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.gaussian_process.kernels import RBF
from sklearn.linear_model import LassoCV
from sklearn.ensemble import ExtraTreesClassifier

### Evaluation
from sklearn.feature_selection import SelectFromModel
from sklearn.model_selection import cross_val_predict
from sklearn.metrics import classification_report
from sklearn.metrics import balanced_accuracy_score, accuracy_score
from sklearn.model_selection import GridSearchCV
from sklearn.calibration import CalibratedClassifierCV
from sklearn.manifold import TSNE
from sklearn.model_selection import cross_val_predict
from sklearn.model_selection import cross_validate
### Utils
from sklearn.tree import export_graphviz
from utils.IOTools import *
from sklearn.base import clone
from time import process_time 
from sklearn.metrics import confusion_matrix
from sklearn.preprocessing import normalize
from sklearn.utils import class_weight
from sklearn.decomposition import PCA
from sklearn.model_selection import ShuffleSplit

def number_of_features(file_input, file_output, n_trees=-1, nmodels=10, cross_v = 10 , max_features = 10, cpus=-1, perc_test=0.15):
    if cross_v < 5:
        cross_v=5
    samples, groups, dimensions, values = read_kmer_matrix(file_input)
    classnames, Y = np.unique(groups, return_inverse=True)
    mask = reduce_na(values, Y, perc_test)
    
    n_dim=sum(mask) 
    groupcount = np.bincount(Y)
    
    print("Starting the creation of {} Random Forest with {} trees each.".format(nmodels, n_trees))
    print("Original data have {} dimensions (reduced to {} due to NaN) with {} samples, divided in {} groups:".format(values.shape[1], n_dim, values.shape[0],len(classnames)))
    for c in range(0, len(classnames)) :
        print("\t{} - {} \t {} samples".format(c, classnames[c] ,groupcount[c]))
    
    f= open(file_output, "w")
    file_i= open(file_output+".importances", "w")
    f.write("round\tn_features\taccuracy\ttrain_accuracy\n")
    file_i.write("round\tfeature_name\tfeature_importance\n")
    print("round\tn_features\taccuracy\ttrain_accuracy")
    
    
    for i in range(0, nmodels):
        seed= round(np.random.rand()*100000)
        clf=DecisionTreeClassifier(random_state=seed, min_samples_split=0.2);
        clf.fit( values[:,mask], Y)
        fi=clf.feature_importances_.copy()
        n_of_trees=1
        while sum(fi!=0) < max_features:
            n_of_trees=n_of_trees+1
            seed= round(np.random.rand()*100000)
            clf=DecisionTreeClassifier(random_state=seed, class_weight="balanced");
            clf.fit( values[:,mask], Y)
            fi=fi+clf.feature_importances_.copy()
        fi=fi/n_of_trees
        support = np.zeros(fi.shape ,dtype=bool)
        while sum(support) < max_features and sum(fi) != 0:
            seed = round(np.random.rand()*10000)
            best=np.argmax(fi)
            toprint="{}\t{}\t{}".format(i, np.array(dimensions)[mask][best], fi[best])
            file_i.write(toprint+"\n")
            support[best]=True
            if sum(support) >= 2:
                clf= RandomForestClassifier(n_estimators=n_trees, random_state=seed, max_features="auto" ,class_weight= "balanced_subsample", min_samples_split=0.2);
                scores=cross_validate(clf, values[:,mask][:,support], Y, scoring="balanced_accuracy", cv=BalancedShuffleSplit(n_splits=cross_v, test_size=perc_test), n_jobs=cpus,  return_train_score=True)
                acc = np.mean( scores["test_score"] )
                acc_train = np.mean( scores["train_score"] )
                toprint="{}\t{}\t{}\t{}".format(i, sum(support), acc, acc_train )
                f.write(toprint+"\n")
                print(toprint);
            fi[best]=0
    f.close()
    return;

    
    
def main():
    parser = argparse.ArgumentParser(description="Find the most important fatures using random forest classifiers.");
    parser.add_argument("input", help="Input file, containing the k-mer or feature matrix. First line have to contain the samples names, the second line the corresponding groups, or NA if unknown. The first column has to be the feaures names. The matrix is then organized with features on the rows and samples on the columns.")
    parser.add_argument("output", help="Output file in tsv format")
    parser.add_argument("-n", "--n-trees", default=100, type=int, help="The number of trees to use for each round. Default: 100")
    parser.add_argument("-r", "--rounds", default=10, type=int, help="The number of random forests to create. Default:10")
    parser.add_argument("-t", "--threads", default=-1, type=int, help="The number of threads to use. Default: -1 (automatic)")
    parser.add_argument("-m", "--max-features", default=20, type=int, help="The maximum number of features to use. Default: 20")
    parser.add_argument("-c", "--cross-validation", default=10, type=int, help="Cross validation used to determine the metrics of the models. Default: 10 ")
    parser.add_argument("-p", "--proportion-test", default=0.25, type=float, help="Proportion of test set")
    args = parser.parse_args();
    if args.threads == -1 and os.environ.__contains__("OMP_NUM_THREADS"):
         args.threads=int(os.environ["OMP_NUM_THREADS"])
    if args.threads == -1 and os.environ.__contains__("SLURM_NTASKS"):
         args.threads=int(os.environ["SLURM_NTASKS"])
    number_of_features(args.input, args.output, args.n_trees,  args.rounds , args.cross_validation, args.max_features,args.threads, args.proportion_test);
    return 



if __name__ == "__main__":
    main();
