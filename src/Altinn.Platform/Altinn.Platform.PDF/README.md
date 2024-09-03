# Altinn Platform PDF

[![PDF scan](https://github.com/altinn/altinn-studio/actions/workflows/pdf-scan.yml/badge.svg)](https://github.com/Altinn/altinn-studio/actions/workflows/pdf-scan.yml)

## Getting Started

These instructions will get you a copy of the pdf solution up and running on your machine for development and testing purposes.

Altinn Platform PDF is a Java application and requires other prerequisites than other Altinn applications.

1. Newest [Git](https://git-scm.com/downloads)
2. A code editor - we like [Visual Studio Code](https://code.visualstudio.com/download)
   - Also install [recommended extensions](https://code.visualstudio.com/docs/editor/extension-marketplace#_workspace-recommended-extensions) (e.g. [C#](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp))
3. [Podman](https://podman.io/) or another container tool such as Docker Desktop
4. [Java 17](https://jdk.java.net/17/)
5. [Maven](https://maven.apache.org/download.cgi)

### Cloning the application

Clone [Altinn Studio repo](https://github.com/Altinn/altinn-studio) and navigate to the folder.

```bash
git clone https://github.com/Altinn/altinn-studio
cd altinn-studio
```

#### Running the application using Podman

The PDF component can be run locally using podman. To build and run the application use the command.

```cmd
podman compose up -d --build
```

#### Running the application with Maven

The PDF components can be run locally when developing/debugging.

Stop the container running PDF

```cmd
podman stop altinn-pdf
```

Navigate to `altinn-studio/src/Altinn.Platform/Altinn.Platform.PDF`, and build and run the code from there, or run the solution using your selected code editor

```cmd
 mvn spring-boot:run
```

The pdf solution is now available locally at http://localhost:5070.
