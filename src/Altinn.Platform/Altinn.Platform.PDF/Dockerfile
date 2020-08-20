FROM maven:3.6.3-jdk-14 AS build
WORKDIR build
COPY . .
RUN mvn -Pprod package

FROM openjdk:16-jdk-alpine3.12 AS final
WORKDIR app
COPY --from=build /build/target .
# setup the user and group
# the user will have no password, using shell /bin/false and using the group dotnet
RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet
# update permissions of files if neccessary before becoming dotnet user
USER dotnet
CMD ["java", "-jar", "./Altinn.Platform.PDF-1.0.jar"]
