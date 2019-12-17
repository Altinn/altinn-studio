FROM maven:3-jdk-12
WORKDIR build
COPY . .
RUN mvn -Pprod package

# setup the user and group
# the user will have no password, using shell /bin/false and using the group dotnet
RUN groupadd -g 3000 dotnet && adduser -u 1000 -g dotnet -s /bin/false dotnet
# update permissions of files if neccessary before becoming dotnet user
#USER dotnet
CMD ["java", "-jar", "./target/Altinn.Platform.PDF-1.0.jar"]
