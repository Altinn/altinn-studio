# Altinn Platform

[![Build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/altinn-register-master)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=35)

[![Build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/altinn-storage-master)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=30)


An early test version of Altinn Platform is available at http://platform.altinn.cloud

## Getting Started

These instructions will get you a copy of the platform solution up and running on your machine for development and testing purposes.

### Prerequisites

Note that Platform PDF is a Java application and requires other prerequisites.
This is documented in the sub section.

1. [.NET Core 5.0 SDK](https://dotnet.microsoft.com/download/dotnet/5.0)
2. Code editor of your choice
3. Newest [Git](https://git-scm.com/downloads)
4. [Docker CE](https://www.docker.com/get-docker)
5. Solution is cloned

#### Platform PDF
1. [Java 17](https://jdk.java.net/17/)
2. [Maven](https://maven.apache.org/download.cgi)


### Running Altinn Platform Authentication in container

Clone [Altinn Studio repo](https://github.com/Altinn/altinn-studio) and navigate to the folder altinn-studio/src/Altinn.Platform/Altinn.Platform.Authentication

Run all parts of the solution in containers (Make sure docker is running)

```cmd
docker-compose up -d --build
```

#### Running Altinn Platform Authentication locally

The Authentication components can be run locally when developing/debugging. Follow the install steps above if this has not already been done.

Stop the container running Authentication

```cmd
docker stop altinn-platform-authentication
```

Navigate to the altinn-studio/src/Altinn.Platform/Altinn.Platform.Authentication/Authentication, and build and run the code from there, or run the solution using you selected code editor

```cmd
dotnet run
```

The authentication solution is now available locally at http://localhost:5040.

### Running Altinn Platform Authorization in container

Clone [Altinn Studio repo](https://github.com/Altinn/altinn-studio) and navigate to the folder altinn-studio/src/Altinn.Platform/Altinn.Platform.Authorization

Run all parts of the solution in containers (Make sure docker is running)

```cmd
docker-compose up -d --build
```

#### Running Altinn Platform Authorization locally

The Authorization components can be run locally when developing/debugging. Follow the install steps above if this has not already been done.

Stop the container running Authorization

```cmd
docker stop altinn-platform-authorization
```

Navigate to the altinn-studio/src/Altinn.Platform/Altinn.Platform.Authorization/Authorization, and build and run the code from there, or run the solution using you selected code editor

```cmd
dotnet run
```

The authorization solution is now available locally at http://localhost:5050.



#### Running Altinn Platform PDF locally

The PDF components can be run locally when developing/debugging. Follow the install steps above if this has not already been done.

Stop the container running PDF

```cmd
docker stop altinn-pdf
```

Navigate to `altinn-studio/src/Altinn.Platform/Altinn.Platform.PDF`, and build and run the code from there, or run the solution using you selected code editor

```cmd
 mvn spring-boot:run
```

The pdf solution is now available locally at http://localhost:5070.
