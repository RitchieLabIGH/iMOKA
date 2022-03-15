################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
CPP_SRCS += \
../src/Utils/BamReader.cpp \
../src/Utils/FastqReader.cpp \
../src/Utils/MLpack.cpp \
../src/Utils/Mapper.cpp 

CPP_DEPS += \
./src/Utils/BamReader.d \
./src/Utils/FastqReader.d \
./src/Utils/MLpack.d \
./src/Utils/Mapper.d 

OBJS += \
./src/Utils/BamReader.o \
./src/Utils/FastqReader.o \
./src/Utils/MLpack.o \
./src/Utils/Mapper.o 


# Each subdirectory must supply rules for building sources it contributes
src/Utils/%.o: ../src/Utils/%.cpp src/Utils/subdir.mk
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	g++ -std=c++14 -O3 -c -fmessage-length=0 -fopenmp -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


clean: clean-src-2f-Utils

clean-src-2f-Utils:
	-$(RM) ./src/Utils/BamReader.d ./src/Utils/BamReader.o ./src/Utils/FastqReader.d ./src/Utils/FastqReader.o ./src/Utils/MLpack.d ./src/Utils/MLpack.o ./src/Utils/Mapper.d ./src/Utils/Mapper.o

.PHONY: clean-src-2f-Utils

