using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using System.Threading;
using Altinn.App.Api.Extensions;
using Altinn.App.Api.Helpers;
using Altinn.App.Logic;
using BasicApp;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;

// ###########################################################################
// Custom code to make integration test harness work:
void RegisterCustomAppServices(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
{
    services.AddTracingServices();

    // Check for scenario-specific services
    // Through "_scenarios" we can override/inject both configuration
    // and code that is specific to a test scenario.
    // This allows us to run the same app container image with slightly different
    // configurations and code which is more efficient than having to create and build a whole other app/image.
    var scenario = config["TEST_SCENARIO"] ?? "default";
    SnapshotLogger.LogInfo($"Starting application with scenario: {scenario}");
    if (scenario != "default")
    {
        var scenarioOverridePath = Path.Combine(env.ContentRootPath, "scenario-overrides", "services");
        if (Directory.Exists(scenarioOverridePath))
        {
            RegisterScenarioServices(services, scenarioOverridePath);
        }
        else
        {
            SnapshotLogger.LogWarning(
                $"Scenario '{scenario}' specified but no services directory found at {scenarioOverridePath}"
            );
        }
    }
}

void CopyScenarioConfigOverrides()
{
    SnapshotLogger.LogInfo("Checking for scenario config overrides...");

    var scenarioConfigPath = "/App/scenario-overrides/config";
    if (Directory.Exists(scenarioConfigPath))
    {
        SnapshotLogger.LogInfo("Copying scenario config overrides...");
        var targetConfigPath = "/App/config";

        foreach (var file in Directory.GetFiles(scenarioConfigPath, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(scenarioConfigPath, file);
            var targetFile = Path.Combine(targetConfigPath, relativePath);
            var targetDir = Path.GetDirectoryName(targetFile);

            if (!string.IsNullOrEmpty(targetDir) && !Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            File.Copy(file, targetFile, overwrite: true);
            SnapshotLogger.LogInfo($"'{relativePath}' -> '{Path.Combine("config", relativePath)}'");
        }
        SnapshotLogger.LogInfo("Config overrides applied.");
    }
}

void RegisterScenarioServices(IServiceCollection services, string scenarioServicesPath)
{
    try
    {
        SnapshotLogger.LogInfo($"Scanning for scenario services in: {scenarioServicesPath}");
        var csFiles = Directory.GetFiles(scenarioServicesPath, "*.cs", SearchOption.AllDirectories);
        if (!csFiles.Any())
        {
            SnapshotLogger.LogInfo("No .cs files found in scenario services path");
            return;
        }

        SnapshotLogger.LogInfo($"Found {csFiles.Length} .cs file(s) for compilation");
        foreach (var file in csFiles)
        {
            SnapshotLogger.LogInfo($"  - {Path.GetFileName(file)}");
        }

        var compiledAssembly = CompileScenarioServices(csFiles);
        if (compiledAssembly != null)
        {
            SnapshotLogger.LogInfo(
                $"Successfully compiled scenario services assembly: {compiledAssembly.GetName().Name}"
            );
            var serviceCount = RegisterServicesFromAssembly(services, compiledAssembly);
            SnapshotLogger.LogInfo($"Registered {serviceCount} service method(s) from scenario assembly");
        }
        else
        {
            SnapshotLogger.LogError("Failed to compile scenario services assembly");
        }
    }
    catch (Exception ex)
    {
        SnapshotLogger.LogWarning($"Failed to register scenario services: {ex.Message}");
    }
}

Assembly? CompileScenarioServices(string[] csFiles)
{
    var sourceTexts = csFiles.Select(file => File.ReadAllText(file)).ToList();
    if (!sourceTexts.Any())
        return null;

    var references = new[]
    {
        MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
        MetadataReference.CreateFromFile(typeof(IServiceCollection).Assembly.Location),
        MetadataReference.CreateFromFile(
            AppDomain
                .CurrentDomain.GetAssemblies()
                .First(a => a.GetName().Name == "Altinn.Platform.Storage.Interface")
                .Location
        ),
        MetadataReference.CreateFromFile(
            AppDomain
                .CurrentDomain.GetAssemblies()
                .First(a => a.GetName().Name == "Microsoft.Extensions.DependencyInjection.Abstractions")
                .Location
        ),
        MetadataReference.CreateFromFile(
            AppDomain.CurrentDomain.GetAssemblies().First(a => a.GetName().Name == "Altinn.App.Core").Location
        ),
    };

    var compilation = CSharpCompilation.Create(
        assemblyName: $"ScenarioServices_{Guid.NewGuid():N}",
        syntaxTrees: sourceTexts.Select(source => CSharpSyntaxTree.ParseText(source)),
        references: references,
        options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
    );

    using var memoryStream = new MemoryStream();
    var emitResult = compilation.Emit(memoryStream);

    if (!emitResult.Success)
    {
        var errors = string.Join("\n", emitResult.Diagnostics.Select(d => d.ToString()));
        SnapshotLogger.LogError($"Compilation failed:\n{errors}");
        return null;
    }

    memoryStream.Seek(0, SeekOrigin.Begin);
    return AssemblyLoadContext.Default.LoadFromStream(memoryStream);
}

int RegisterServicesFromAssembly(IServiceCollection services, Assembly assembly)
{
    int registeredCount = 0;
    foreach (var type in assembly.GetTypes())
    {
        var method = type.GetMethod("RegisterServices", BindingFlags.Public | BindingFlags.Static);
        if (
            method != null
            && method.GetParameters().Length == 1
            && method.GetParameters()[0].ParameterType == typeof(IServiceCollection)
        )
        {
            SnapshotLogger.LogInfo($"  Invoking RegisterServices method from type: {type.FullName}");
            method.Invoke(null, new object[] { services });
            registeredCount++;
        }
    }
    return registeredCount;
}

void WaitForPortConfiguration()
{
    // The AppFixture injects this data as soon as the app is in the `Starting` state.
    // Host port is randomly selected so it is not known before the container starts.
    var portConfigFile = "/App/port-config/ports.json";
    var portConfigDir = Path.GetDirectoryName(portConfigFile);
    var portConfigFileName = Path.GetFileName(portConfigFile);
    var timeout = TimeSpan.FromSeconds(10);

    SnapshotLogger.LogInfo($"Waiting for port configuration at {portConfigFile}...");

    using var resetEvent = new ManualResetEventSlim(false);
    using var watcher = new FileSystemWatcher(portConfigDir, portConfigFileName);

    watcher.Created += (sender, e) => resetEvent.Set();
    watcher.Changed += (sender, e) => resetEvent.Set();
    watcher.EnableRaisingEvents = true;

    // Check if file already exists after setting up the watcher to avoid race condition
    if (File.Exists(portConfigFile))
    {
        LoadPortConfiguration(portConfigFile);
        return;
    }

    if (!resetEvent.Wait(timeout))
        throw new TimeoutException($"Port configuration not available after {timeout.TotalSeconds} seconds");

    LoadPortConfiguration(portConfigFile);
}

void LoadPortConfiguration(string portConfigFile)
{
    try
    {
        var portConfigJson = File.ReadAllText(portConfigFile);
        var portConfig = JsonSerializer.Deserialize<JsonElement>(portConfigJson);

        if (portConfig.TryGetProperty("externalAppBaseUrl", out var baseUrlElement))
        {
            var externalAppBaseUrl = baseUrlElement.GetString();
            Environment.SetEnvironmentVariable("GeneralSettings__ExternalAppBaseUrl", externalAppBaseUrl);
            SnapshotLogger.LogInfo($"Port configuration loaded");
        }
    }
    catch (Exception ex)
    {
        SnapshotLogger.LogWarning($"Failed to read port configuration: {ex.Message}");
    }
}

CopyScenarioConfigOverrides();

WaitForPortConfiguration();

// ###########################################################################

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

ConfigureServices(builder.Services, builder.Configuration);

ConfigureWebHostBuilder(builder.WebHost);

WebApplication app = builder.Build();

Configure();

app.Run();

void ConfigureServices(IServiceCollection services, IConfiguration config)
{
    services.AddAltinnAppControllersWithViews();

    // Register custom implementations for this application
    RegisterCustomAppServices(services, config, builder.Environment);

    // Register services required to run this as an Altinn application
    services.AddAltinnAppServices(config, builder.Environment);

    // Add Swagger support (Swashbuckle)
    services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn App Api", Version = "v1" });
        StartupHelper.IncludeXmlComments(c.IncludeXmlComments);
    });
}

void ConfigureWebHostBuilder(IWebHostBuilder builder)
{
    builder.ConfigureAppWebHost(args);
}

void Configure()
{
    string applicationId = StartupHelper.GetApplicationId();
    if (!string.IsNullOrEmpty(applicationId))
    {
        app.UseSwagger(o => o.RouteTemplate = applicationId + "/swagger/{documentName}/swagger.json");

        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint($"/{applicationId}/swagger/v1/swagger.json", "Altinn App API");
            c.RoutePrefix = applicationId + "/swagger";
        });
    }
    app.UseAltinnAppCommonConfiguration();

    // #########################################################################
    // Custom middleware not included in app template
    app.MapGet("/health", () => "Healthy");
    // #########################################################################
}
