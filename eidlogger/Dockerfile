# Build stage
FROM eclipse-temurin:21-alpine AS build
ARG GITHUB_USER
ARG GITHUB_PASSWORD
COPY settings.xml.template /root/.m2/settings.xml
WORKDIR /app
COPY pom.xml pom.xml
COPY mvnw mvnw
COPY .mvn ./.mvn
COPY src ./src
RUN ./mvnw clean install -DskipTests

# Package stage
FROM eclipse-temurin:21-jre-alpine
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
