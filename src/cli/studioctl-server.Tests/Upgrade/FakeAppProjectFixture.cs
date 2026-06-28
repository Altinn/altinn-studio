using System.Globalization;

namespace Altinn.Studio.StudioctlServer.Tests.Upgrade;

internal sealed class FakeAppProjectFixture : IDisposable
{
    private readonly List<string> _rootDirectories = [];

    public FakeAppProject Create(FakeAppSourceVersion sourceVersion, string? programCs = null)
    {
        var rootDirectory = Path.Combine(
            Path.GetTempPath(),
            "studioctl-server-test-app-" + Guid.NewGuid().ToString("N", CultureInfo.InvariantCulture)
        );
        var appDirectory = Path.Combine(rootDirectory, "App");
        var configDirectory = Path.Combine(appDirectory, "config");
        var processDirectory = Path.Combine(configDirectory, "process");
        var textsDirectory = Path.Combine(configDirectory, "texts");
        var uiDirectory = Path.Combine(appDirectory, "ui");
        var layoutDirectory = Path.Combine(uiDirectory, "form", "layouts");
        var viewsDirectory = Path.Combine(appDirectory, "views", "Home");
        var propertiesDirectory = Path.Combine(appDirectory, "Properties");

        Directory.CreateDirectory(processDirectory);
        Directory.CreateDirectory(textsDirectory);
        Directory.CreateDirectory(layoutDirectory);
        Directory.CreateDirectory(viewsDirectory);
        Directory.CreateDirectory(propertiesDirectory);

        var projectFile = Path.Combine(appDirectory, "App.csproj");
        var programFile = Path.Combine(appDirectory, "Program.cs");
        var processFile = Path.Combine(processDirectory, "process.bpmn");
        var applicationMetadataFile = Path.Combine(configDirectory, "applicationmetadata.json");

        File.WriteAllText(projectFile, CreateProjectFile(sourceVersion));
        File.WriteAllText(programFile, programCs ?? CreateProgramCs());
        File.WriteAllText(Path.Combine(appDirectory, "appsettings.json"), "{}" + Environment.NewLine);
        File.WriteAllText(Path.Combine(propertiesDirectory, "launchSettings.json"), CreateLaunchSettings());
        File.WriteAllText(applicationMetadataFile, CreateApplicationMetadata());
        File.WriteAllText(processFile, CreateProcessFile());
        File.WriteAllText(Path.Combine(textsDirectory, "resource.nb.json"), "[]" + Environment.NewLine);
        File.WriteAllText(Path.Combine(uiDirectory, "layout-sets.json"), CreateLayoutSets());
        File.WriteAllText(Path.Combine(layoutDirectory, "form.json"), CreateLayout());
        File.WriteAllText(
            Path.Combine(viewsDirectory, "Index.cshtml"),
            "<div id=\"root\"></div>" + Environment.NewLine
        );
        File.WriteAllText(Path.Combine(rootDirectory, "Dockerfile"), CreateDockerfile(sourceVersion));

        _rootDirectories.Add(rootDirectory);

        return new FakeAppProject(
            rootDirectory,
            appDirectory,
            projectFile,
            programFile,
            processFile,
            applicationMetadataFile,
            uiDirectory,
            textsDirectory
        );
    }

    public void Dispose()
    {
        foreach (var rootDirectory in _rootDirectories)
        {
            if (Directory.Exists(rootDirectory))
            {
                Directory.Delete(rootDirectory, recursive: true);
            }
        }
    }

    private static string CreateProjectFile(FakeAppSourceVersion sourceVersion)
    {
        var packageVersion = sourceVersion switch
        {
            FakeAppSourceVersion.V7 => "7.0.0",
            FakeAppSourceVersion.V8 => "8.0.0",
            _ => throw new ArgumentOutOfRangeException(nameof(sourceVersion), sourceVersion, null),
        };
        var targetFramework = sourceVersion switch
        {
            FakeAppSourceVersion.V7 => "net6.0",
            FakeAppSourceVersion.V8 => "net8.0",
            _ => throw new ArgumentOutOfRangeException(nameof(sourceVersion), sourceVersion, null),
        };

        return $$"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>{{targetFramework}}</TargetFramework>
                <RootNamespace>Altinn.App</RootNamespace>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="{{packageVersion}}" />
                <PackageReference Include="Altinn.App.Core" Version="{{packageVersion}}" />
              </ItemGroup>
            </Project>
            """;
    }

    private static string CreateDockerfile(FakeAppSourceVersion sourceVersion)
    {
        var targetFramework = sourceVersion switch
        {
            FakeAppSourceVersion.V7 => "net6.0",
            FakeAppSourceVersion.V8 => "net8.0",
            _ => throw new ArgumentOutOfRangeException(nameof(sourceVersion), sourceVersion, null),
        };

        return $$"""
            FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
            WORKDIR /app

            FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
            WORKDIR /src
            COPY App/App.csproj App/
            RUN dotnet restore "App/App.csproj"
            COPY . .
            RUN dotnet publish "App/App.csproj" -c Release -f {{targetFramework}} -o /app/publish
            """;
    }

    private static string CreateProgramCs() =>
        """
            namespace Altinn.App;

            internal static class Program
            {
                private static void Main()
                {
                }
            }
            """;

    private static string CreateLaunchSettings() =>
        """
            {
              "profiles": {
                "App": {
                  "commandName": "Project"
                }
              }
            }
            """ + Environment.NewLine;

    private static string CreateApplicationMetadata() =>
        """
            {
              "id": "ttd/test-app",
              "org": "ttd",
              "title": {
                "nb": "Test app"
              },
              "dataTypes": [
                {
                  "id": "default",
                  "taskId": "Task_1",
                  "appLogic": {
                    "classRef": "Altinn.App.Models.Model"
                  }
                }
              ]
            }
            """;

    private static string CreateProcessFile() =>
        """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
              <bpmn:process id="Process_1">
                <bpmn:startEvent id="StartEvent_1" />
                <bpmn:task id="Task_1" />
                <bpmn:endEvent id="EndEvent_1" />
              </bpmn:process>
            </bpmn:definitions>
            """;

    private static string CreateLayoutSets() =>
        """
            {
              "sets": [
                {
                  "id": "form",
                  "dataType": "default",
                  "tasks": [
                    "Task_1"
                  ]
                }
              ]
            }
            """;

    private static string CreateLayout() =>
        """
            {
              "$schema": "https://altinncdn.no/schemas/json/layout/layout.schema.v1.json",
              "data": {
                "layout": []
              }
            }
            """;
}
