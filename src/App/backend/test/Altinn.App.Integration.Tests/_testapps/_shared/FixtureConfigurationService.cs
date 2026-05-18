using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyModel;

#nullable enable

namespace TestApp.Shared;

public sealed class FixtureConfigurationService
{
    private readonly object _lock = new();
    private string? _configPath;

    public FixtureConfiguration? Config { get; private set; }

    public static FixtureConfigurationService Instance { get; } = new();

    // Event fired when configuration changes
    public event Action? ConfigurationChanged;

    private FixtureConfigurationService() { }

    public void Initialize()
    {
        var configPath = Environment.GetEnvironmentVariable("AppFixture__ConfigurationPath");
        if (string.IsNullOrWhiteSpace(configPath))
            throw new InvalidOperationException("Missing AppFixture__ConfigurationPath");

        _configPath = configPath;
        Reload();
    }

    public void Reload()
    {
        var configPath = _configPath ?? throw new InvalidOperationException("Fixture configuration not initialized");
        var config = JsonSerializer.Deserialize<FixtureConfiguration>(File.ReadAllText(configPath));
        if (config is null)
            throw new InvalidOperationException($"Invalid fixture configuration in {configPath}");
        Apply(config);
    }

    public void Configure(IServiceCollection services, IConfiguration configuration, IWebHostEnvironment env)
    {
        // Through "_scenarios" we can override/inject both configuration
        // and code that is specific to a test scenario.
        // This allows us to run the same generated app with slightly different
        // configurations and code.
        var config = Config ?? throw new InvalidOperationException("Fixture configuration not initialized");

        services.AddTracingServices();

        var scenario = config.AppScenario ?? "default";
        if (scenario != "default")
        {
            SyncScenarioConfig(env.ContentRootPath);

            var scenarioOverridePath = Path.Join(env.ContentRootPath, "scenario-overrides", "services");
            if (Directory.Exists(scenarioOverridePath))
            {
                try
                {
                    var csFiles = Directory.GetFiles(scenarioOverridePath, "*.cs", SearchOption.AllDirectories);
                    if (!csFiles.Any())
                        return;

                    var compiledAssembly = CompileScenarioServices(csFiles);
                    if (compiledAssembly is not null)
                    {
                        RegisterServicesFromAssembly(services, compiledAssembly);
                    }
                    else
                    {
                        SnapshotLogger.LogInitError("Failed to compile scenario services assembly");
                    }
                }
                catch (Exception ex)
                {
                    SnapshotLogger.LogInitError($"Failed to register scenario services: {ex.Message}");
                }
            }
        }
    }

    public void Apply(FixtureConfiguration config)
    {
        lock (_lock)
        {
            if (config == Config)
            {
                return;
            }

            Config = config;
            ConfigurationChanged?.Invoke();
        }
    }

    private static void SyncScenarioConfig(string contentRootPath)
    {
        var scenarioConfigPath = Path.Join(contentRootPath, "scenario-overrides", "config");
        if (!Directory.Exists(scenarioConfigPath))
        {
            SnapshotLogger.LogInitWarning($"No scenario config directory found at {scenarioConfigPath}");
            return;
        }
        var targetConfigPath = Path.Join(contentRootPath, "config");

        foreach (var file in Directory.GetFiles(scenarioConfigPath, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(scenarioConfigPath, file);
            var targetFile = Path.Join(targetConfigPath, relativePath);
            var targetDir = Path.GetDirectoryName(targetFile);

            if (!string.IsNullOrEmpty(targetDir) && !Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            File.Copy(file, targetFile, overwrite: true);
        }
    }

    private static Assembly? CompileScenarioServices(string[] csFiles)
    {
        var sourceTexts = csFiles.Select(file => File.ReadAllText(file)).ToList();
        if (!sourceTexts.Any())
            return null;

        var references = DependencyContext
            .Default!.CompileLibraries.SelectMany(cl => cl.ResolveReferencePaths())
            .Select(asm => MetadataReference.CreateFromFile(asm))
            .ToArray();

        var compilation = CSharpCompilation.Create(
            assemblyName: $"Altinn.Application.For.IntegrationTesting.Scenario",
            syntaxTrees: sourceTexts.Select(source => CSharpSyntaxTree.ParseText(source)),
            references: references,
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

        using var memoryStream = new MemoryStream();
        var emitResult = compilation.Emit(memoryStream);

        if (!emitResult.Success)
        {
            var errors = string.Join("\n", emitResult.Diagnostics.Select(d => d.ToString()));
            SnapshotLogger.LogInitError($"Compilation failed:\n{errors}");
            return null;
        }

        memoryStream.Seek(0, SeekOrigin.Begin);
        return AssemblyLoadContext.Default.LoadFromStream(memoryStream);
    }

    private static int RegisterServicesFromAssembly(IServiceCollection services, Assembly assembly)
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
                method.Invoke(null, [services]);
                registeredCount++;
            }
        }
        return registeredCount;
    }
}
