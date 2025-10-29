#nullable disable
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

public class GetPermissions : DesignerEndpointsTestsBase<GetPermissions>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/deployments";
    private readonly Mock<IGitea> _giteaMock;

    public GetPermissions(WebApplicationFactory<Program> factory) : base(factory)
    {
        _giteaMock = new Mock<IGitea>();
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddSingleton(_ => _giteaMock.Object);
    }

    [Theory]
    [InlineData("ttd", "issue-6094")]
    public async Task GetPermissions_ToDeploymentsEnvironments_UserHasTeam_ReturnTeams(string org, string app)
    {
        // Arrange
        string uri = $"{VersionPrefix(org, app)}/permissions";
        List<Team> teamWithDeployAccess = new()
        {
            new Team { Name = "Deploy-TestEnv", Organization = new Organization { Username = "ttd" } }
        };
        _giteaMock.Setup(g => g.GetTeams()).ReturnsAsync(teamWithDeployAccess);

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

        // Act
        HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);
        string responseString = await res.Content.ReadAsStringAsync();
        List<string> permittedEnvironments = JsonSerializer.Deserialize<List<string>>(responseString, JsonSerializerOptions);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Single(permittedEnvironments);
        Assert.Equal("TestEnv", permittedEnvironments[0]);
    }

    [Theory]
    [InlineData("ttd", "issue-6094")]
    public async Task GetPermissions_ToDeploymentsEnvironments_UserHasNoTeam_ReturnEmptyList(string org, string app)
    {
        // Arrange
        string uri = $"{VersionPrefix(org, app)}/permissions";

        List<Team> emptyTeam = new();
        _giteaMock.Setup(g => g.GetTeams()).ReturnsAsync(emptyTeam);

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

        // Act
        HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);
        string responseString = await res.Content.ReadAsStringAsync();
        List<string> permittedEnvironments = JsonSerializer.Deserialize<List<string>>(responseString, JsonSerializerOptions);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Empty(permittedEnvironments);
    }
}
