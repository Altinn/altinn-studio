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

namespace Designer.Tests.GiteaIntegrationTests;

[Trait("Category", "GiteaIntegrationTest")]
[Collection(nameof(GiteaIntegrationTestsCollection))]
public abstract class GiteaIntegrationTestsBase<TControllerTest> : ApiTestsBase<TControllerTest>
    where TControllerTest : class
{
    protected readonly GiteaFixture GiteaFixture;

    protected string CreatedFolderPath { get; set; }

    private CookieContainer CookieContainer { get; } = new();

    /// On some systems path too long error occurs if repo is nested deep in file system.
    protected override string TestRepositoriesLocation =>
        Path.Combine(Path.GetTempPath(), "altinn", "tests", "repos");


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

        var directory = new DirectoryInfo(directoryPath)
        {
            Attributes = FileAttributes.Normal
        };

        foreach (var info in directory.GetFileSystemInfos("*", SearchOption.AllDirectories))
        {
            info.Attributes = FileAttributes.Normal;
        }

        directory.Delete(true);
    }

    protected sealed override void ConfigureTestServices(IServiceCollection services)
    {

    }

    protected GiteaIntegrationTestsBase(GiteaWebAppApplicationFactoryFixture<Program> factory, GiteaFixture giteaFixture, SharedDesignerHttpClientProvider sharedDesignerHttpClientProvider) : base(factory)
    {

        GiteaFixture = giteaFixture;
        _sharedDesignerHttpClientProvider = sharedDesignerHttpClientProvider;

    }

    private readonly SharedDesignerHttpClientProvider _sharedDesignerHttpClientProvider;

    // Only ones per collection the http client will be created and it will be used for all integration tests
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
            .AddJsonStream(GenerateGiteaOverrideConfigStream())
            .AddEnvironmentVariables()
            .Build();

        Factory.WithWebHostBuilder(builder =>
        {
            builder.UseConfiguration(configuration);
            builder.ConfigureAppConfiguration((t, conf) =>
            {
                conf.AddJsonFile(configPath, false, false);
                conf.AddJsonStream(GenerateGiteaOverrideConfigStream());
                conf.AddEnvironmentVariables();
            });

            builder.ConfigureTestServices(ConfigureTestServices);
        }).CreateDefaultClient();

        _sharedDesignerHttpClientProvider.SharedHttpClient =
            new HttpClient(new GiteaAuthDelegatingHandler()
            {
                InnerHandler = new CookieContainerHandler(CookieContainer)
                {
                    InnerHandler = new HttpClientHandler { AllowAutoRedirect = false, }
                }
            })
            { BaseAddress = new Uri(TestUrlsProvider.Instance.DesignerUrl) };

        return _sharedDesignerHttpClientProvider.SharedHttpClient;
    }

    protected Stream GenerateGiteaOverrideConfigStream()
    {
        string reposLocation = new Uri(TestRepositoriesLocation).AbsolutePath;
        string templateLocationPath = Path.Combine(CommonDirectoryPath.GetSolutionDirectory().DirectoryPath, "..", "..", "App", "template", "src");
        string templateLocation = new Uri(templateLocationPath).AbsolutePath;
        string configOverride = $@"
              {{
                    ""ServiceRepositorySettings"": {{
                        ""RepositoryLocation"": ""{reposLocation}"",
                        ""ApiEndPointHost"": ""localhost"",
                        ""GiteaLoginUrl"": ""{TestUrlsProvider.Instance.GiteaUrl + "/user/login"}"",
                        ""ApiEndPoint"": ""{TestUrlsProvider.Instance.GiteaUrl + "/api/v1/"}"",
                        ""RepositoryBaseURL"": ""{TestUrlsProvider.Instance.GiteaUrl}""
                    }},
                    ""GeneralSettings"": {{
                        ""TemplateLocation"": ""{templateLocation}"",
                        ""DeploymentLocation"": ""{templateLocation}/deployment"",
                        ""AppLocation"": ""{templateLocation}/App""
                    }},
                    ""OidcLoginSettings"": {{
                        ""ClientId"": ""{GiteaFixture.OAuthApplicationClientId}"",
                        ""ClientSecret"": ""{GiteaFixture.OAuthApplicationClientSecret}"",
                        ""Authority"": ""{TestUrlsProvider.Instance.GiteaUrl}"",
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
        // Create repo with designer
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
            HttpMethod.Post,
            $"designer/api/repos/create-app");

        httpRequestMessage.Content = new StringContent(JsonSerializer.Serialize(
            new CreateAppRequest()
            {
                Org = org,
                Repository = repoName
            }),
            Encoding.UTF8,
            "application/json");

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
