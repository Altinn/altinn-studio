using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.AppScopesController.Base;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppScopesController;

public class GetAppScopesTests : AppScopesControllerTestsBase<GetAppScopesTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/app-scopes";

    public GetAppScopesTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture) : base(factory, designerDbFixture)
    {
    }

    [Theory]
    [InlineData("ttd", "non-existing-app")]
    public async Task GetAppScopes_Should_ReturnOk_WithEmptyScopes_IfRecordDoesntExists(string org, string app)
    {
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get
            , VersionPrefix(org, app));

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        AppScopesResponse repsponseContent = await response.Content.ReadAsAsync<AppScopesResponse>();
        repsponseContent.Scopes.Should().BeEmpty();
    }

    [Theory]
    [InlineData("ttd", "empty-app")]
    public async Task GetAppScopes_Should_ReturnOk_WithScopes_IfRecordExists(string org, string app)
    {
        var entity = EntityGenerationUtils.AppScopes.GenerateAppScopesEntity(org, app, 4);
        await DesignerDbFixture.PrepareAppScopesEntityInDatabaseAsync(entity);

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get
            , VersionPrefix(org, app));

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        AppScopesResponse responseContent = await response.Content.ReadAsAsync<AppScopesResponse>();
        responseContent.Scopes.Should().HaveCount(4);

        foreach (MaskinPortenScopeDto scope in responseContent.Scopes)
        {
            entity.Scopes.Should().Contain(x => scope.Scope == x.Scope && scope.Description == x.Description);
        }
    }
}
