FROM maven:3-jdk-12
WORKDIR build
COPY . .
RUN mvn -Pprod package
CMD ["java", "-jar", "./target/Altinn.Platform.PDF-1.0.jar"]
