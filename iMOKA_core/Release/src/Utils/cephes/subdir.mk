################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../src/Utils/cephes/bdtr.c \
../src/Utils/cephes/btdtr.c \
../src/Utils/cephes/chbevl.c \
../src/Utils/cephes/chdtr.c \
../src/Utils/cephes/const.c \
../src/Utils/cephes/drand.c \
../src/Utils/cephes/expx2.c \
../src/Utils/cephes/fdtr.c \
../src/Utils/cephes/gamma.c \
../src/Utils/cephes/gdtr.c \
../src/Utils/cephes/igam.c \
../src/Utils/cephes/igami.c \
../src/Utils/cephes/incbet.c \
../src/Utils/cephes/incbi.c \
../src/Utils/cephes/isnan.c \
../src/Utils/cephes/kolmogorov.c \
../src/Utils/cephes/mtherr.c \
../src/Utils/cephes/nbdtr.c \
../src/Utils/cephes/ndtr.c \
../src/Utils/cephes/ndtri.c \
../src/Utils/cephes/pdtr.c \
../src/Utils/cephes/polevl.c \
../src/Utils/cephes/stdtr.c \
../src/Utils/cephes/unity.c 

OBJS += \
./src/Utils/cephes/bdtr.o \
./src/Utils/cephes/btdtr.o \
./src/Utils/cephes/chbevl.o \
./src/Utils/cephes/chdtr.o \
./src/Utils/cephes/const.o \
./src/Utils/cephes/drand.o \
./src/Utils/cephes/expx2.o \
./src/Utils/cephes/fdtr.o \
./src/Utils/cephes/gamma.o \
./src/Utils/cephes/gdtr.o \
./src/Utils/cephes/igam.o \
./src/Utils/cephes/igami.o \
./src/Utils/cephes/incbet.o \
./src/Utils/cephes/incbi.o \
./src/Utils/cephes/isnan.o \
./src/Utils/cephes/kolmogorov.o \
./src/Utils/cephes/mtherr.o \
./src/Utils/cephes/nbdtr.o \
./src/Utils/cephes/ndtr.o \
./src/Utils/cephes/ndtri.o \
./src/Utils/cephes/pdtr.o \
./src/Utils/cephes/polevl.o \
./src/Utils/cephes/stdtr.o \
./src/Utils/cephes/unity.o 

C_DEPS += \
./src/Utils/cephes/bdtr.d \
./src/Utils/cephes/btdtr.d \
./src/Utils/cephes/chbevl.d \
./src/Utils/cephes/chdtr.d \
./src/Utils/cephes/const.d \
./src/Utils/cephes/drand.d \
./src/Utils/cephes/expx2.d \
./src/Utils/cephes/fdtr.d \
./src/Utils/cephes/gamma.d \
./src/Utils/cephes/gdtr.d \
./src/Utils/cephes/igam.d \
./src/Utils/cephes/igami.d \
./src/Utils/cephes/incbet.d \
./src/Utils/cephes/incbi.d \
./src/Utils/cephes/isnan.d \
./src/Utils/cephes/kolmogorov.d \
./src/Utils/cephes/mtherr.d \
./src/Utils/cephes/nbdtr.d \
./src/Utils/cephes/ndtr.d \
./src/Utils/cephes/ndtri.d \
./src/Utils/cephes/pdtr.d \
./src/Utils/cephes/polevl.d \
./src/Utils/cephes/stdtr.d \
./src/Utils/cephes/unity.d 


# Each subdirectory must supply rules for building sources it contributes
src/Utils/cephes/%.o: ../src/Utils/cephes/%.c
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C Compiler'
	gcc -O3 -Wall -c -fmessage-length=0 -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


