# Build stage
FROM eclipse-temurin:21-alpine AS build
ARG GITHUB_USER
ARG GITHUB_PASSWORD
COPY settings.xml.template /root/.m2/settings.xml
WORKDIR /app
COPY mvnw mvnw
COPY .mvn ./.mvn
COPY pom.xml pom.xml
RUN ./mvnw dependency:go-offline -B
COPY src ./src
RUN ./mvnw clean package -DskipTests

# Package stage
FROM eclipse-temurin:21.0.6_7-jre-alpine
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
