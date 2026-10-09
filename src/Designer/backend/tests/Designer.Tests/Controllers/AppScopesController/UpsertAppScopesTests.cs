using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Controllers.AppScopesController.Base;
using Designer.Tests.Controllers.AppScopesController.Utils;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.AppScopesController;

public class UpsertAppScopesTests
    : AppScopesControllerTestsBase<UpsertAppScopesTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<MockServerFixture>
{
    private const string Org = "ttd";
    private const string AccessibleForAllScope = "altinn:accessible.scope";
    private const string ApprovedAccessScope = "altinn:approved.scope";
    private const string UnavailableScope = "altinn:unavailable.scope";

    private const string AllScopesResponse = $$"""
        [
            {
                "name": "{{AccessibleForAllScope}}",
                "description": "Accessible for all",
                "allowed_integration_types": ["maskinporten"]
            }
        ]
        """;

    private const string AccessScopesResponse = $$"""
        [
            {
                "scope": "{{ApprovedAccessScope}}",
                "state": "APPROVED"
            },
            {
                "scope": "{{UnavailableScope}}",
                "state": "PENDING"
            }
        ]
        """;

    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/app-scopes";

    public UpsertAppScopesTests(
        WebApplicationFactory<Program> factory,
        DesignerDbFixture designerDbFixture,
        MockServerFixture mockServerFixture
    )
        : base(factory, designerDbFixture)
    {
        mockServerFixture.PrepareMaskinPortenScopesResponse(AllScopesResponse, AccessScopesResponse);
        JsonConfigOverrides.Add(
            $$"""
              {
                "MaskinPortenHttpClientSettings" : {
                    "BaseUrl": "{{mockServerFixture.MockApi.Url}}"
                }
              }
            """
        );
    }

    [Theory]
    [MemberData(nameof(AllowedScopesTestData))]
    public async Task UpsertAppScopes_Should_CreateRecordInDb_IfNotExists(string[] scopeNames)
    {
        string app = TestDataHelper.GenerateTestRepoName();
        AppScopesUpsertRequest payload = CreatePayload(scopeNames);

        using var response = await SendUpsertRequest(Org, app, payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await AssertScopesInDb(Org, app, payload.Scopes);
    }

    [Theory]
    [MemberData(nameof(AllowedScopesTestData))]
    public async Task UpsertAppScopes_Should_UpdateRecordInDb_IfAlreadyExists(string[] scopeNames)
    {
        string app = TestDataHelper.GenerateTestRepoName();
        var initEntity = EntityGenerationUtils.AppScopes.GenerateAppScopesEntity(Org, app, 4);
        await DesignerDbFixture.PrepareAppScopesEntityInDatabaseAsync(initEntity);
        AppScopesUpsertRequest payload = CreatePayload(scopeNames);

        using var response = await SendUpsertRequest(Org, app, payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await AssertScopesInDb(Org, app, payload.Scopes);
    }

    [Fact]
    public async Task UpsertAppScopes_Should_KeepAlreadySelectedScopes_ThatAreNoLongerAvailable()
    {
        string app = TestDataHelper.GenerateTestRepoName();
        var initEntity = EntityGenerationUtils.AppScopes.GenerateAppScopesEntity(Org, app, 2);
        await DesignerDbFixture.PrepareAppScopesEntityInDatabaseAsync(initEntity);
        string keptScope = initEntity.Scopes.First().Scope;
        AppScopesUpsertRequest payload = CreatePayload([keptScope, AccessibleForAllScope]);

        using var response = await SendUpsertRequest(Org, app, payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await AssertScopesInDb(Org, app, payload.Scopes);
    }

    [Theory]
    [InlineData(UnavailableScope)]
    [InlineData(AccessibleForAllScope, "altinn:unknown.scope")]
    public async Task UpsertAppScopes_Should_ReturnBadRequest_WhenScopeIsNotAvailable(params string[] scopeNames)
    {
        string app = TestDataHelper.GenerateTestRepoName();
        var initEntity = EntityGenerationUtils.AppScopes.GenerateAppScopesEntity(Org, app, 2);
        await DesignerDbFixture.PrepareAppScopesEntityInDatabaseAsync(initEntity);

        using var response = await SendUpsertRequest(Org, app, CreatePayload(scopeNames));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertScopesInDb(Org, app, initEntity.Scopes.Select(ToDto).ToHashSet());
    }

    [Fact]
    public async Task UpsertAppScopes_Should_ReturnForbidden_WhenUserHasNoAccessToOrg()
    {
        OidcAuthHandlerType = typeof(TestOidcOtherOrgAuthHandler);
        string app = TestDataHelper.GenerateTestRepoName();

        using var response = await SendUpsertRequest(Org, app, CreatePayload([AccessibleForAllScope]));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.False(await DesignerDbFixture.DbContext.AppScopes.AnyAsync(x => x.App == app && x.Org == Org));
    }

    [Fact]
    public async Task UpsertAppScopes_Should_ReturnForbidden_WhenUserHasOrgAccessButIsNotMemberOfOrg()
    {
        UserOrganizationServiceMock.Setup(x => x.UserIsMemberOfOrganization(Org)).ReturnsAsync(false);
        string app = TestDataHelper.GenerateTestRepoName();

        using var response = await SendUpsertRequest(Org, app, CreatePayload([AccessibleForAllScope]));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.False(await DesignerDbFixture.DbContext.AppScopes.AnyAsync(x => x.App == app && x.Org == Org));
    }

    [Fact]
    public async Task UpsertAppScopes_Should_ReturnForbidden_WhenRepoOwnerIsNotServiceOwner()
    {
        using var response = await SendUpsertRequest(
            "developer",
            "personal-app",
            CreatePayload([AccessibleForAllScope])
        );

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task<HttpResponseMessage> SendUpsertRequest(string org, string app, AppScopesUpsertRequest payload)
    {
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, VersionPrefix(org, app));
        httpRequestMessage.Content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );

        return await HttpClient.SendAsync(httpRequestMessage);
    }

    private async Task AssertScopesInDb(string org, string app, ISet<MaskinPortenScopeDto> expectedScopes)
    {
        var dbEntity = await DesignerDbFixture
            .DbContext.AppScopes.AsNoTracking()
            .SingleAsync(x => x.App == app && x.Org == org);

        var scopes = JsonSerializer.Deserialize<ISet<MaskinPortenScopeEntity>>(dbEntity.Scopes, JsonSerializerOptions);
        Assert.Equal(expectedScopes.Count, scopes.Count);
        foreach (MaskinPortenScopeEntity maskinPortenScopeEntity in scopes)
        {
            Assert.Contains(
                expectedScopes,
                x => x.Scope == maskinPortenScopeEntity.Scope && x.Description == maskinPortenScopeEntity.Description
            );
        }
    }

    private static AppScopesUpsertRequest CreatePayload(IEnumerable<string> scopeNames) =>
        new()
        {
            Scopes = scopeNames
                .Select(scopeName => new MaskinPortenScopeDto { Scope = scopeName, Description = scopeName })
                .ToHashSet(),
        };

    private static MaskinPortenScopeDto ToDto(MaskinPortenScopeEntity scope) =>
        new() { Scope = scope.Scope, Description = scope.Description };

    public static IEnumerable<object[]> AllowedScopesTestData()
    {
        yield return [new[] { AccessibleForAllScope }];
        yield return [new[] { ApprovedAccessScope }];
        yield return [DefaultMaskinportenScopes.ScopeNames.ToArray()];
        yield return
        [
            DefaultMaskinportenScopes.ScopeNames.Append(AccessibleForAllScope).Append(ApprovedAccessScope).ToArray(),
        ];
        yield return [new string[] { }];
    }
}
