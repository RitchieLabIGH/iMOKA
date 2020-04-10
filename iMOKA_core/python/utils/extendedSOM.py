from __future__ import print_function

import sys
import numpy as np
import os, errno
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
from matplotlib import cm
from mpl_toolkits.axes_grid1 import make_axes_locatable

import SimpSOM.hexagons as hx
import SimpSOM.densityPeak as dp
import SimpSOM.qualityThreshold as qt

from sklearn.decomposition import PCA
from sklearn import cluster
import SimpSOM as sps
class extendedSOM(sps.somNet):
    """ Kohonen SOM Network class. """
    bmuList=[]
#    def __init__(self, netHeight, netWidth, data, loadFile=None, PCI=0, PBC=0, n_jobs=-1):
#        super(B, self).__init__()
    def nodes_graph_custom(self,datacustom, colnum=0, show=False, printout=True, path='./',name=''):

        """Plot a 2D map with hexagonal nodes and weights values

        Args:
            colnum (int): The index of the weight that will be shown as colormap.
            show (bool, optional): Choose to display the plot.
            printout (bool, optional): Choose to save the plot to a file.

        """

        centers = [[node.pos[0], node.pos[1]] for node in self.nodeList]

        widthP = 100
        dpi = 72
        xInch = self.netWidth * widthP / dpi
        yInch = self.netHeight * widthP / dpi
        fig = plt.figure(figsize=(xInch, yInch), dpi=dpi)

        if self.colorEx == True:
            cols = [[np.float(node.weights[0]), np.float(node.weights[1]), np.float(node.weights[2])] for node in
                    self.nodeList]
            ax = hx.plot_hex(fig, centers, cols)
            ax.set_title('Node Grid w Color Features', size=80)
            printName = os.path.join(path, 'nodesColors.png')

        else:
            if len(datacustom.shape)==1:
                cols = datacustom
            else:
                cols = datacustom[:,colnum]
            ax = hx.plot_hex(fig, centers, cols)
            #ax.set_title('Node Grid w Feature #' + str(colnum), size=80)
            ax.set_title('Node Grid feature' + name, size=80)
            divider = make_axes_locatable(ax)
            cax = divider.append_axes("right", size="5%", pad=0.0)
            cbar = plt.colorbar(ax.collections[0], cax=cax)
            cbar.set_label('Feature #' + str(colnum) + ' value', size=80, labelpad=50)
            cbar.ax.tick_params(labelsize=60)
            plt.sca(ax)
            printName = os.path.join(path, 'nodesFeatureCustom_' + name + '.png')

        if printout == True:
            plt.savefig(printName, bbox_inches='tight', dpi=dpi)
        if show == True:
            plt.show()
        if show != False and printout != False:
            plt.clf()

    def find_bmu_id(self, vec):

        """Find the best matching unit (BMU) for a given vector.

        Args:
            vec (np.array): The vector to match.

        Returns:
            bmu (somNode): The best matching unit node.

        """

        minVal = np.finfo(np.float).max
        for i,node in enumerate(self.nodeList):
            dist = node.get_distance(vec)
            if dist < minVal:
                minVal = dist
                bmu = i
        return bmu

    def setBMUtable(self, array):
        bmuList, cls = [], []
        for i in range(array.shape[0]):
            bmuList.append(self.find_bmu_id(array[i, :]))

        self.bmuList=bmuList
    def projectsample(self, array, colnum=-1, name="", normbybmu=False,show=False, printout=True, path='./',meanmatrix = [],clim=3):

        """Project the datapoints of a given array to the 2D space of the
            SOM by calculating the bmus. If requested plot a 2D map with as
            implemented in nodes_graph and adds circles to the bmu
            of each datapoint in a given array.

        Args:
            array (np.array): An array containing datapoints to be mapped.
            colnum (int): The index of the weight that will be shown as colormap.
                If not chosen, the difference map will be used instead.
            show (bool, optional): Choose to display the plot.
            printout (bool, optional): Choose to save the plot to a file.

        Returns:
            (list): bmu x,y position for each input array datapoint.

        """
        if len(self.bmuList)==0:
            print("load setBMUtable before")
            return 0


        proj=np.zeros(len(self.nodeList),dtype=np.float)
        projmean = np.zeros(len(self.nodeList), dtype=np.float)
        if len(array.shape)==2:
            array=array[:,colnum]
        for i,val in enumerate(array):
            proj[self.bmuList[i]]+=val
            if len(meanmatrix)!=0 :
                projmean[self.bmuList[i]]+=meanmatrix[i]
        #normalize by the number of kmer by node
        if normbybmu:
            uniqubmu, countbmu = np.unique(self.bmuList, return_counts=True)
            allcountbmu = np.ones(proj.shape)
            allcountbmu[uniqubmu] = countbmu
            proj = proj / allcountbmu



        centers = [[node.pos[0], node.pos[1]] for node in self.nodeList]
        if show == True or printout == True:

            widthP = 100
            dpi = 72
            xInch = self.netWidth * widthP / dpi
            yInch = self.netHeight * widthP / dpi
            fig = plt.figure(figsize=(xInch, yInch), dpi=dpi)


            #ax = hx.plot_hex(fig, centers, proj)
            #test visualize from mean:
            ax = hx.plot_hex(fig, centers, proj-projmean )
            ax.set_title(name)   #, size=80)

            divider = make_axes_locatable(ax)
            cax = divider.append_axes("right", size="5%", pad=0.0)
            cbar = plt.colorbar(ax.collections[0], cax=cax)
            #cbar.set_clim(-clim, clim)
            cbar.set_label('Weights Difference')#, size=80, labelpad=50
            #cbar.ax.tick_params(labelsize=60)
            plt.sca(ax)

            printName = os.path.join(path, name+'centeredSampleProj.png')

            if printout == True:
                plt.savefig(printName, bbox_inches='tight', dpi=dpi)
            if show == True:
                plt.show()
            if show != False and printout != False:
                plt.clf()
            plt.close()

        return proj