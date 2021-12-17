################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
CPP_SRCS += \
../src/SingleCellDecomposition/SplitBamRead.cpp 

OBJS += \
./src/SingleCellDecomposition/SplitBamRead.o 

CPP_DEPS += \
./src/SingleCellDecomposition/SplitBamRead.d 


# Each subdirectory must supply rules for building sources it contributes
src/SingleCellDecomposition/%.o: ../src/SingleCellDecomposition/%.cpp
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	g++ -std=c++14 -O3 -c -fmessage-length=0 -fopenmp -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


