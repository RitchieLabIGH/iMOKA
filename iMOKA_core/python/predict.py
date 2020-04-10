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

### Evaluation
from sklearn.feature_selection import SelectFromModel
from sklearn.model_selection import cross_val_predict
from sklearn.model_selection import cross_validate
from sklearn.metrics import classification_report
from sklearn.metrics import balanced_accuracy_score, accuracy_score
from sklearn.model_selection import GridSearchCV
from sklearn.calibration import CalibratedClassifierCV
from sklearn.manifold import TSNE
### Utils
from sklearn.tree import export_graphviz
from utils.IOTools import *
from sklearn.base import clone
from time import process_time 
from sklearn.metrics import confusion_matrix
from sklearn.preprocessing import normalize
from sklearn.utils import class_weight
from sklearn.decomposition import PCA




def predict(file_input, file_output, file_model):
    samples, groups, dimensions, values = read_kmer_matrix(file_input)
    file_classnames, Y = np.unique(groups, return_inverse=True)
    ifs = open(file_model, "rb")
    clf, features, classnames = pickle.load(ifs)
    ifs.close()
    support=[]
    for d in features: 
        try:
            support.append(dimensions.index(d))
        except:
            print("ERROR! Feature {} is not in the input matrix.")
            exit(1)
    acc = 0
    
    probs = clf.predict_proba(values[:,support])
    pred_class=np.argmax(probs, axis=1)
    if len(set(classnames).intersection(set(file_classnames))) > 0:
        acc=balanced_accuracy_score(Y, pred_class)
    
    out_file = {"probabilities" : probs.tolist(), 
                "samples" : samples.tolist(), 
                "features" :  features ,
                "classnames" : classnames.tolist(),
                "predicted_class" : pred_class.tolist() ,
                "features" : features,
                "balanced_accuracy" : acc }
    
    header="Name\tInputGroup\tPredictedGroup"
    for cl in range(0, len(classnames)):
        header+="\t"+ classnames[cl]+"_prob"
    print(header)
    for sample in range(0, samples.shape[0]):
        line="{:s}\t{}\t{}".format(samples[sample], groups[sample], classnames[pred_class[sample]] )
        for cl in range(0, probs.shape[1]):
            line+="\t{:.2f}".format(probs[sample, cl])
        print(line)
    if acc != 0:
        print("Accuracy: {}".format(acc))    
    
    with open(file_output, 'w') as f:
        json.dump(out_file, f, indent=1)
    
    return;
    
    
def main():
    parser = argparse.ArgumentParser(description="Predict the class of samples using k-mer features.");
    parser.add_argument("input", help="Input file, containing the k-mer or feature matrix. First line have to contain the samples names, the second line the corresponding groups, or NA if unknown. The first column has to be the feaures names. The matrix is then organized with features on the rows and samples on the columns.")
    parser.add_argument("model", help="The model obtained from feature_reduction.py")
    parser.add_argument("output", help="Output file in json format")
    parser.add_argument("-t", "--threads", default=-1, type=int, help="The number of threads to use. Default: -1 (automatic)")
    args = parser.parse_args();
    if args.threads == -1 and os.environ.__contains__("OMP_NUM_THREADS"):
         args.threads=int(os.environ["OMP_NUM_THREADS"])
    if args.threads == -1 and os.environ.__contains__("SLURM_NTASKS"):
         args.threads=int(os.environ["SLURM_NTASKS"])
    predict(args.input, args.output, args.model);
    return 



if __name__ == "__main__":
    main();
