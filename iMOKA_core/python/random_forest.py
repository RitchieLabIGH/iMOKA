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

from sklearn.ensemble import BaggingClassifier

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
from sklearn.model_selection import ShuffleSplit
from sklearn.preprocessing import StandardScaler

def plot(data, groups):
    classnames, Y = np.unique(groups, return_inverse=True)
    plt.figure(figsize=(10,10))
    colors= ["r" , "g", "b" , "c", "m"]
    for c in range(0, len(classnames)) :
        plt.scatter(data[Y==c,0], data[Y==c, 1], c=colors[c], label=classnames[c])
    plt.legend()
    plt.show()
        

def saveModel(model_file,  clf , model_features,classnames):
    stream_out = open(model_file, "wb")
    pickle.dump([ clf, model_features, classnames ], stream_out)
    stream_out.close();
    with open("{}.features".format(model_file), 'w') as f:
        for mf in model_features:
            f.write(str(mf)+"\n")
    return

def feature_importance(file_input, file_output, n_trees=1000, nmodels=1, cross_v = 10 , max_features = 10, cpus=-1 , perc_test=0.15):
    if cross_v < 5:
        cross_v=5
    samples, groups, dimensions, values = read_kmer_matrix(file_input)
    classnames, Y = np.unique(groups, return_inverse=True)
    groupcount = np.bincount(Y)
    print("Starting the creation of {} models.".format(nmodels))
    print("Original data have {} dimensions with {} samples, divided in {} groups:".format(values.shape[1], values.shape[0],len(classnames)))
    for c in range(0, len(classnames)) :
        print("\t{} - {} \t {} samples".format(c, classnames[c] ,groupcount[c])) 
    
    out_file = { "info" : 
                { "groups_names" : classnames.tolist(), 
                 "sample_groups" : Y.tolist(),
                 "method" : "RandomForest",
                 "sample_names" : samples.tolist(),
                 "nmodels" : nmodels,
                 "groupcount" : groupcount.tolist(),
                 "total_features" : len(dimensions),
                 } ,"features_importances" : {} , "samples_probabilities" : [] }
    importances=[]
    sample_probabilities=[]
    metrics=[]
    feat_freq={}
    if not os.path.isdir(file_output+"_models/"):
        os.mkdir(file_output+"_models/")
    
    models={"RF" : {
                "clf" : RandomForestClassifier(max_features="auto",class_weight= "balanced_subsample"),
                "parameters" : {"n_estimators" : [10, 100, 500],  "min_samples_split" : [0.05, 0.10, 0.15]}
            } }
    tsne= TSNE(n_components=2, init='pca', random_state=123, perplexity=5, early_exaggeration=12, learning_rate=200, n_iter=1000, n_iter_without_progress=300);
    pca = PCA(n_components=2)
    
    
    for i in range(0, nmodels):
        print("\n\nRound {}".format(i))
        clf=RandomForestClassifier(n_estimators= max_features,  class_weight="balanced_subsample", max_features=None);
        clf.fit( values, Y)
        fi=clf.feature_importances_.copy()
        n_of_trees=1
        while sum(fi!=0) < max_features:
            n_of_trees=n_of_trees+1
            seed= round(np.random.rand()*100000)
            clf=RandomForestClassifier(n_estimators= max_features,  class_weight="balanced_subsample", max_features=None);
            clf.fit( values, Y)
            fi=fi+clf.feature_importances_.copy()
            if n_of_trees > max_features :
                fi=fi+0.01 
        fi=fi/n_of_trees
        support = np.zeros(fi.shape ,dtype=bool)
        while sum(support) < max_features and sum(fi) > 0:
            best=np.argmax(fi)
            support[best]=True
            fi[best]=0
        ### Producing an example of tree built with the best features
        tree= DecisionTreeClassifier(random_state=seed, class_weight="balanced", min_samples_split=0.05);
        acc = np.mean(cross_validate(tree, values[:,support], Y, scoring="balanced_accuracy", cv=ShuffleSplit(n_splits=cross_v, test_size=perc_test), n_jobs=cpus,  return_train_score=False)["test_score"] )
        tree.fit(values[:,support], Y)
        tree_file= "{}_models/{}_tree_acc_{}.dot".format(file_output, i, acc)
        export_graphviz(tree,
                    out_file=tree_file,
                    feature_names = np.array(dimensions)[support],
                    class_names = classnames,
                    rounded = True, proportion = False, 
                    precision = 2, filled = True )
        
        gviz = json.loads(subprocess.check_output(["dot", "-Txdot_json", tree_file]))
        gviz["accuracy"]=acc
        output_tree_png="{}_models/{}_tree_acc_{}.png".format(file_output, i, acc)
        subprocess.call(["dot", "-Tpng", tree_file , "-o{}".format(output_tree_png)])
        for s in np.array(dimensions)[support]:
            feat_freq[s]= feat_freq[s]+1 if feat_freq.__contains__(s) else 1;
        models_acc=[];
        best_acc=0
        best_acc_idx=0
        ### producing the features importances with a RF 
        clf = RandomForestClassifier(max_features="auto", class_weight= "balanced_subsample",min_samples_split=0.05, n_estimators=n_trees )
        clf.fit(values, Y)
        global_fi=clf.feature_importances_.copy()
        ### 
        for m in models:
            print("Training {} ".format(m))
            clf=GridSearchCV(models[m]["clf"], models[m]["parameters"], cv=ShuffleSplit(n_splits=cross_v, test_size=perc_test), n_jobs=cpus, scoring="balanced_accuracy");
            clf.fit(values[:,support], Y);
            print("Grid search found the following values:")
            print(clf.best_params_)
            accuracies = []
            uaccuracies = []
            tmp_y_proba = cross_val_predict(clf.best_estimator_,values[:,support], Y,cv=cross_v, n_jobs=cpus, method="predict_proba")
            tmp_y_pred = np.argmax(tmp_y_proba, axis=1)
            tmp_acc =  cross_validate(clf.best_estimator_, values[:,support], Y, scoring="balanced_accuracy", cv=ShuffleSplit(n_splits=cross_v, test_size=perc_test), n_jobs=cpus,  return_train_score=True)
            acc = np.mean( tmp_acc["test_score"])
            acc_train = np.mean(tmp_acc["train_score"] )
            models_acc.append({
                "acc" : acc, 
                "all_acc" : tmp_acc["test_score"].tolist(),
                "acc_train" : acc_train,
                "name": m, 
                "confusion_matrix" : confusion_matrix(Y, tmp_y_pred).tolist(),
                "metrics" : classification_report(Y, tmp_y_pred ,output_dict=True),
                "best_parameters" : clf.best_params_
                });
            if len(classnames) == 2:
                models_acc[len(models_acc)-1]["roc"]=np.mean( cross_validate(clf.best_estimator_, values[:,support], Y, scoring="roc_auc", cv=ShuffleSplit(n_splits=cross_v, test_size=perc_test), n_jobs=cpus, return_train_score=False)["test_score"])
                print("Model {} processed. Accuracy: {:.2f} ( {:.2f} roc auc ) ".format(m, models_acc[len(models_acc)-1]["acc"],models_acc[len(models_acc)-1]["roc"] ))
            else :
                print("Model {} processed. Accuracy: {:.2f} ".format(m, models_acc[len(models_acc)-1]["acc"]))
            
            print(confusion_matrix(Y, tmp_y_pred))
            if models_acc[len(models_acc)-1]["acc"] > best_acc :
                best_acc=models_acc[len(models_acc)-1]["acc"]
                best_acc_idx=len(models_acc)-1
                y_proba=tmp_y_proba
                best_clf=clone(clf.best_estimator_)
                best_clf_type=m;
        if (len(sample_probabilities) == 0 ):
            sample_probabilities=y_proba 
        else:
            sample_probabilities+=y_proba
        importances.append((global_fi*100) / np.max(global_fi) )
        metrics.append({ 
            "models" : models_acc, 
            "best_model" : best_acc_idx,
            "features" : np.array(dimensions)[support].tolist(),
            "probabilities" : y_proba.tolist(),
            "graph" : gviz,
            "tsne" : clone(tsne).fit_transform(StandardScaler().fit_transform(values[:,support])).tolist(),
            "pca" : clone(pca).fit_transform(StandardScaler().fit_transform(values[:,support])).tolist(),
            "seed" : seed
        })
        if best_clf_type != "RF": ## RF is already a Bagging method
            best_clf= BaggingClassifier(best_clf, n_estimators=5, n_jobs=cpus)
        best_clf.fit(values[:,support], Y)
        saveModel( "{}_models/{}_{}.pickle".format(file_output, i, best_clf_type), best_clf, np.array(dimensions)[support].tolist(), classnames )
    importances= np.array(importances).T
    means = np.mean(importances, axis=1);
    if nmodels > 1 :
        stds= np.std(importances, axis=1, ddof=1)/ math.sqrt(nmodels);
    else :
        stds = np.zeros(means.shape)
    sample_probabilities/=nmodels
    tmp=means.argsort()
    ranks = np.empty_like(tmp)
    ranks[tmp] = np.arange(len(tmp))
    out_file["best_feature_models"]=metrics;
    imp=0
    with open(file_output+"_fi.tsv", "w") as f:
        f.write("name\timportance\n")
        for i in range(0, len(dimensions)):
            out_file["features_importances"][dimensions[i]]={ "values" :  importances[imp].tolist() , "mean" : means[imp].tolist(), "std" : stds[imp].tolist(), "rank" : len(ranks)-int(ranks[imp])} ;
            f.write("{}\t{}\n".format(dimensions[i], means[imp] ))
            imp=imp+1
                
    with open(file_output+"_predictions.tsv","w") as f:    
        f.write("sample\tgroup\tprediction\tprobabilites\n")
        preds = np.argmax(sample_probabilities, axis=1)
        for i in range(0, len(samples)):
            out_file["samples_probabilities"].append(sample_probabilities[i,:].tolist())
            f.write("{}\t{}\t{}\t{}\n".format(samples[i], groups[i], classnames[preds[i]], sample_probabilities[i,:].tolist() ))
        f.close()
    out_file["info"]["features_frequency"]=feat_freq;
    with open(file_output+".json", 'w') as f:
        json.dump(out_file, f, indent=1)
        
    return;
    
    
def main():
    parser = argparse.ArgumentParser(description="Find the most important fatures using random forest classifiers.");
    parser.add_argument("input", help="Input file, containing the k-mer or feature matrix. First line have to contain the samples names, the second line the corresponding groups, or NA if unknown. The first column has to be the feaures names. The matrix is then organized with features on the rows and samples on the columns.")
    parser.add_argument("output", help="Output file in json format")
    parser.add_argument("-r", "--rounds", default=1, type=int, help="The number of random forests to create. Default:1")
    parser.add_argument("-t", "--threads", default=-1, type=int, help="The number of threads to use. Default: -1 (automatic)")
    parser.add_argument("-m", "--max-features", default=10, type=int, help="The maximum number of features to use. Default: 10 ")
    parser.add_argument("-n", "--n-trees", default=1000, type=int, help="The number of trees used to evaluate the feature importance. Default: 1000 ")
    parser.add_argument("-c", "--cross-validation", default=10, type=int, help="Cross validation used to determine the metrics of the models. Default: 10 ")
    parser.add_argument("-p", "--proportion-test", default=0.25, type=float, help="Proportion of test set")
    args = parser.parse_args();
    if args.threads == -1 and os.environ.__contains__("OMP_NUM_THREADS"):
         args.threads=int(os.environ["OMP_NUM_THREADS"])
    if args.threads == -1 and os.environ.__contains__("SLURM_NTASKS"):
         args.threads=int(os.environ["SLURM_NTASKS"])
    feature_importance(args.input, args.output,args.n_trees,  args.rounds , args.cross_validation, args.max_features,args.threads, args.proportion_test);
    return 



if __name__ == "__main__":
    main();
