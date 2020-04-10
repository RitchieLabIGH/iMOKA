import numpy as np
import pandas as pd
import sys
from sklearn.model_selection._split import BaseShuffleSplit, _validate_shuffle_split


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


def reduce_na(values, target, perc_NaN):
    '''
    Reduce a matrix of values in according to the proportion of NaN
    '''
    groupcount = np.bincount(target)
    mingroup = (int)(np.nanmin(groupcount))
    mask=sum(values != -1 ) > (mingroup*perc_NaN)
    return mask
    
    


def reduce_correlation(values, target ,corr_thr):
    '''
    Reduce a matrix of values in according to their correlation
    '''
    mask = np.ones(values.shape[1] ,dtype=bool)
    if ( corr_thr == -1 ) :
        return mask, {}
    print("Computing correlations...")
    correlations = np.array(pd.DataFrame(np.hstack((values, np.array(target, ndmin=2).T))).corr())
    print("Done")
    target_corr_idx=mask.size
    aggr = np.arange(0,  mask.size)
    for i in range(0, mask.size):
        for j in range(i+1, mask.size):
            if abs(correlations[i,j]) >= corr_thr:
                if abs(correlations[i, target_corr_idx]) > abs(correlations[j, target_corr_idx]):
                    mask[j]=False
                    aggr[j]=aggr[i]
                else:
                    mask[i]=False
                    aggr[i]=aggr[j]
    aggr_lab={}
    f_done = np.zeros(values.shape[1] ,dtype=bool)
    for i in range(0, mask.size):
        if not mask[i] and not f_done[i]:
            j = i
            toadd=[]
            while not mask[j] and not f_done[j]:
                toadd.append(j)
                f_done[j]=True
                j=aggr[j]
            if (aggr_lab.__contains__(aggr[j])):
                aggr_lab[aggr[j]]=aggr_lab[aggr[j]]+toadd
            else:
                aggr_lab[aggr[j]]=toadd
    return mask, aggr_lab



class BalancedShuffleSplit(BaseShuffleSplit):
            
    def _iter_indices(self, X, y, groups=None):
        groupcount = np.bincount(y)
        mingroup = (int)(np.nanmin(groupcount))
        train_size , test_size = _validate_shuffle_split(mingroup ,self.test_size, self.train_size)
        for i in range(self.n_splits):
            train_idx = np.empty((0,), dtype='int')
            test_idx = np.empty((0,), dtype='int')
            for g in range(0, len(groupcount)):
                random_indices = np.random.permutation(np.arange(len(y))[y==g])
                train_idx = np.concatenate((train_idx, random_indices[0:train_size]))
                if self.test_size == None:
                    test_idx = np.concatenate((test_idx, random_indices[train_size:]))
                else :
                    test_idx = np.concatenate((test_idx, random_indices[train_size:train_size+test_size]))
            yield train_idx, test_idx;
        
        
