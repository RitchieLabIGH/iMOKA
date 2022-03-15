################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
CPP_SRCS += \
../src/Process/Aggregation.cpp \
../src/Process/BinaryMatrixHandler.cpp \
../src/Process/Classification.cpp \
../src/Process/SingleCellDecomposition.cpp 

CPP_DEPS += \
./src/Process/Aggregation.d \
./src/Process/BinaryMatrixHandler.d \
./src/Process/Classification.d \
./src/Process/SingleCellDecomposition.d 

OBJS += \
./src/Process/Aggregation.o \
./src/Process/BinaryMatrixHandler.o \
./src/Process/Classification.o \
./src/Process/SingleCellDecomposition.o 


# Each subdirectory must supply rules for building sources it contributes
src/Process/%.o: ../src/Process/%.cpp src/Process/subdir.mk
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	g++ -std=c++14 -O3 -c -fmessage-length=0 -fopenmp -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


clean: clean-src-2f-Process

clean-src-2f-Process:
	-$(RM) ./src/Process/Aggregation.d ./src/Process/Aggregation.o ./src/Process/BinaryMatrixHandler.d ./src/Process/BinaryMatrixHandler.o ./src/Process/Classification.d ./src/Process/Classification.o ./src/Process/SingleCellDecomposition.d ./src/Process/SingleCellDecomposition.o

.PHONY: clean-src-2f-Process

