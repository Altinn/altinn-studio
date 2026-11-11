using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ReleaseLookupController;

public class LookupTests
    : DbDesignerEndpointsTestsBase<LookupTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>
{
    private const string Uri = "/designer/api/v1/releases/lookup";

    // The caller is not a member of any org, which the lookup does not require.
    private readonly Mock<IUserOrganizationService> _userOrganizationServiceMock = new();
    private readonly string _org = $"org-{Guid.NewGuid():N}";
    private readonly string _app = $"app-{Guid.NewGuid():N}";

    public LookupTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture)
    {
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(It.IsAny<string>())).ReturnsAsync(false);
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfAnyOrganization()).ReturnsAsync(false);
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_userOrganizationServiceMock.Object);
    }

    [Fact]
    public async Task Lookup_UserNotMemberOfOrg_ReturnsSucceededReleasesAndLeavesOutTheRest()
    {
        ReleaseEntity succeeded = await AddRelease("1.0.0", BuildResult.Succeeded);
        await AddRelease("2.0.0", BuildResult.Failed);

        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(
            Uri,
            new[] { Item("1.0.0"), Item("2.0.0"), Item("3.0.0") }
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await ReadResult(response);
        ReleaseLookupResponse actual = Assert.Single(result);
        Assert.Equal(_org, actual.Org);
        Assert.Equal(_app, actual.App);
        Assert.Equal("1.0.0", actual.Version);
        Assert.Equal(succeeded.TargetCommitish, actual.Commit);
        Assert.Equal(succeeded.Created, actual.Created, TimeSpan.FromMilliseconds(1));
    }

    [Fact]
    public async Task Lookup_RepeatedItems_ReturnsOneResult()
    {
        ReleaseEntity succeeded = await AddRelease("1.0.0", BuildResult.Succeeded);

        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(
            Uri,
            new[] { Item("1.0.0"), Item("1.0.0") }
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        ReleaseLookupResponse actual = Assert.Single(await ReadResult(response));
        Assert.Equal(succeeded.TargetCommitish, actual.Commit);
    }

    [Fact]
    public async Task Lookup_EmptyArray_ReturnsEmptyArray()
    {
        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(Uri, Array.Empty<ReleaseLookupRequest>());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await ReadResult(response));
    }

    [Fact]
    public async Task Lookup_MoreItemsThanLimit_ReturnsBadRequest()
    {
        var items = Enumerable
            .Range(0, Altinn.Studio.Designer.Controllers.ReleaseLookupController.MaxItems + 1)
            .Select(i => Item($"1.0.{i}"))
            .ToArray();

        // Sent buffered, because the test server fails to send a streamed body of this size.
        using var content = new StringContent(JsonSerializer.Serialize(items), Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await HttpClient.PostAsync(Uri, content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("The limit is 1000", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("-ttd", "app", "1.0.0")]
    [InlineData("ttd", "App", "1.0.0")]
    [InlineData("ttd", "app;drop", "1.0.0")]
    [InlineData("ttd", "app", "")]
    public async Task Lookup_InvalidItem_ReturnsBadRequest(string org, string app, string version)
    {
        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(
            Uri,
            new[] { Item("1.0.0"), new ReleaseLookupRequest(org, app, version) }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("[1]", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Lookup_AnonymousCaller_ReturnsUnauthorized()
    {
        using HttpClient anonymousClient = CreateTestClientWithAuthHandler<UnauthenticatedTestAuthHandler>();

        using HttpResponseMessage response = await anonymousClient.PostAsJsonAsync(Uri, new[] { Item("1.0.0") });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Lookup_ApiKeyCallerWithoutAntiforgeryToken_ReturnsOk()
    {
        ReleaseEntity succeeded = await AddRelease("1.0.0", BuildResult.Succeeded);
        using HttpClient apiKeyClient = CreateTestClientWithAuthHandler<ApiKeyTestAuthHandler>();

        using HttpResponseMessage response = await apiKeyClient.PostAsJsonAsync(Uri, new[] { Item("1.0.0") });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(succeeded.TargetCommitish, Assert.Single(await ReadResult(response)).Commit);
    }

    [Fact]
    public async Task Lookup_SessionCallerWithoutAntiforgeryToken_ReturnsBadRequest()
    {
        using HttpClient sessionClient = CreateTestClientWithAuthHandler<TestAuthHandler>();

        using HttpResponseMessage response = await sessionClient.PostAsJsonAsync(Uri, new[] { Item("1.0.0") });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private ReleaseLookupRequest Item(string version) => new(_org, _app, version);

    private async Task<ReleaseEntity> AddRelease(string tagName, BuildResult buildResult)
    {
        ReleaseEntity release = EntityGenerationUtils.Release.GenerateReleaseEntity(
            _org,
            _app,
            tagname: tagName,
            targetCommitish: Guid.NewGuid().ToString("N"),
            buildResult: buildResult
        );
        await DesignerDbFixture.PrepareEntityInDatabase(release);
        return release;
    }

    private async Task<List<ReleaseLookupResponse>> ReadResult(HttpResponseMessage response)
    {
        string body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<ReleaseLookupResponse>>(body, JsonSerializerOptions);
    }
}
