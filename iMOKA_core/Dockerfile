FROM ubuntu:bionic

LABEL version=v1.0

COPY ./external /iMOKA/external

ENV PATH="/iMOKA/external:/iMOKA/external/bin:/iMOKA/python/:/iMOKA/scripts/:$PATH"
ENV LD_LIBRARY_PATH="/usr/local/lib/:$LD_LIBRARY_PATH"
ENV PYTHONNOUSERSITE="true"

### All the dependencies
RUN apt-get clean all && \
    apt-get update && \
    apt-get -y upgrade && \
    export DEBIAN_FRONTEND=noninteractive && \ 
    apt-get install -qy make build-essential gcc g++ \
    	 libopenmpi-dev zlib1g-dev  \
    	libarmadillo-dev libboost-test-dev \
    	libboost-dev libboost-system-dev libboost-math-dev \
    	libboost-program-options-dev libboost-serialization-dev \
    	python3  \
    	fastqc samtools python3-pip libxml-libxml-perl curl \
    	bedtools libxml-parser-perl  \
    	gzip gawk libz-dev wget cmake perl graphviz locales && \
    pip3 install --no-cache-dir  SimpSOM numpy scipy sklearn pandas && \
### mlpack v3.0.4
### wget http://www.mlpack.org/files/mlpack-3.0.4.tar.gz
	cd /iMOKA/external/ && \
 	tar -xvzpf mlpack-3.0.4.tar.gz && \
 	mkdir -p ./mlpack-3.0.4/build && \
 	cd ./mlpack-3.0.4/build/ && \
 	cmake -DCMAKE_INSTALL_PREFIX=/usr/local -DBUILD_CLI_EXECUTABLES=OFF -DBUILD_PYTHON_BINDINGS=OFF -DBUILD_TESTS=OFF -DUSE_OPENMP=ON  ../ && \
 	make -j4 && \
 	make install && \
 	cd /iMOKA/external/ && \
 	rm -fr ./mlpack-3.0.4 ./mlpack-3.0.4.tar.gz && \
### KMC
## wget https://github.com/refresh-bio/KMC/releases/download/v3.0.0/KMC3.linux.tar.gz 
	cd /iMOKA/external/ && \
 	tar -xvzpf KMC3.linux.tar.gz && \
 	rm ./KMC3.linux.tar.gz && \
### GMAP
## wget http://research-pub.gene.com/gmap/src/gmap-gsnap-2019-05-12.tar.gz
	cd /iMOKA/external/ && \
	tar -xzf gmap-gsnap-2019-05-12.tar.gz && \
	rm gmap-gsnap-2019-05-12.tar.gz && \
	cd ./gmap-2019-05-12 && \
	./configure --prefix="/iMOKA/external/" --with-simd-level=sse42 && make && make install && \
	cd /iMOKA/external/ &&  \
	rm -fr ./gmap-2019-05-12 gmap-gsnap-2019-05-12.tar.gz && \
### SEQKIT 
	cd /iMOKA/external/ && \
	tar -zxvf seqkit_linux_amd64.tar.gz && chmod +x ./seqkit && rm -f seqkit_linux_amd64.tar.gz && \
### SRATOOLKIT
	cd /iMOKA/external/ && \
	tar -zxvf sratoolkit.2.10.0-ubuntu64-light.tar.gz && rm -f sratoolkit.2.10.0-ubuntu64-light.tar.gz

COPY ./src /iMOKA/src
COPY ./Release /iMOKA/Release
COPY ./python /iMOKA/python
COPY ./scripts /iMOKA/scripts

### Actual iMOKA
RUN	cd /iMOKA/Release && \
	make clean && \
	make -j4 all && \
	mv ./iMOKA_core /iMOKA/external/ && \
	ln -s /iMOKA/external/iMOKA_core /iMOKA/external/KmerAnalysis && \
	apt-get -qy purge make build-essential gcc g++ && \
	apt-get clean && \
    apt-get purge && \
    apt-get autoclean && \
	rm -rf /var/lib/apt/lists/* /var/log/dpkg.log


    
ENTRYPOINT ["iMOKA_core"]

