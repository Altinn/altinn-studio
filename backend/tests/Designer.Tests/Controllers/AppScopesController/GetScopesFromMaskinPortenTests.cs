using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.AppScopesController.Base;
using Designer.Tests.Controllers.AppScopesController.Utils;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppScopesController;

public class GetScopesFromMaskinPortenTests : AppScopesControllerTestsBase<GetAppScopesTests>, IClassFixture<WebApplicationFactory<Program>>, IClassFixture<MockServerFixture>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/app-scopes/maskinporten";

    private readonly MockServerFixture _mockServerFixture;

    public GetScopesFromMaskinPortenTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture, MockServerFixture mockServerFixture) : base(factory, designerDbFixture)
    {
        _mockServerFixture = mockServerFixture;
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
    [MemberData(nameof(TestData))]
    public async Task GetScopesFromMaskinPortens_Should_ReturnOk(string org, string app, string maskinPortenResponse)
    {
        _mockServerFixture.PrepareMaskinPortenScopesResponse(maskinPortenResponse);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get
            , VersionPrefix(org, app));

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        AppScopesResponse repsponseContent = await response.Content.ReadAsAsync<AppScopesResponse>();
        JsonArray array = (JsonArray)JsonNode.Parse(maskinPortenResponse);
        Assert.Equal(array.Count, repsponseContent.Scopes.Count);
    }


    public static IEnumerable<object[]> TestData()
    {
        yield return ["ttd",
            "non-existing-app",
            $@"[
            {{
                ""scope"": ""altinn:demo.torsdag"",
                ""state"": ""APPROVED"",
                ""created"": ""2024-10-24T08:40:23Z"",
                ""description"": ""Dette er en test"",
                ""active"": true,
                ""consumer_orgno"": ""310461598"",
                ""last_updated"": ""2024-10-24T08:40:23Z"",
                ""owner_orgno"": ""991825827"",
                ""allowed_integration_types"": [
                    ""maskinporten""
                ]
            }},
            {{
                ""scope"": ""altinn:mirko.dan.test"",
                ""state"": ""APPROVED"",
                ""created"": ""2024-10-28T11:10:49Z"",
                ""description"": ""Dette er bare en test for Altinn Studio integrasjon"",
                ""active"": true,
                ""consumer_orgno"": ""310461598"",
                ""last_updated"": ""2024-10-28T11:10:49Z"",
                ""owner_orgno"": ""991825827"",
                ""allowed_integration_types"": [
                    ""maskinporten""
                ]
            }}
        ]"
        ];
    }

}
