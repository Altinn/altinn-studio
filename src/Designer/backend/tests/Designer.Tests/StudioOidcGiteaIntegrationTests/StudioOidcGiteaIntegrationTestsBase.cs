using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using DotNet.Testcontainers.Builders;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.StudioOidcGiteaIntegrationTests;

[Trait("Category", "StudioOidcGiteaIntegrationTest")]
[Collection(nameof(StudioOidcGiteaIntegrationTestsCollection))]
public abstract class StudioOidcGiteaIntegrationTestsBase<TControllerTest> : ApiTestsBase<TControllerTest>
    where TControllerTest : class
{
    protected readonly StudioOidcGiteaFixture GiteaFixture;

    protected string CreatedFolderPath { get; set; }

    private CookieContainer CookieContainer { get; } = new();

    protected override string TestRepositoriesLocation =>
        Path.Combine(Path.GetTempPath(), "altinn", "tests", "repos-oidc");

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing)
        {
            return;
        }

        DeleteDirectoryIfExists(CreatedFolderPath);
    }

    protected static void DeleteDirectoryIfExists(string directoryPath)
    {
        if (string.IsNullOrWhiteSpace(directoryPath) || !Directory.Exists(directoryPath))
        {
            return;
        }

        var directory = new DirectoryInfo(directoryPath) { Attributes = FileAttributes.Normal };

        foreach (var info in directory.GetFileSystemInfos("*", SearchOption.AllDirectories))
        {
            info.Attributes = FileAttributes.Normal;
        }

        directory.Delete(true);
    }

    protected sealed override void ConfigureTestServices(IServiceCollection services) { }

    protected StudioOidcGiteaIntegrationTestsBase(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory)
    {
        GiteaFixture = giteaFixture;
        _sharedDesignerHttpClientProvider = sharedDesignerHttpClientProvider;
    }

    private readonly StudioOidcSharedDesignerHttpClientProvider _sharedDesignerHttpClientProvider;

    protected override HttpClient GetTestClient()
    {
        if (_sharedDesignerHttpClientProvider.SharedHttpClient is not null)
        {
            return _sharedDesignerHttpClientProvider.SharedHttpClient;
        }

        string configPath = GetConfigPath();

        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Test");

        IConfiguration configuration = new ConfigurationBuilder()
            .AddJsonFile(configPath, false, false)
            .AddJsonStream(GenerateStudioOidcOverrideConfigStream())
            .AddEnvironmentVariables()
            .Build();

        var factoryFixture = (StudioOidcGiteaWebAppApplicationFactoryFixture<Program>)Factory;
        factoryFixture.DesignerUrl = GiteaFixture.DesignerUrl;

        Factory
            .WithWebHostBuilder(builder =>
            {
                builder.UseConfiguration(configuration);
                builder.ConfigureAppConfiguration(
                    (t, conf) =>
                    {
                        conf.AddJsonFile(configPath, false, false);
                        conf.AddJsonStream(GenerateStudioOidcOverrideConfigStream());
                        conf.AddEnvironmentVariables();
                    }
                );

                builder.ConfigureTestServices(ConfigureTestServices);
            })
            .CreateDefaultClient();

        _sharedDesignerHttpClientProvider.SharedHttpClient = new HttpClient(
            new StudioOidcAuthDelegatingHandler(GiteaFixture)
            {
                InnerHandler = new CookieContainerHandler(CookieContainer)
                {
                    InnerHandler = new HttpClientHandler { AllowAutoRedirect = false },
                },
            }
        )
        {
            BaseAddress = new Uri(GiteaFixture.DesignerUrl),
        };

        return _sharedDesignerHttpClientProvider.SharedHttpClient;
    }

    protected Stream GenerateStudioOidcOverrideConfigStream()
    {
        string reposLocation = new Uri(TestRepositoriesLocation).AbsolutePath;
        string templateLocationPath = Path.Combine(
            CommonDirectoryPath.GetSolutionDirectory().DirectoryPath,
            "..",
            "..",
            "App",
            "template",
            "src"
        );
        string templateLocation = new Uri(templateLocationPath).AbsolutePath;
        string configOverride =
            $@"
              {{
                    ""FeatureManagement"": {{
                        ""StudioOidc"": true
                    }},
                    ""ServiceRepositorySettings"": {{
                        ""RepositoryLocation"": ""{reposLocation}"",
                        ""ApiEndPointHost"": ""localhost"",
                        ""GiteaLoginUrl"": ""{GiteaFixture.GiteaUrl + "/user/login"}"",
                        ""ApiEndPoint"": ""{GiteaFixture.GiteaUrl + "/api/v1/"}"",
                        ""RepositoryBaseURL"": ""{GiteaFixture.GiteaUrl}""
                    }},
                    ""GeneralSettings"": {{
                        ""TemplateLocation"": ""{templateLocation}"",
                        ""DeploymentLocation"": ""{templateLocation}/deployment"",
                        ""AppLocation"": ""{templateLocation}/App""
                    }},
                    ""StudioOidcLoginSettings"": {{
                        ""ClientId"": ""fake-client"",
                        ""ClientSecret"": ""fake-secret"",
                        ""Authority"": ""{GiteaFixture.FakeAnsattportenUrl}"",
                        ""ValidIssuer"": ""{GiteaFixture.FakeAnsattportenUrl}"",
                        ""Scopes"": [
                            ""openid"",
                            ""profile""
                        ],
                        ""RequireHttpsMetadata"": false,
                        ""CookieExpiryTimeInMinutes"": 120
                    }},
                    ""DeveloperMappingSettings"": {{
                        ""PidHashSalt"": ""{StudioOidcGiteaFixture.PidHashSalt}""
                    }},
                    ""GiteaDbSettings"": {{
                        ""ConnectionString"": ""{GiteaFixture.DbConnectionString}""
                    }},
                    ""PostgreSQLSettings"": {{
                        ""ConnectionString"": ""{GiteaFixture.DbConnectionString}"",
                        ""DesignerDbPwd"": """"
                    }},
                    ""SchedulingSettings"": {{
                        ""UsePersistentScheduling"": true,
                        ""AddHostedService"": false
                    }}
              }}
            ";
        var configStream = new MemoryStream(Encoding.UTF8.GetBytes(configOverride));
        configStream.Seek(0, SeekOrigin.Begin);
        return configStream;
    }

    protected async Task CreateAppUsingDesigner(string org, string repoName)
    {
        CreatedFolderPath = $"{TestRepositoriesLocation}/{GiteaConstants.TestUser}/{org}/{repoName}";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
            HttpMethod.Post,
            $"designer/api/repos/create-app"
        );

        httpRequestMessage.Content = new StringContent(
            JsonSerializer.Serialize(new CreateAppRequest() { Org = org, Repository = repoName }),
            Encoding.UTF8,
            "application/json"
        );

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    protected static string GetCommitInfoJson(string text, string org, string repository) =>
        @$"{{
                    ""message"": ""{text}"",
                    ""org"": ""{org}"",
                    ""repository"": ""{repository}""
                }}";

    protected static string GenerateCommitJsonPayload(string text, string message) =>
        @$"{{
                 ""author"": {{
                     ""email"": ""{GiteaConstants.AdminEmail}"",
                     ""name"": ""{GiteaConstants.AdminUser}""
                 }},
                 ""committer"": {{
                     ""email"": ""{GiteaConstants.AdminEmail}"",
                     ""name"": ""{GiteaConstants.AdminUser}""
                 }},
                 ""content"": ""{Convert.ToBase64String(Encoding.UTF8.GetBytes(text))}"",
                 ""dates"": {{
                     ""author"": ""{DateTime.Now:O}"",
                     ""committer"": ""{DateTime.Now:O}""
                 }},
                 ""message"": ""{message}"",
                 ""signoff"": true
            }}";
}
