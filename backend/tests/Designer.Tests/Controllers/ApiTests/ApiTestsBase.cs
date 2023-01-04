using System;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Net.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SharedResources.Tests;
using Xunit;
using static Designer.Tests.Utils.TestSetupUtils;

namespace Designer.Tests.Controllers.ApiTests;

/// <summary>
/// Base class for testing controller endpoints.
/// </summary>
/// <typeparam name="TController">Provided controller type.</typeparam>
/// <typeparam name="TControllerTest">Controller test class type. Used for generating fluent tests.</typeparam>
[ExcludeFromCodeCoverage]
public abstract class ApiTestsBase<TController, TControllerTest> : FluentTestsBase<TControllerTest>,
    IClassFixture<WebApplicationFactory<TController>>
    where TController : ControllerBase
    where TControllerTest : class
{
    /// <summary>
    /// HttpClient that should call endpoints of a provided controller.
    /// </summary>
    protected Lazy<HttpClient> HttpClient { get; }

    /// <summary>
    /// When overridden tests services will be configured.
    /// </summary>
    protected abstract void ConfigureTestServices(IServiceCollection services);

    /// <summary>
    /// Location of the assembly of the executing unit test.
    /// </summary>
    protected static string UnitTestsFolder =>
        Path.GetDirectoryName(new Uri(typeof(TControllerTest).Assembly.Location).LocalPath);

    /// <summary>
    /// Location of the assembly of the executing unit test.
    /// </summary>
    protected static string TestRepositoriesLocation =>
        Path.Combine(UnitTestsFolder, "..", "..", "..", "_TestData", "Repositories");

    private readonly WebApplicationFactory<TController> _factory;

    protected ApiTestsBase(WebApplicationFactory<TController> factory)
    {
        _factory = factory;
        HttpClient = new Lazy<HttpClient>(GetTestClient);
        SetupDirtyHackIfLinux();
    }

    /// <summary>
    /// Method that creates HttpClient.
    /// Default implementation creates authorized http client with
    /// added xsrf cookie using <see cref="ApiTestsAuthAndCookieDelegatingHandler"/>.
    /// </summary>
    protected virtual HttpClient GetTestClient()
    {
        var configPath = GetConfigPath();

        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, conf) => { conf.AddJsonFile(configPath); });

            builder.ConfigureTestServices(ConfigureTestServices);
        }).CreateDefaultClient(new ApiTestsAuthAndCookieDelegatingHandler(), new CookieContainerHandler());
        return client;
    }

    /// <summary>
    /// Override when want to build WebHost with non default appsettings.json
    /// </summary>
    /// <returns></returns>
    protected virtual string GetConfigPath()
    {
        var projectDir = Directory.GetCurrentDirectory();
        return Path.Combine(projectDir, "appsettings.json");
    }
}
