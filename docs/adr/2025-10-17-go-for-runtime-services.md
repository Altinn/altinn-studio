# Adopt Go for cloud-native runtime services

- Status: Proposed
- Deciders: Team
- Date: 17.10.2025

## Result

A1: Adopt Go as a programming language for specific runtime services, particularly those that interact with Kubernetes APIs and other cloud-native infrastructure, while maintaining .NET/C# as the primary language for the control plane and domain logic.

## Problem context

Altinn Studio is a multitenant app development platform consisting of two planes of services
- Control plane - design, development and publishing of apps
- Data plane - the container runtime for both
  - apps developed by service owners
  - supporting services that we develop

At the time of writing there are a little over 100 container runtimes (Kubernetes clusters) where we have to
host our runtime services alongside apps developed by service owners:
- **PDF generator**: Takes a URL, generates a PDF using headless Chrome, and returns it to the client
- **Studio Gateway**: Separates the platform control plane from the underlying container runtime, serving as the only component that speaks directly to the Kubernetes API
- **Studio Operator**: Implements the Kubernetes operator pattern to automate provisioning of external infrastructure for services running in the cluster

Due to this hosting model, the resource consumption of these services becomes significant.
Additionally, some of these services need to interact heavily with Kubernetes APIs and other cloud-native tools, where the available client libraries and ecosystem vary significantly between languages.

The standard tech stack in Digdir is:
- .NET and C# on the backend (.NET 8+)
- TypeScript/JavaScript with React on the frontend

Most backend developers have .NET competence.
We have extensive libraries and intend to have domain models in C#.
Client libraries and ecosystem around the cloud-native space is subpar in .NET compared to Go,
probably mainly due to most cloud-native infrastructure and tooling being built in Go ([see cncf landscape for reference](https://landscape.cncf.io/)).
Important examples:
- Kubernetes (so the client library here is the main implementation)
- Docker (cli, compose, buildx etc)
- Kind
- Podman
- Kubebuilder (and alternatives for scaffolding operators for Kubernetes)

We think there are benefits to using Go for some of the runtime services due to the ecosystem and other characteristics of the Go language and runtime.
Since we have only used C# and .NET, we have this ADR to put our reasoning and decision in writing.

## Decision drivers

- D1: Runtime services must be lightweight and resource-efficient, as they run in 100+ serviceowner clusters simultaneously
- D2: Runtime services must have excellent support for Kubernetes and cloud-native APIs
- D3: The language should be simple and easy for Digdir staff to learn as necessary
- D4: Build and deployment processes should be simple and fast
- D5: The language should integrate well with container technologies
- D6: Minimize duplication of domain models across languages

## Alternatives considered

- A1: Use Go for cloud-native runtime services, .NET for control plane services
- A2: Continue using only .NET (with NativeAOT, SlimBuilder where appropriate) for all services

## Pros and cons

### A1: Use Go for cloud-native runtime services, .NET for control plane services

- Good, because it significantly reduces resource consumption (D1)
  - Baseline memory usage: 2Mi (Go) vs 11Mi (.NET NativeAOT) - 5.5x improvement
  - Image size: 8MB (Go) vs 44MB (.NET NativeAOT) - 5.5x improvement
  - With 100+ deployments, this translates to cost savings and faster deployments
- Good, because Kubernetes and cloud-native client libraries are superior in Go (D2)
  - Kubernetes itself is written in Go, making the Go client the reference implementation
  - Better ecosystem for Docker Engine API, Kubernetes API, and other cloud-native tools
- OK, Go is simple, but there is less current knowledge than for C# (D3)
  - Different memory and concurrency model, but overall simple language design
  - Small language specification makes it approachable
- Good, because Go has excellent container integration (D5)
  - Statically linked binaries simplify distribution
  - Can build `FROM scratch` containers with just the binary
- Good, because Go has strong tooling and stability (D4)
  - Extensive built-in toolset (testing, benchmarking, formatting, etc.)
  - Extensive standard library including production-ready HTTP server
  - Open source and stable
  - Fast compilation times
- Bad, because it introduces a second language to the stack (D6)
  - Cannot easily share domain models and libraries with .NET control plane
  - Requires team to maintain competence in two languages
  - Requires separate CI/CD pipelines and tooling

### A2: Continue using only .NET (with NativeAOT, SlimBuilder where appropriate) for all services

- Good, because it maintains a single-language stack
  - Can share domain models and libraries across all services
  - Team only needs to maintain .NET competence
  - Single set of CI/CD pipelines and tooling
- Good, because most developers already have .NET competence
- Good, because .NET NativeAOT does improve resource usage compared to standard .NET
- Bad, because resource consumption is still significantly higher than Go (D1)
  - Baseline memory usage 5.5x higher than Go
  - Image size 5.5x larger than Go
- Bad, because Kubernetes and cloud-native client libraries are less mature, less maintained and have more bugs (D2)
  - Ecosystem for cloud-native tools is less developed, most cloud-native infra is built in Go
  - More difficult to integrate with cloud-native infrastructure
- Bad, because NativeAOT has additional complexity
  - Requires careful consideration of reflection and dynamic features
  - Build process is more complex and slower than Go

## Decision heuristic

When choosing between Go and .NET for a new service, use the following heuristic:

**Use Go when:**
- The service needs to interact with Kubernetes API or other cloud-native infrastructure APIs
- The service will run in serviceowner clusters (100+ deployments)
- The service is primarily focused on infrastructure concerns rather than business domain logic
- Resource efficiency is a primary concern (memory, image size, startup time)
- The service doesn't need to share substantial domain logic with the control plane

**Use .NET when:**
- The service needs to share domain models and business logic with the control plane
- The service contains complex business domain logic specific to Altinn Studio
- The service is part of the control plane and doesn't run in tenant clusters
- The service benefits from .NET ecosystem libraries (e.g., Entity Framework, ASP.NET)

**Examples:**
- PDF Generator: Go (runs in 100+ clusters, infrastructure-focused)
- Studio Gateway: Go (Kubernetes API integration, runs in 100+ clusters)
- Studio Operator: Go (Kubernetes operator pattern, infrastructure-focused, runs in 100+ clusters)
- Studio Backend API: .NET (complex domain logic, control plane)
- App Backend libraries: .NET (domain logic, shared libraries with apps, control plane and other platform services/products)

## Appendix A: Resource usage comparison

Comparison of baseline resource usage in local kind Kubernetes cluster using .NET NativeAOT and Go for a simple HTTP service responding to `/hello`:

```
SERVICE              | IMAGE SIZE   | MEMORY USAGE    | CPU
----------------------------------------------------------------------
.NET Native AOT      | 44.2MB       | 11Mi            | 3m
Go                   | 8.04MB       | 2Mi             | 2m
======================================================================
```

### .NET NativeAOT setup

Project configuration:
```csharp
var builder = WebApplication.CreateSlimBuilder(args);
var app = builder.Build();
app.MapGet("/hello", () => "world");
app.Run();
```

```csproj
<PropertyGroup>
  <TargetFramework>net10.0</TargetFramework>
  <PublishAot>true</PublishAot>
</PropertyGroup>
```

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /App
RUN apt-get update && apt-get install -y --no-install-recommends clang zlib1g-dev
COPY . ./
RUN dotnet restore
RUN dotnet publish -r linux-x64 -c Release -o out LightApi.csproj

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled
WORKDIR /App
COPY --from=build /App/out .
ENV ASPNETCORE_URLS="http://*:8070"
EXPOSE 8070
ENTRYPOINT ["./LightApi"]
```

### Go setup

```go
package main

import (
    "fmt"
    "log"
    "net/http"
)

func main() {
    http.HandleFunc("/hello", helloHandler)
    fmt.Println("Server starting on port 8071...")
    log.Fatal(http.ListenAndServe(":8071", nil))
}

func helloHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "world")
}
```

```dockerfile
FROM golang:1.25.2-trixie AS builder
WORKDIR /app
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd

FROM scratch
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE 8071
ENTRYPOINT ["./main"]
```
