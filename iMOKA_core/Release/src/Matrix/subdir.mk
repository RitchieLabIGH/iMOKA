################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
CPP_SRCS += \
../src/Matrix/BinaryDB.cpp \
../src/Matrix/BinaryMatrix.cpp \
../src/Matrix/Kmer.cpp \
../src/Matrix/TextMatrix.cpp 

CPP_DEPS += \
./src/Matrix/BinaryDB.d \
./src/Matrix/BinaryMatrix.d \
./src/Matrix/Kmer.d \
./src/Matrix/TextMatrix.d 

OBJS += \
./src/Matrix/BinaryDB.o \
./src/Matrix/BinaryMatrix.o \
./src/Matrix/Kmer.o \
./src/Matrix/TextMatrix.o 


# Each subdirectory must supply rules for building sources it contributes
src/Matrix/%.o: ../src/Matrix/%.cpp src/Matrix/subdir.mk
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	g++ -std=c++14 -O3 -c -fmessage-length=0 -fopenmp -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


clean: clean-src-2f-Matrix

clean-src-2f-Matrix:
	-$(RM) ./src/Matrix/BinaryDB.d ./src/Matrix/BinaryDB.o ./src/Matrix/BinaryMatrix.d ./src/Matrix/BinaryMatrix.o ./src/Matrix/Kmer.d ./src/Matrix/Kmer.o ./src/Matrix/TextMatrix.d ./src/Matrix/TextMatrix.o

.PHONY: clean-src-2f-Matrix

