#!/usr/bin/env python3
#requiere simpSOM Version 1.3.4
#The package is now available on PyPI, to retrieve it just type pip install SimpSOM or download it from here and install with python setup.py install.

# Import the library
import numpy as np
import json 
# import SimpSOM as sps
import utils.extendedSOM as sps
import argparse
import os
import matplotlib as mpl
if os.environ.get('DISPLAY','') == '':
    print('no display found. Using non-interactive Agg backend')
    mpl.use('Agg')
else:
    try:
        import tkinter
    except ImportError:
        mpl.use('Agg')

import matplotlib.pyplot as plt
from sklearn.preprocessing import normalize

from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import  AdaBoostClassifier #RandomForestClassifier,
from sklearn.metrics import accuracy_score
from sklearn.utils import class_weight
from sklearn import  svm, pipeline
from sklearn import linear_model
from sklearn.neighbors import KNeighborsClassifier
from sklearn.kernel_approximation import (RBFSampler,
                                          Nystroem)
from sklearn.multiclass import OneVsRestClassifier
from sklearn.metrics import precision_recall_curve
from sklearn.metrics import average_precision_score
from sklearn import model_selection
from sklearn.ensemble import ExtraTreesClassifier
from pathlib import Path

import pickle

parser = argparse.ArgumentParser(description="Compute Self organizing map from count (of kmers , sequences or genes)");
parser.add_argument("input",
                    help="Input file, containing the k-mer or feature matrix. First line have to contain the samples names, the second line the corresponding groups, or NA if unknown. The first column has to be the feaures names. The matrix is then organized with features on the rows and samples on the columns.")
parser.add_argument("outputPath", help="Output path")

parser.add_argument("-d", "--dataset-name", default="results",
                    help="Datasetname for result suffix. Default: results")
parser.add_argument("-m", "--norm", default=True, type=bool,
                    help="normalize data before training (boolean). Default: True ")

parser.add_argument("-i", "--iteration", default=1000, type=int,
                    help="Number of iteration for SOM training. Default: 1000 ")
parser.add_argument("-lr", "--start-learn-rate", default=0.1, type=float,
                    help="start learningrate for SOM training. Default: 0.1 ")
parser.add_argument("-ct", "--classfier-type", default="linSVC",  help="SOM validation by classification; algorithme type .Available : MLP,ADA,SDG,linSVC,KNEIG,SVMfourier,SVMnystro . Default:linSVC")
parser.add_argument("-n", "--nnsize", default="2,3,4,5,6,7,8,9,10,15,20",
                    help="SOM network size by axe(exemple -n 2 the SOM will have 4 nodes). Multiple value possible have to be separate by comma. Default: 2,3,4,5,6,7,8,9,10,15,20")

parser.add_argument("-cs", "--cluster-sample-size", default="2,3,4,5,6,7",
                    help="number of cluster to cluster sample from SOM. Multiple value possible have to be separate by comma. Default: 2,3,4,5,6,7 ")
parser.add_argument("-l", "--load-prev", default=False, type=bool,
                    help="Load from previous SOM training (boolean). Default: False ")
parser.add_argument("-w", "--htmlpage", default=False, type=bool,
                    help="generate HTMLpage and all SOM in image (boolean). Default: False ")

args = parser.parse_args()
file_path=args.input
outputPath=Path(args.outputPath).absolute()
datasetname=args.dataset_name
norm = args.norm
it = args.iteration
lr = args.start_learn_rate
classfierType = args.classfier_type
nnsize=list(map(int, args.nnsize.split(',')))
clustersize=list(map(int,args.cluster_sample_size.split(',')))
load = args.load_prev
webpage =args.htmlpage

normbybmu = False
"""

load = True
nnsizex = 5
nnsizey = 5
lr = 0.1
it = 200
classfierType="linSVC"

nnsizex=10
nnsizey=10
lr=0.1
it=10000


norm = True

datasetname="TCGA_big"
#datasetname="TCGA"
datasetname="claudioTCGA"
#datasetname="CLL"
datasetname="unmapTCGA"
if datasetname=="TCGA":
    file_path = "/home/sylvain/Documents/SOMProject/dataMat/TCGA_subsample1stvot_200kmer.csv"
if datasetname=="TCGA_big":
    #file_path = "/home/sylvain/genosaveritchie/replicat_kmer_TCGA/mergedlistkmer_tr0.2winner0_nbkm5000.csv_SampleMat.csv"
    file_path = "/home/sylvain/Documents/SOMProject/dataMat/mergedlistkmer_tr0.2winner0_nbkm5000.csv_SampleMat.csv"
if datasetname=="microRNA" or datasetname=="microRNA_bmunorm":
    file_path = "/home/sylvain/Documents/SOMProject/dataMat/microrna100kmSampleMat.csv"
    #file_path="/home/sylvain/genologinritchie/microRNA/redoMicroRNA/mergedlistkmerwinner0_nbkm100.csv_SampleMat.csv"

if datasetname == "claudioTCGA":
    file_path = "/home/sylvain/Documents/SOMProject/dataMat/beauty_basalresponce_claudio.matrix"
if datasetname == "CLL":
    file_path="/home/sylvain/Documents/SOMProject/dataMat/CLL/mergedlistkmerwinner0_nbkm1000.csv_SampleMat.csv"
if datasetname == "unmapTCGA":
    file_path = "/home/sylvain/genologinritchie/kmersom/dataMat/unmappedTCGA_iMOKA.matrix"
    
    """
def initClassifier( classiType, hideNeurons=10):
    
    if classiType == 'MLP':
        tclf = MLPClassifier(solver='lbfgs', alpha=1e-5, hidden_layer_sizes=hideNeurons, random_state=1,
                            learning_rate='adaptive', activation='logistic')
    else:
        if classiType == 'ADA':
            tclf = AdaBoostClassifier()
        if classiType == 'SDG':
            tclf = linear_model.SGDClassifier(class_weight='balanced')
        if classiType == 'SVC':
            tclf = svm.SVC(gamma=.4, class_weight='balanced')
        if classiType == 'linSVC':
            tclf = svm.LinearSVC(class_weight='balanced',max_iter=20000)
        if classiType == 'KNEIG':
            tclf = KNeighborsClassifier(n_neighbors=5, algorithm='auto')

        # create pipeline from kernel approximation
        # and linear svm
        if classiType == 'SVMfourier':
            feature_map_fourier = RBFSampler(gamma=.2, n_components=hideNeurons)  # , random_state=1

            tclf = pipeline.Pipeline([("feature_map", feature_map_fourier),
                                     ("svm", svm.LinearSVC(class_weight='balanced'))])
        if classiType == 'SVMnystro':
            feature_map_nystroem = Nystroem(gamma=.2, n_components=hideNeurons)  # , random_state=1
            tclf = pipeline.Pipeline([("feature_map", feature_map_nystroem),
                                     ("svm", svm.LinearSVC(class_weight='balanced'))])
    return tclf
def saveKmerByNode(net,labels,savepath):
    net.bmuList
    #np.savetxt(savepath)

def somOnProject(proj,it,lr,nnsizex=7,nnsizey=1,classori=[]):
    # SOM from projected matrix
    net = sps.extendedSOM(nnsizex, nnsizey, proj, PBC=True)
    # Train the network for 10000 epochs and with initial learning rate of 0.01.
    net.train(lr, it)
    net.setBMUtable(proj)
    uniqubmu, countbmu = np.unique(net.bmuList, return_counts=True)
    print(
        "classifier of proj number of bmunode ={} on {} total node. Maximum kmer by node= {}".format(uniqubmu.shape[0], nnsizex * nnsizey,
                                                                                  np.max(countbmu)))
    fig = plt.figure()
    ax = plt.bar(range(uniqubmu.shape[0]), (np.flip(np.sort(countbmu))))
    plt.xlim((0, nnsizex * nnsizey))
    plt.savefig("./x_sampleclust_nbByNode_{}x{}.png".format(nnsizex,nnsizey))
    #print(net.bmuList)
    #print(classori)
    plt.close()
    return net.bmuList



##################################################################    
######                 mainscript                #################
################################################################## 
Y = np.genfromtxt(file_path, delimiter="\t")
labels = np.genfromtxt(file_path, delimiter="\t", dtype='unicode')

classori = labels[1, 1:].T
labelsamples = labels[0, 1:].T
labels = labels[2:, 0]
data = Y[2:, 1:]



print("Number of kmer in the list =", len(labels), flush=True)


if norm == True:
    data=normalize(data, axis=0, copy=False)

#nnsize=nnsize[3]#[2,3,4,5,6,7,8,9,10]#,11,12,13
rescross=np.zeros((len(nnsize),5))
res=[]

# svn ou mpl pour evaluer la classification
print("Number of kmer in the list =", len(labels))
# np.unique(classori)
nbsamplebyclass = []
uniq_classes = np.unique(classori)
for classnamei in uniq_classes:
    ans = np.in1d(classori, classnamei).sum()
    print("Number of sample in class :", classnamei, "\t = ", ans)
    nbsamplebyclass.append(ans)

nrot = int(2 * np.min(nbsamplebyclass) / 3)
print("adaptative nrot = " + str(nrot), flush=True)
srcpath=os.getcwd()
for   inn,tmpsize  in enumerate(nnsize):
    os.chdir(srcpath)
    nnsizex = tmpsize
    nnsizey = tmpsize
    #lr = 0.1
    #it = 10000
    #classfierType="linSVC"

    """nnsizex=10
    nnsizey=10
    lr=0.1
    it=10000
    """

    # 30x30_lr0.1_it50000norm
    #resdir = "{0}x{1}_lr{2}_it{3}".format(nnsizex, nnsizey, lr, it) /home/sylvain/Documents/SOMProject/results
    resdir = "{5}/{4}_{0}x{1}_lr{2}_it{3}".format(nnsizex, nnsizey, lr, it,datasetname,outputPath)
    print(resdir)
    boolstring = ""
    if norm == True:
        boolstring += "norm"
    if normbybmu == True:
        boolstring += "_nbybmu"

    resdir += boolstring

    if os.path.isdir(resdir) == False:
        os.makedirs(resdir)
    os.chdir(resdir)  # os.path.join(






    #labelfake = np.array(range(labels.shape[0]))
    tmpload=load
    if load == True :
        if not os.path.isfile('filename_weights.npy'):
            print("loading file impossible training requiere {}".format(os.path.join(resdir,'filename_weights.npy')))
            tmpload = False

    if tmpload == False:
        # Build a network
        # net = sps.somNet(10, 10, data, PBC=True)
        net = sps.extendedSOM(nnsizex, nnsizey, data, PBC=True)
        # Train the network for 10000 epochs and with initial learning rate of 0.01.
        net.train(lr, it)

        # Save the weights to file
        net.save('filename_weights')
    else:
        # load the weights to file
        net = sps.extendedSOM(nnsizex, nnsizey, data, loadFile='filename_weights', PBC=True)
        # net =extendedSOM(10, 10, data,loadFile='filename_weights', PBC=True)


    # @debug:
    tmpload=False



    if (tmpload == True) & (os.path.isfile('crossvalresult.pkl')):
        res =  pickle.load( open( "crossvalresult.pkl", "rb" ) )
        1

    else:
        #get BMU
        net.setBMUtable(data)
        uniqubmu, countbmu = np.unique(net.bmuList, return_counts=True)
        
        print("number of bmunode ={} on {} total node. Maximum kmer by node= {}".format(uniqubmu.shape[0],nnsizex*nnsizey,np.max(countbmu)))
        print(len(net.bmuList))
        fig=plt.figure()
        ax=plt.bar(range(uniqubmu.shape[0]),(np.flip(np.sort(countbmu))))
        plt.xlim((0,nnsizex*nnsizey))
        plt.savefig("./bmuDistrib.png")
        plt.close()
        # project average samples count for each classes
        classes = np.unique(classori)
        meanbycat = np.zeros((data.shape[0], classes.shape[0]))
        meanbycatSOM = np.zeros((classes.size, nnsizex* nnsizey))
        meanmatrix = np.mean(data, axis=1)

        meanmatrixSOM=net.projectsample(meanmatrix, colnum=0, name="averageall", normbybmu=normbybmu,show=False, printout=False, path='./')
        for i, cat in enumerate(classes):
            meanbycat[:, i] = np.mean(data[:, classori == cat], axis=1)
            meanbycatSOM[i, :] = net.projectsample(meanbycat, colnum=i, name=cat, normbybmu=normbybmu,show=False, printout=False, path='./',meanmatrix=meanmatrix)
        # project each samples from bmu and count
        proj=np.zeros((data.shape[1],nnsizex*nnsizey))

        for j in range(data.shape[1]):
            proj[j,:] = net.projectsample(data, colnum=j, name="{}_Sample_{}".format(classori[j], j),  normbybmu=normbybmu,show=False, printout=webpage, path='./',meanmatrix=meanmatrix)

        #mean from projeted...
        for i, cat in enumerate(classes):
            meanbycatSOM[i, :] = np.mean(proj[ classori == cat,:], axis=0)


        ####################
        # SOM from projected matrix, CLUSTERING
        bmulists = np.zeros((len(clustersize), data.shape[1]))
        i = 0
        for nny in [1]:
            for nnx in clustersize:#,4,5,6,7,8,9,10]:
                tmp = somOnProject(proj, it, lr, nnsizex=nnx, nnsizey=nny, classori=classori)
                bmulists[i, :] = tmp
                #print(i)
                #print(bmulists[i, :])
                i = i+1
        #print(classori)
        #print(bmulists)


        ######################
        # feature (node) importance from project matrix
        # Node importance

        forest = ExtraTreesClassifier(n_estimators=2500, random_state=0, class_weight="balanced", bootstrap=True,
                                      oob_score=True, max_features=np.min([10,(nnsizex*nnsizey)-1]) ) #

        res = forest.fit(proj, classori)
        data_y_predict = forest.predict(proj)
        accu = accuracy_score(data_y_predict, classori, normalize=True)
        print("feature (node) importance from project matrix \n accuracy={}".format(accu))

        print("accuracyoob_score_={}".format(forest.oob_score_))
        #print(res)

        importances = forest.feature_importances_
        std = np.std([tree.feature_importances_ for tree in forest.estimators_],
                     axis=0)
        indices = np.argsort(importances)[::-1]

        # Print the feature ranking
        reslist = np.empty((Y.shape[1], 3), dtype="<U30")
        print("Feature ranking:")
        listgeneidS = ""



        # Plot the feature importances of the forest
        plt.figure()
        plt.title("Feature importances")
        plt.bar(range(importances.shape[0]), importances,
                color="r", align="center")  # , yerr=std[indices]
        # plt.xticks(range(Y.shape[1]), indices)
        # plt.xlim([-1, Y.shape[1]])
        plt.savefig(("x_importance_feature.png"))
        # plt.xlim(0, 20)


        #####################
        ## json v3 for electron
        count_all_bmu = [0] * (nnsizex*nnsizey)
        for b in net.bmuList:
            count_all_bmu[b]+=1
        
        out_file = { "samplesSOM" : [] , "kmerbmu" : net.bmuList, "labels" : labels.tolist() , 
            "meanmatrix" :  meanmatrixSOM.tolist(), "minmatrix" : np.min(proj,axis=0).tolist(), "maxmatrix" : np.max(proj,axis=0).tolist(),
            "nodefeatureimpotance" : importances.tolist(), "nbKmerBynode" : count_all_bmu, "meanbycat" : []
        };
        for i, labbelS in enumerate(labelsamples):
            out_file["samplesSOM"].append({
                "labelsamples" : labbelS, "classori" : classori[i].tolist(), 
                "classnumber" : int(np.where(uniq_classes == classori[i])[0][0]),
                "projSOM" : np.round(proj[i,:], 4).tolist() , "bmu" : bmulists[:, i].tolist()     });
        
        for i, cat in enumerate(classes):
            out_file["meanbycat"].append({"classname" : cat, "classid":i, "meanmatrix" : meanbycatSOM[i, :].tolist()})
        with open("iMOKA_som.json", 'w') as f:
	        json.dump(out_file, f, indent=0)
	    
	    #############
	    ## web page
        if webpage:
            # json v2 for HTML page
            commandclient = "cp  "+ os.path.join(srcpath,"htmlres/visuclusterandsamples.html")+" ."
            #print(commandclient, flush=True)
            os.system(commandclient)
            commandclient = "cp  "+ os.path.join(srcpath,"htmlres/gallery.css")+" ."
            #print(commandclient, flush=True)
            os.system(commandclient)
            with open( "clusterinSOMofsamplebyproj.json", "w") as file:
                text = ""
                text +="clustering=[\n\t"

                for i,labbelS in enumerate(labelsamples):
                    if i!=0:
                        text+=","
                    text+="{\n\t"
                    text +='labelsamples:"{}",\n\tfilename:"{}_Sample_{}centeredSampleProj.png"\n\t,classori:"{}",classnumber:"{}",\n\t'.format(labbelS,classori[i], i,classori[i],np.where(uniq_classes== classori[i])[0][0])

                    text +='bmu:['+','.join(["{}".format(bmutmp)for bmutmp in bmulists[:,i]])+']\n}\n'

                text+="]"
                print(text, file=file, end="")
        


        # Classification from projected matrix
        print("Classification from projected matrix")
        #print(classfierType)
        clf= initClassifier(classfierType)
        res=model_selection.cross_validate(clf, proj, y=classori, cv=nrot,groups=None, scoring=None,return_train_score=True)
        pickle.dump(res, open("crossvalresult.pkl", "wb"))

        #save list of Kmer by node
        saveKmerByNode(net, labels, "kmer_by_nodes.fastq")


    #print("mean res")
    #print(np.mean(res["test_score"]))
    #print("std res")
    #print(np.std(res["test_score"]), flush=True)
    rescross[inn,:]=[tmpsize,np.mean(res["test_score"]),np.std(res["test_score"]),np.mean(res["train_score"]),np.std(res["train_score"])]

#classif direct on Kmers count
clf= initClassifier(classfierType)
res = model_selection.cross_validate(clf, data.T, y=classori, cv=nrot, groups=None, scoring=None,return_train_score=True)
#rescross[-1,:]=[0,np.mean(res["test_score"]),np.std(res["test_score"]),np.mean(res["train_score"]),np.std(res["train_score"])]




np.savetxt("../MultiCrossValResult{}_{}_{}_{}.csv".format(datasetname,classfierType,boolstring,it),rescross, delimiter=",")
fig=plt.figure()
#plt.scatter(nnsize,rescross[:,1],c="red")
#plt.scatter(nnsize,rescross[:,3],c="green")
p1 = plt.bar(rescross[:,0], rescross[:,3], 0.4, yerr=rescross[:,4])
p1 = plt.bar([x+0.4 for x in rescross[:,0]] , rescross[:,1], 0.4, yerr=rescross[:,2])

plt.hlines(np.mean(res["test_score"]),xmin=np.min(rescross[:,0])-0.5,xmax=np.max(rescross[:,0])+1,colors="green",linestyles="dashed")

plt.ylim((np.min(rescross[:,1])-np.max(rescross[:,2]),np.max(rescross[:,3])+np.max(rescross[:,2])))
fig.suptitle("{} with {} {}\n Best mean test ={:.3f} for size {:.0f}".format(datasetname,classfierType,boolstring,np.max(rescross[:,1]),rescross[np.argmax(rescross[:,1]),0]), fontsize=14)
plt.legend(["mean test for direct Kmer model","train score","test score"],loc='lower right')

plt.savefig("{}/MultiCrossValResult{}_{}_{}_lr{}_i{}_n{}_cs{}.png".format(outputPath,datasetname,classfierType,boolstring,lr,it,args.nnsize,args.cluster_sample_size))
#plt.show()

