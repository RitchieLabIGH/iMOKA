################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
CPP_SRCS += \
../src/Graphs/BNode.cpp \
../src/Graphs/GraphSequence.cpp \
../src/Graphs/KmerGraph.cpp \
../src/Graphs/KmerGraphSet.cpp 

OBJS += \
./src/Graphs/BNode.o \
./src/Graphs/GraphSequence.o \
./src/Graphs/KmerGraph.o \
./src/Graphs/KmerGraphSet.o 

CPP_DEPS += \
./src/Graphs/BNode.d \
./src/Graphs/GraphSequence.d \
./src/Graphs/KmerGraph.d \
./src/Graphs/KmerGraphSet.d 


# Each subdirectory must supply rules for building sources it contributes
src/Graphs/%.o: ../src/Graphs/%.cpp
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	g++ -std=c++14 -O3 -c -fmessage-length=0 -fopenmp -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


