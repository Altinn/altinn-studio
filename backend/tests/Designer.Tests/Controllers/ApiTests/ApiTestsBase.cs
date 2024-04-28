using System;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Net.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SharedResources.Tests;
using static Designer.Tests.Utils.TestSetupUtils;

namespace Designer.Tests.Controllers.ApiTests;

/// <summary>
/// Base class for testing controller endpoints.
/// </summary>
/// <typeparam name="TControllerTest">Controller test class type. Used for generating fluent tests.</typeparam>
[ExcludeFromCodeCoverage]
public abstract class ApiTestsBase<TControllerTest> : FluentTestsBase<TControllerTest>, IDisposable where TControllerTest : class
{
    private HttpClient _httpClient;
    protected ITestOutputHelper OutputHelper;

    /// <summary>
    /// HttpClient that should call endpoints of a provided controller.
    /// </summary>
    protected HttpClient HttpClient
    {
        get
        {
            return _httpClient ??= GetTestClient();
        }
    }

    /// <summary>
    /// When overridden tests services will be configured.
    /// </summary>
    protected abstract void ConfigureTestServices(IServiceCollection services);

    protected Action<IServiceCollection> ConfigureTestForSpecificTest { get; set; } = delegate { };

    /// <summary>
    /// Location of the assembly of the executing unit test.
    /// </summary>
    protected static string UnitTestsFolder =>
        Path.GetDirectoryName(new Uri(typeof(TControllerTest).Assembly.Location).LocalPath);

    /// <summary>
    /// Location of the assembly of the executing unit test.
    /// </summary>
    protected virtual string TestRepositoriesLocation =>
        Path.Combine(UnitTestsFolder, "..", "..", "..", "_TestData", "Repositories");

    protected readonly WebApplicationFactory<Program> Factory;

    protected ApiTestsBase(WebApplicationFactory<Program> factory, ITestOutputHelper output)
    {
        OutputHelper = output;
        Factory = factory;
        SetupDirtyHackIfLinux();
    }

    /// <summary>
    /// Method that creates HttpClient.
    /// Default implementation creates authorized http client with
    /// added xsrf cookie using <see cref="ApiTestsAuthAndCookieDelegatingHandler"/>.
    /// </summary>
    protected virtual HttpClient GetTestClient()
    {
        string configPath = GetConfigPath();

        return Factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, conf) => { conf.AddJsonFile(configPath); });
            builder.ConfigureTestServices(ConfigureTestServices);
            builder.ConfigureServices(ConfigureTestForSpecificTest);
            builder.ConfigureLogging(ConfigureFakeLogging);
        }).CreateDefaultClient(new ApiTestsAuthAndCookieDelegatingHandler(), new CookieContainerHandler());
    }

    protected void ConfigureFakeLogging(ILoggingBuilder builder)
    {
        builder
            .ClearProviders()
            .AddFakeLogging(options =>
            {
                options.OutputSink = (message) => OutputHelper.WriteLine(message);
                options.OutputFormatter = log =>
                    $"[{ShortLogLevel(log.Level)}] {log.Category}:\n" +
                    $"{log.Message}{(log.Exception is not null ? "\n" : "")}\n{log.Exception}\n";
            });
    }

    private static string ShortLogLevel(LogLevel logLevel)
    {
        return logLevel switch
        {
            LogLevel.Trace => "trac",
            LogLevel.Debug => "debu",
            LogLevel.Information => "info",
            LogLevel.Warning => "warn",
            LogLevel.Error => "erro",
            LogLevel.Critical => "crit",
            LogLevel.None => "none",
            _ => "????",
        };
    }

    /// <summary>
    /// Override when want to build WebHost with non default appsettings.json
    /// </summary>
    /// <returns></returns>
    protected virtual string GetConfigPath()
    {
        string projectDir = Directory.GetCurrentDirectory();
        return Path.Combine(projectDir, "appsettings.json");
    }
    public void Dispose()
    {
        Dispose(true);
    }
    protected virtual void Dispose(bool disposing)
    {
    }
}
