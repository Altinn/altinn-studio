#nullable disable
using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using Designer.Tests.Fixtures;
using DotNet.Testcontainers.Builders;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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

    protected Action<IServiceCollection> ConfigureTestServicesForSpecificTest { get; set; } = delegate { };

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

    protected ApiTestsBase(WebApplicationFactory<Program> factory)
    {
        Factory = factory;
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Test");
        SetupDirtyHackIfLinux();
        InitializeJsonConfigOverrides();
    }

    /// <summary>
    /// Method that creates HttpClient.
    /// Default implementation creates authorized http client with
    /// added xsrf cookie using <see cref="ApiTestsAuthAndCookieDelegatingHandler"/>.
    /// </summary>
    protected virtual HttpClient GetTestClient()
    {
        string configPath = GetConfigPath();
        IConfiguration configuration = new ConfigurationBuilder()
            .AddJsonFile(configPath, false, false)
            .AddJsonStream(GenerateJsonOverrideConfig())
            .AddEnvironmentVariables()
            .Build();

        return Factory.WithWebHostBuilder(builder =>
        {
            builder.UseConfiguration(configuration);
            builder.ConfigureAppConfiguration((_, conf) =>
            {
                conf.AddJsonFile(configPath);
                conf.AddJsonStream(GenerateJsonOverrideConfig());
            });
            builder.ConfigureTestServices(ConfigureTestServices);
            builder.ConfigureTestServices(services =>
            {
                services.AddAuthentication(defaultScheme: TestAuthConstants.TestAuthenticationScheme)
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                        TestAuthConstants.TestAuthenticationScheme,
                        options => { options.TimeProvider = TimeProvider.System; });
                services.AddTransient<IAuthenticationSchemeProvider, TestSchemeProvider>();
            });
            builder.ConfigureServices(ConfigureTestServicesForSpecificTest);
        }).CreateDefaultClient(new ApiTestsAuthAndCookieDelegatingHandler(), new CookieContainerHandler());
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

    protected List<string> JsonConfigOverrides;

    private void InitializeJsonConfigOverrides()
    {
        JsonConfigOverrides =
        [
            $@"
              {{
                    ""OidcLoginSettings"": {{
                        ""ClientId"": ""{Guid.NewGuid()}"",
                        ""ClientSecret"": ""{Guid.NewGuid()}"",
                        ""Authority"": ""http://studio.localhost/repos/"",
                        ""Scopes"": [
                            ""openid"",
                            ""profile"",
                            ""write:activitypub"",
                            ""write:admin"",
                            ""write:issue"",
                            ""write:misc"",
                            ""write:notification"",
                            ""write:organization"",
                            ""write:package"",
                            ""write:repository"",
                            ""write:user""
                        ],
                        ""RequireHttpsMetadata"": false,
                        ""CookieExpiryTimeInMinutes"" : 59
                    }},
                    ""SchedulingSettings"": {{
                        ""UsePersistentStore"": false,
                        ""AddHostedService"": false
                    }}
              }}
            "
        ];
    }


    protected Stream GenerateJsonOverrideConfig()
    {
        var overrideJson = Newtonsoft.Json.Linq.JObject.Parse(JsonConfigOverrides.First());
        if (JsonConfigOverrides.Count > 1)
        {
            foreach (string jsonConfig in JsonConfigOverrides)
            {
                overrideJson.Merge(Newtonsoft.Json.Linq.JObject.Parse(jsonConfig), new Newtonsoft.Json.Linq.JsonMergeSettings
                {
                    MergeArrayHandling = Newtonsoft.Json.Linq.MergeArrayHandling.Union
                });
            }
        }
        string overrideJsonString = overrideJson.ToString();
        var configStream = new MemoryStream(Encoding.UTF8.GetBytes(overrideJsonString));
        configStream.Seek(0, SeekOrigin.Begin);
        return configStream;
    }
}
