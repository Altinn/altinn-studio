using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Designer.Tests.Controllers.AppScopesController.Base;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.Controllers.AppScopesController;

public class UpsertAppScopesTests : AppScopesControllerTestsBase<UpsertAppScopesTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
            $"/designer/api/{org}/{repository}/app-scopes";

    public UpsertAppScopesTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture) : base(factory, designerDbFixture)
    {
    }

    [Theory]
    [MemberData(nameof(TestData))]
    public async Task UpsertAppScopes_Should_CreateRecordInDb_IfNotExists(string org, string app, AppScopesUpsertRequest payload)
    {
        await CallUpsertEndpointAndAssertFromDb(org, app, payload);
    }


    [Theory]
    [MemberData(nameof(TestData))]
    public async Task UpsertAppScopes_Should_UpdateRecordInDb_IfAlreadyExists(string org, string app, AppScopesUpsertRequest payload)
    {
        var initEntity = EntityGenerationUtils.AppScopes.GenerateAppScopesEntity(org, app, 4);
        await DesignerDbFixture.PrepareAppScopesEntityInDatabaseAsync(initEntity);

        await CallUpsertEndpointAndAssertFromDb(org, app, payload);
    }

    private async Task CallUpsertEndpointAndAssertFromDb(string org, string app, AppScopesUpsertRequest payload)
    {
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put
            , VersionPrefix(org, app));
        httpRequestMessage.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, MediaTypeNames.Application.Json);

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var dbEntity = await DesignerDbFixture.DbContext.AppScopes.SingleAsync(x => x.App == app && x.Org == org);

        Assert.NotNull(dbEntity);

        var scopes = JsonSerializer.Deserialize<ISet<MaskinPortenScopeEntity>>(dbEntity.Scopes, JsonSerializerOptions);
        Assert.Equal(payload.Scopes.Count, scopes.Count);
        foreach (MaskinPortenScopeEntity maskinPortenScopeEntity in scopes)
        {
            Assert.Contains(payload.Scopes, x => x.Scope == maskinPortenScopeEntity.Scope && x.Description == maskinPortenScopeEntity.Description);
        }
    }

    public static IEnumerable<object[]> TestData()
    {
        yield return ["ttd",
            TestDataHelper.GenerateTestRepoName(),
            new AppScopesUpsertRequest()
            {
                Scopes = new HashSet<MaskinPortenScopeDto>()
            {
                new()
                {
                    Scope = "test",
                    Description = "test"
                }
            }
            }];
    }

}
