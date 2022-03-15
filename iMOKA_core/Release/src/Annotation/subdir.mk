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

CPP_DEPS += \
./src/Annotation/AlignmentDerivedFeature.d \
./src/Annotation/Annotation.d \
./src/Annotation/Event.d \
./src/Annotation/Gene.d \
./src/Annotation/MapperResultLine.d 

OBJS += \
./src/Annotation/AlignmentDerivedFeature.o \
./src/Annotation/Annotation.o \
./src/Annotation/Event.o \
./src/Annotation/Gene.o \
./src/Annotation/MapperResultLine.o 


# Each subdirectory must supply rules for building sources it contributes
src/Annotation/%.o: ../src/Annotation/%.cpp src/Annotation/subdir.mk
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	g++ -std=c++14 -O3 -c -fmessage-length=0 -fopenmp -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


clean: clean-src-2f-Annotation

clean-src-2f-Annotation:
	-$(RM) ./src/Annotation/AlignmentDerivedFeature.d ./src/Annotation/AlignmentDerivedFeature.o ./src/Annotation/Annotation.d ./src/Annotation/Annotation.o ./src/Annotation/Event.d ./src/Annotation/Event.o ./src/Annotation/Gene.d ./src/Annotation/Gene.o ./src/Annotation/MapperResultLine.d ./src/Annotation/MapperResultLine.o

.PHONY: clean-src-2f-Annotation

