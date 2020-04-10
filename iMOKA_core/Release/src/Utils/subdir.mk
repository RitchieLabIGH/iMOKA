################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
CPP_SRCS += \
../src/Utils/MLpack.cpp \
../src/Utils/Mapper.cpp \
../src/Utils/Stats.cpp 

OBJS += \
./src/Utils/MLpack.o \
./src/Utils/Mapper.o \
./src/Utils/Stats.o 

CPP_DEPS += \
./src/Utils/MLpack.d \
./src/Utils/Mapper.d \
./src/Utils/Stats.d 


# Each subdirectory must supply rules for building sources it contributes
src/Utils/%.o: ../src/Utils/%.cpp
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	g++ -std=c++14 -O3 -c -fmessage-length=0 -fopenmp -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


