using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using LookupController = Altinn.Studio.Designer.Controllers.ReleaseLookupController;

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
    private readonly string _app = $"app-{Guid.NewGuid():N}"[..LookupController.MaxAppLength];

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
            Request(Item("1.0.0"), Item("2.0.0"), Item("3.0.0"))
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await ReadResult(response);
        ReleaseLookupResult actual = Assert.Single(result);
        Assert.Equal(_org, actual.Org);
        Assert.Equal(_app, actual.App);
        Assert.Equal("1.0.0", actual.Version);
        Assert.Equal(succeeded.TargetCommitish, actual.Commit);
        Assert.Equal(succeeded.Created, actual.Created, TimeSpan.FromMilliseconds(1));
    }

    // altinn-fleet tests its client against the same two files, so that the two cannot drift apart.
    [Fact]
    public async Task Lookup_ContractRequest_ReturnsContractResponse()
    {
        await AddContractRelease("app-one", "1.0.0", "1111111111111111111111111111111111111111", 5);
        await AddContractRelease("app-two", "2.0.0-rc.1", "2222222222222222222222222222222222222222", 6);
        string request = TestDataHelper.LoadDataFromEmbeddedResourceAsString(ContractResource("request.json"));
        string expected = TestDataHelper.LoadDataFromEmbeddedResourceAsString(ContractResource("response.json"));

        using var content = new StringContent(request, Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await HttpClient.PostAsync(Uri, content);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string actual = await response.Content.ReadAsStringAsync();
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(expected), JsonNode.Parse(actual)), actual);
    }

    [Fact]
    public async Task Lookup_RepeatedItems_ReturnsOneResult()
    {
        ReleaseEntity succeeded = await AddRelease("1.0.0", BuildResult.Succeeded);

        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(
            Uri,
            Request(Item("1.0.0"), Item("1.0.0"))
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        ReleaseLookupResult actual = Assert.Single(await ReadResult(response));
        Assert.Equal(succeeded.TargetCommitish, actual.Commit);
    }

    [Fact]
    public async Task Lookup_NoItems_ReturnsNoReleases()
    {
        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(Uri, Request());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await ReadResult(response));
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("""{"items":null}""")]
    public async Task Lookup_ItemsMissing_ReturnsBadRequest(string body)
    {
        using var content = new StringContent(body, Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await HttpClient.PostAsync(Uri, content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Lookup_MoreItemsThanLimit_ReturnsBadRequest()
    {
        var items = Enumerable.Range(0, LookupController.MaxItems + 1).Select(i => Item($"1.0.{i}")).ToArray();
        var request = Request(items);

        // Sent buffered, because the test server fails to send a streamed body of this size.
        using var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
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
            Request(Item("1.0.0"), new ReleaseLookupItem(org, app, version))
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("items[1]", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData(LookupController.MaxOrgLength + 1, 0, "")]
    [InlineData(40_000, 0, "!")]
    [InlineData(0, LookupController.MaxAppLength + 1, "")]
    [InlineData(0, 40_000, "!")]
    public async Task Lookup_OverlongOrgOrApp_ReturnsBadRequestQuickly(int orgLength, int appLength, string suffix)
    {
        // A long run of letters followed by a character the pattern rejects makes the app name's regular
        // expression backtrack for seconds per item, unless the length is checked first.
        string org = orgLength == 0 ? _org : new string('a', orgLength - suffix.Length) + suffix;
        string app = appLength == 0 ? _app : new string('a', appLength - suffix.Length) + suffix;
        var items = Enumerable.Range(0, 20).Select(i => new ReleaseLookupItem(org, app, $"1.0.{i}")).ToArray();
        using var content = new StringContent(
            JsonSerializer.Serialize(Request(items)),
            Encoding.UTF8,
            "application/json"
        );

        var stopwatch = Stopwatch.StartNew();
        using HttpResponseMessage response = await HttpClient.PostAsync(Uri, content);
        stopwatch.Stop();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("items[19]", await response.Content.ReadAsStringAsync());
        Assert.True(stopwatch.Elapsed < TimeSpan.FromSeconds(10), $"The request took {stopwatch.Elapsed}.");
    }

    [Theory]
    [InlineData("a\u0000b")]
    [InlineData("1.0.0\n")]
    [InlineData("1.0\t0")]
    [InlineData("1.0.0\u007f")]
    [InlineData("1.0 0")]
    [InlineData("1.0/0")]
    [InlineData("1.0.\u00e9")]
    [InlineData(".1.0")]
    [InlineData("-1.0")]
    public async Task Lookup_VersionThatCannotBeAnImageTag_ReturnsBadRequestForTheItem(string jsonVersion)
    {
        // The version is written as a JSON string literal, so that control characters reach the server as such.
        string body = $$"""{"items":[{"org":"{{_org}}","app":"{{_app}}","version":"{{jsonVersion}}"}]}""";
        using var content = new StringContent(body, Encoding.UTF8, "application/json");

        using HttpResponseMessage response = await HttpClient.PostAsync(Uri, content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("items[0].version", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Lookup_OverlongVersion_ReturnsBadRequest()
    {
        string version = new('1', LookupController.MaxVersionLength + 1);

        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(Uri, Request(Item(version)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("items[0].version", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("V1.0.0")]
    [InlineData("1.0.0_build")]
    public async Task Lookup_VersionOutsideTheCurrentCreateRuleButAnImageTag_FindsTheRelease(string version)
    {
        ReleaseEntity succeeded = await AddRelease(version, BuildResult.Succeeded);

        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(Uri, Request(Item(version)));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(succeeded.TargetCommitish, Assert.Single(await ReadResult(response)).Commit);
    }

    // The test server does not enforce request size limits, so this checks that the limit is on the action, for
    // Kestrel to enforce.
    [Fact]
    public void Lookup_HasRequestSizeLimit()
    {
        var limit = typeof(LookupController)
            .GetMethod(nameof(LookupController.Lookup))!
            .GetCustomAttributes(inherit: true)
            .OfType<IRequestSizeLimitMetadata>();

        Assert.Equal(LookupController.MaxRequestBytes, Assert.Single(limit).MaxRequestBodySize);
    }

    [Fact]
    public async Task Lookup_AnonymousCaller_ReturnsUnauthorized()
    {
        using HttpClient anonymousClient = CreateTestClientWithAuthHandler<UnauthenticatedTestAuthHandler>();

        using HttpResponseMessage response = await anonymousClient.PostAsJsonAsync(Uri, Request(Item("1.0.0")));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Lookup_ApiKeyCallerWithoutAntiforgeryToken_ReturnsOk()
    {
        ReleaseEntity succeeded = await AddRelease("1.0.0", BuildResult.Succeeded);
        using HttpClient apiKeyClient = CreateTestClientWithAuthHandler<ApiKeyTestAuthHandler>();

        using HttpResponseMessage response = await apiKeyClient.PostAsJsonAsync(Uri, Request(Item("1.0.0")));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(succeeded.TargetCommitish, Assert.Single(await ReadResult(response)).Commit);
    }

    [Fact]
    public async Task Lookup_SessionCallerWithoutAntiforgeryToken_ReturnsBadRequest()
    {
        using HttpClient sessionClient = CreateTestClientWithAuthHandler<TestAuthHandler>();

        using HttpResponseMessage response = await sessionClient.PostAsJsonAsync(Uri, Request(Item("1.0.0")));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private ReleaseLookupItem Item(string version) => new(_org, _app, version);

    private static string ContractResource(string name) => $"Designer.Tests._TestData.ReleaseLookup.{name}";

    private async Task AddContractRelease(string app, string tagName, string commit, int second)
    {
        ReleaseEntity release = EntityGenerationUtils.Release.GenerateReleaseEntity(
            "fleetcontract",
            app,
            tagname: tagName,
            targetCommitish: commit
        );
        release.Created = new DateTime(2026, 1, 2, 3, 4, second, 678, DateTimeKind.Utc);
        await DesignerDbFixture.PrepareEntityInDatabase(release);
    }

    private static ReleaseLookupRequest Request(params ReleaseLookupItem[] items) => new(items);

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

    private async Task<IReadOnlyList<ReleaseLookupResult>> ReadResult(HttpResponseMessage response)
    {
        string body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<ReleaseLookupResponse>(body, JsonSerializerOptions).Releases;
    }
}
