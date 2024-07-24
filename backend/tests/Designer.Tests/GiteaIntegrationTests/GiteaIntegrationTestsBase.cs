using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using DotNet.Testcontainers.Builders;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests;

[Trait("Category", "GiteaIntegrationTest")]
[Collection(nameof(GiteaCollection))]
public abstract class GiteaIntegrationTestsBase<TControllerTest> : ApiTestsBase<TControllerTest>
    where TControllerTest : class
{
    protected readonly GiteaFixture GiteaFixture;

    protected string CreatedFolderPath { get; set; }

    private CookieContainer CookieContainer { get; } = new CookieContainer();

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

    protected override void ConfigureTestServices(IServiceCollection services)
    {

    }

    protected GiteaIntegrationTestsBase(WebApplicationFactory<Program> factory, GiteaFixture giteaFixture) : base(factory)
    {

        GiteaFixture = giteaFixture;
    }

    protected override HttpClient GetTestClient()
    {
        string configPath = GetConfigPath();


        IConfiguration configuration = new ConfigurationBuilder()
            .AddJsonFile(configPath)
            .AddJsonStream(GenerateGiteaOverrideConfigStream())
            .Build();


        var oidcSettings = configuration.GetSection("OidcLoginSettings");

        var client = Factory.WithWebHostBuilder(builder =>
        {
            builder.UseConfiguration(configuration);
            builder.ConfigureAppConfiguration((t, conf) =>
            {
                conf.AddJsonFile(configPath);
                conf.AddJsonStream(GenerateGiteaOverrideConfigStream());
            });

            builder.ConfigureTestServices(ConfigureTestServices);
        }).CreateDefaultClient(new GiteaAuthDelegatingHandler(), new RedirectHandler()
        {
            InnerHandler = new HttpClientHandler
            {
                AllowAutoRedirect = false
            }
        }, new CookieContainerHandler(CookieContainer));


        var localhostHttpClient =
            new HttpClient(new GiteaAuthDelegatingHandler()
            {
                // InnerHandler = new RedirectHandler()
                // {
                    InnerHandler = new CookieContainerHandler(CookieContainer)
                    {
                        InnerHandler = new HttpClientHandler { AllowAutoRedirect = false, }
                    }
                // }
            }) { BaseAddress = new Uri("http://studio.localhost") };

        return localhostHttpClient;
    }

    protected Stream GenerateGiteaOverrideConfigStream()
    {
        string reposLocation = new Uri(TestRepositoriesLocation).AbsolutePath;
        string templateLocationPath = Path.Combine(CommonDirectoryPath.GetSolutionDirectory().DirectoryPath, "..", "testdata", "AppTemplates", "AspNet");
        string templateLocation = new Uri(templateLocationPath).AbsolutePath;
        string configOverride = $@"
              {{
                    ""ServiceRepositorySettings"": {{
                        ""RepositoryLocation"": ""{reposLocation}"",
                        ""ApiEndPointHost"": ""localhost"",
                        ""GiteaLoginUrl"": ""{GiteaFixture.GiteaUrl + "user/login"}"",
                        ""ApiEndPoint"": ""{GiteaFixture.GiteaUrl + "api/v1/"}"",
                        ""RepositoryBaseURL"": ""{GiteaFixture.GiteaUrl[..^1]}""
                    }},
                    ""GeneralSettings"": {{
                        ""TemplateLocation"": ""{templateLocation}"",
                        ""DeploymentLocation"": ""{templateLocation}/deployment"",
                        ""AppLocation"": ""{templateLocation}/App""
                    }},
                    ""OidcLoginSettings"": {{
                    ""ClientId"": ""{GiteaFixture.OAuthApplicationClientId}"",
                    ""ClientSecret"": ""{GiteaFixture.OAuthApplicationClientSecret}"",
                    ""Authority"": ""{GiteaFixture.GiteaUrl}"",
                    ""RedirectUri"": ""http://studio.localhost/signin-oidc"",
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
            $"designer/api/repos/create-app?org={org}&repository={repoName}");

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
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
