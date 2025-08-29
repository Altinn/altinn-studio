using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.AnsattPortenController.Base;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.AnsattPortenController;

public class AuthStatusTest : AnsattPortenControllerTestsBase<AuthStatusTest>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix => "/designer/api/ansattporten/auth-status";

    // Setup unauthenticated http client
    protected override HttpClient GetTestClient()
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
            builder.ConfigureServices(ConfigureTestServicesForSpecificTest);
        }).CreateDefaultClient(new CookieContainerHandler());
    }

    public AuthStatusTest(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task AuthStatus_Should_ReturnFalse_IfNotAuthenticated()
    {
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, VersionPrefix);

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        AuthStatus authStatus = await response.Content.ReadAsAsync<AuthStatus>();
        Assert.False(authStatus.IsLoggedIn);
    }

    [Fact]
    public async Task AuthStatus_Should_ReturnTrue_IfAuthenticated()
    {
        // Setup test authentication
        ConfigureTestServicesForSpecificTest = services =>
        {
            services.AddAuthentication(defaultScheme: TestAuthConstants.TestAuthenticationScheme)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthConstants.TestAuthenticationScheme, options => { options.TimeProvider = TimeProvider.System; });
            services.AddTransient<IAuthenticationSchemeProvider, TestSchemeProvider>();
        };

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, VersionPrefix);

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        AuthStatus authStatus = await response.Content.ReadAsAsync<AuthStatus>();
        Assert.True(authStatus.IsLoggedIn);
    }
}
