# Altinn Platform

[![Build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/altinn-register-master)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=35)

[![Build status](https://dev.azure.com/brreg/altinn-studio/_apis/build/status/altinn-platform/altinn-storage-master)](https://dev.azure.com/brreg/altinn-studio/_build/latest?definitionId=30)

An early test version of Altinn Platform is available at http://platform.altinn.cloud

## Getting Started

These instructions will get you a copy of the platform solution up and running on your machine for development and testing purposes.

### Prerequisites

1. [.NET Core 2.2 SDK](https://dotnet.microsoft.com/download/dotnet-core/2.2#sdk-2.2.105)
2. Code editor of your choice
3. Newest [Git](https://git-scm.com/downloads)
4. [Docker CE](https://www.docker.com/get-docker)

### Installing

Clone [Altinn Studio repo](https://github.com/Altinn/altinn-studio) and navigate to the folder altinn-studio/src/Altinn.Platform

```cmd
git clone https://github.com/Altinn/altinn-studio
cd altinn-studio
```

Run all parts of the solution in containers (Make sure docker is running)

```cmd
docker-compose up -d --build
```

The register solution is now available locally at http://localhost:5020/api/v1 and has endpoints:

- organizations/{orgNr}

- parties/{partyId}

- persons/{ssn}

#### Running Altinn Platform Register locally

The Register components can be run locally when developing/debugging. Follow the install steps above if this has not already been done.

Stop the container running Register

```cmd
docker stop altinn-platform-register
```

Navigate to the altinn-studio/src/Altinn.Platform/Register, and build and run the code from there, or run the solution using you selected code editor

```cmd
dotnet run
```
