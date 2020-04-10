################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
CPP_SRCS += \
../src/Annotation/AlignmentDerivedFeature.cpp \
../src/Annotation/Annotation.cpp \
../src/Annotation/Event.cpp \
../src/Annotation/Gene.cpp \
../src/Annotation/MapperResultLine.cpp 

OBJS += \
./src/Annotation/AlignmentDerivedFeature.o \
./src/Annotation/Annotation.o \
./src/Annotation/Event.o \
./src/Annotation/Gene.o \
./src/Annotation/MapperResultLine.o 

CPP_DEPS += \
./src/Annotation/AlignmentDerivedFeature.d \
./src/Annotation/Annotation.d \
./src/Annotation/Event.d \
./src/Annotation/Gene.d \
./src/Annotation/MapperResultLine.d 


# Each subdirectory must supply rules for building sources it contributes
src/Annotation/%.o: ../src/Annotation/%.cpp
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	g++ -std=c++14 -O3 -c -fmessage-length=0 -fopenmp -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


