#nullable enable
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Infrastructure.StudioOidc;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers;

public class MockportenEndpointsTests(WebApplicationFactory<Program> factory)
    : ApiTestsBase<MockportenEndpointsTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    protected override HttpClient GetTestClient() => CreateTestClientWithAuthHandler<MockportenTestHandler>();

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        var gitea = new Mock<IGiteaClient>(MockBehavior.Strict);
        gitea
            .Setup(client => client.GetUserOrganizations())
            .ReturnsAsync([
                new Organization { Username = "ttd", Id = 2 },
                new Organization { Username = "other", Id = 3 },
            ]);
        gitea
            .Setup(client => client.GetUserRepos())
            .ReturnsAsync([
                new Repository
                {
                    Name = "test-app",
                    Owner = new User { Login = "ttd" },
                },
                new Repository
                {
                    Name = "other-app",
                    Owner = new User { Login = "other" },
                },
            ]);
        services.AddSingleton(gitea.Object);
    }

    [Theory]
    [InlineData("/designer/api/repos/org/other")]
    [InlineData("/designer/api/v1/user/api-keys")]
    [InlineData("/designer/api/user/org-permissions/other")]
    public async Task ForbiddenEndpointsDoNotReachBackingServices(string path)
    {
        using var response = await HttpClient.GetAsync(path);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task OrganizationsOnlyIncludesTtd()
    {
        var organizations = await HttpClient.GetFromJsonAsync<List<Organization>>("/designer/api/orgs");
        Assert.Equal("ttd", Assert.Single(organizations!).Username);
    }

    [Fact]
    public async Task RepositoriesOnlyIncludesTtd()
    {
        var repositories = await HttpClient.GetFromJsonAsync<List<Repository>>("/designer/api/user/repos");
        Assert.Equal("test-app", Assert.Single(repositories!).Name);
    }

    [Fact]
    public async Task UserInfoIdentifiesSessionForGiteaProxy()
    {
        var user = await HttpClient.GetFromJsonAsync<UserInfoResponse>("/designer/api/v1/studio-oidc/userinfo");
        Assert.Equal("mockporten", user!.AuthenticationProvider);
    }

    [Fact]
    public async Task DisabledProviderCannotBeSelected()
    {
        using var response = await HttpClient.GetAsync("/Login?provider=mockporten");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}

public class MockportenTestHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder
) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync() =>
        Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(MockportenTests.TestUser(), Scheme.Name)));
}
