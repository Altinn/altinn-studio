using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Maskinporten;
using Designer.Tests.Controllers.ControlPlaneController.Base;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.ControlPlaneController;

public class HealthTests : ControlPlaneControllerTestsBase<HealthTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string VersionPrefix = "/designer/api/v1/controlplane/health";
    private const string MaskinportenTestScheme = "MaskinportenTest";

    public HealthTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private HttpClient CreateClientWithMaskinportenAuth(bool shouldAuthenticate, string scope = null)
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
                services.AddAuthentication(MaskinportenTestScheme)
                    .AddScheme<MaskinportenTestAuthOptions, MaskinportenTestAuthHandler>(
                        MaskinportenTestScheme,
                        options =>
                        {
                            options.ShouldAuthenticate = shouldAuthenticate;
                            options.Scope = scope;
                            options.TimeProvider = System.TimeProvider.System;
                        });

                services.AddAuthorizationBuilder()
                    .AddPolicy(
                        MaskinportenConstants.AuthorizationPolicy,
                        policy =>
                        {
                            policy.AddAuthenticationSchemes(MaskinportenTestScheme);
                            policy.RequireAuthenticatedUser();
                            policy.RequireAssertion(context =>
                            {
                                var scopeClaim = context.User.FindFirst(MaskinportenConstants.ScopeClaimType);
                                if (scopeClaim is null)
                                {
                                    return false;
                                }

                                string[] scopes = scopeClaim.Value.Split(' ', System.StringSplitOptions.RemoveEmptyEntries);
                                return scopes.Contains(RequiredScope);
                            });
                        });
            });
        }).CreateDefaultClient(new CookieContainerHandler());
    }

    [Fact]
    public async Task Health_ReturnsUnauthorized_WhenNoToken()
    {
        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: false);
        using var response = await client.GetAsync(VersionPrefix);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Health_ReturnsForbidden_WhenTokenHasWrongScope()
    {
        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: true, scope: "wrong:scope");
        using var response = await client.GetAsync(VersionPrefix);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Health_ReturnsOk_WhenTokenHasCorrectScope()
    {
        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: true, scope: RequiredScope);
        using var response = await client.GetAsync(VersionPrefix);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Health_ReturnsOk_WhenTokenHasCorrectScopeAmongMultiple()
    {
        using var client = CreateClientWithMaskinportenAuth(
            shouldAuthenticate: true,
            scope: $"some:other:scope {RequiredScope} another:scope");
        using var response = await client.GetAsync(VersionPrefix);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
