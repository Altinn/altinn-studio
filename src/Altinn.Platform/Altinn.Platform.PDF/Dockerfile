FROM maven:3.8.1-openjdk-11 AS build
WORKDIR build
COPY . .
RUN mvn -Pprod package

FROM gcr.io/distroless/java:11 AS final
WORKDIR app
COPY --from=build /build/target .
# setup the user and group
# the user will have no password, using shell /bin/false and using the group dotnet
# RUN addgroup --gid 3000 dotnet && adduser --uid 1000 --ingroup dotnet --disabled-password --shell /bin/false dotnet
# update permissions of files if neccessary before becoming dotnet user
# USER dotnet
CMD ["./Altinn.Platform.PDF-1.0.jar"]
