using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.AppScopesController.Base;
using Designer.Tests.Controllers.AppScopesController.Utils;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppScopesController;

public class GetScopesFromMaskinPortenTests
    : AppScopesControllerTestsBase<GetAppScopesTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<MockServerFixture>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/app-scopes/maskinporten";

    private readonly MockServerFixture _mockServerFixture;

    public GetScopesFromMaskinPortenTests(
        WebApplicationFactory<Program> factory,
        DesignerDbFixture designerDbFixture,
        MockServerFixture mockServerFixture
    )
        : base(factory, designerDbFixture)
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
    public async Task GetScopesFromMaskinPortens_Should_ReturnOk(
        string org,
        string app,
        string allScopesResponse,
        string accessScopesResponse,
        int expectedCount
    )
    {
        _mockServerFixture.PrepareMaskinPortenScopesResponse(allScopesResponse, accessScopesResponse);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, VersionPrefix(org, app));

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        AppScopesResponse responseContent = await response.Content.ReadAsAsync<AppScopesResponse>();
        Assert.Equal(expectedCount, responseContent.Scopes.Count);
    }

    [Fact]
    public async Task GetScopesFromMaskinPortens_Should_CacheAccessibleForAllScopes()
    {
        const string AllScopesResponse = """
            [
                {
                    "prefix": "altinn",
                    "subscope": "cached.scope",
                    "name": "altinn:cached.scope",
                    "description": "Cached scope",
                    "active": true,
                    "allowed_integration_types": [
                        "maskinporten"
                    ]
                }
            ]
            """;

        const string AccessScopesResponse = """
            [
                {
                    "scope": "altinn:access.scope",
                    "state": "APPROVED"
                }
            ]
            """;

        _mockServerFixture.PrepareMaskinPortenScopesResponse(AllScopesResponse, AccessScopesResponse);

        int initialAllScopesCalls = CountAllScopesCalls();
        int initialAccessScopesCalls = CountAccessScopesCalls();

        using var firstRequest = new HttpRequestMessage(HttpMethod.Get, VersionPrefix("ttd", "cache-test-app"));
        using var firstResponse = await HttpClient.SendAsync(firstRequest);

        using var secondRequest = new HttpRequestMessage(HttpMethod.Get, VersionPrefix("ttd", "cache-test-app"));
        using var secondResponse = await HttpClient.SendAsync(secondRequest);

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
        Assert.Equal(1, CountAllScopesCalls() - initialAllScopesCalls);
        Assert.Equal(2, CountAccessScopesCalls() - initialAccessScopesCalls);

        int CountAllScopesCalls() =>
            _mockServerFixture.MockApi.LogEntries.Count(entry =>
                entry.RequestMessage.Method == HttpMethod.Get.Method
                && entry.RequestMessage.Path == "/api/v1/scopes/all"
                && entry.RequestMessage.RawQuery.Contains("accessible_for_all=true")
                && entry.RequestMessage.RawQuery.Contains("integration_type=maskinporten")
                && entry.RequestMessage.RawQuery.Contains("inactive=false")
            );

        int CountAccessScopesCalls() =>
            _mockServerFixture.MockApi.LogEntries.Count(entry =>
                entry.RequestMessage.Method == HttpMethod.Get.Method
                && entry.RequestMessage.Path == "/api/v1/scopes/access/all"
                && entry.RequestMessage.RawQuery.Contains("integration_type=maskinporten")
                && entry.RequestMessage.RawQuery.Contains("inactive=false")
            );
    }

    [Fact]
    public async Task GetScopesFromMaskinPortens_Should_PreferAllScopeDescription_WhenScopeExistsInBothResponses()
    {
        const string AllScopesResponse = """
            [
                {
                    "prefix": "altinn",
                    "subscope": "duplicate.scope",
                    "name": "altinn:duplicate.scope",
                    "description": "Description from all scopes",
                    "allowed_integration_types": [
                        "maskinporten"
                    ]
                }
            ]
            """;

        const string AccessScopesResponse = """
            [
                {
                    "scope": "altinn:duplicate.scope",
                    "state": "APPROVED"
                }
            ]
            """;

        _mockServerFixture.PrepareMaskinPortenScopesResponse(AllScopesResponse, AccessScopesResponse);
        using var request = new HttpRequestMessage(HttpMethod.Get, VersionPrefix("ttd", "duplicate-test"));

        using var response = await HttpClient.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        AppScopesResponse responseContent = await response.Content.ReadAsAsync<AppScopesResponse>();
        Assert.Contains(
            responseContent.Scopes,
            scope => scope.Scope == "altinn:duplicate.scope" && scope.Description == "Description from all scopes"
        );
    }

    [Fact]
    public async Task GetScopesFromMaskinPortens_Should_FilterInvalidAccessScopes_AndUseNameFromAllScopes()
    {
        const string AllScopesResponse = """
            [
                {
                    "name": "altinn:name-only.scope",
                    "description": "Name-only scope",
                    "allowed_integration_types": [
                        "maskinporten"
                    ]
                }
            ]
            """;

        const string AccessScopesResponse = """
            [
                {
                    "scope": "altinn:approved.scope",
                    "state": "APPROVED"
                },
                {
                    "scope": "altinn:pending.scope",
                    "state": "PENDING"
                },
                {
                    "scope": "",
                    "state": "APPROVED"
                },
                null
            ]
            """;

        _mockServerFixture.PrepareMaskinPortenScopesResponse(AllScopesResponse, AccessScopesResponse);
        using var request = new HttpRequestMessage(HttpMethod.Get, VersionPrefix("ttd", "fallback-test"));

        using var response = await HttpClient.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        AppScopesResponse responseContent = await response.Content.ReadAsAsync<AppScopesResponse>();
        Assert.Equal(2, responseContent.Scopes.Count);
        Assert.Contains(responseContent.Scopes, scope => scope.Scope == "altinn:approved.scope");
        Assert.Contains(
            responseContent.Scopes,
            scope => scope.Scope == "altinn:name-only.scope" && scope.Description == "Name-only scope"
        );
        Assert.DoesNotContain(responseContent.Scopes, scope => scope.Scope == "altinn:pending.scope");
    }

    public static IEnumerable<object[]> TestData()
    {
        // No overlap between endpoints
        yield return
        [
            "ttd",
            "non-existing-app",
            """
                [
                    {
                        "prefix": "altinn",
                        "subscope": "demo.torsdag",
                        "name": "altinn:demo.torsdag",
                        "description": "Dette er en test",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten"
                        ]
                    }
                ]
                """,
            """
                [
                    {
                        "scope": "altinn:mirko.dan.test",
                        "state": "APPROVED"
                    }
                ]
                """,
            2,
        ];

        // Overlapping scopes (verify deduplication)
        yield return
        [
            "ttd",
            "test-app",
            """
                [
                    {
                        "prefix": "altinn",
                        "subscope": "duplicate.scope",
                        "name": "altinn:duplicate.scope",
                        "description": "First occurrence",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten"
                        ]
                    },
                    {
                        "prefix": "altinn",
                        "subscope": "unique.scope1",
                        "name": "altinn:unique.scope1",
                        "description": "Unique scope 1",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten"
                        ]
                    }
                ]
                """,
            """
                [
                    {
                        "scope": "altinn:duplicate.scope",
                        "state": "APPROVED"
                    },
                    {
                        "scope": "altinn:unique.scope2",
                        "state": "APPROVED"
                    }
                ]
                """,
            3,
        ];

        // Empty response from one endpoint
        yield return
        [
            "ttd",
            "empty-test-app",
            "[]",
            """
                [
                    {
                        "scope": "altinn:single.scope",
                        "state": "APPROVED"
                    }
                ]
                """,
            1,
        ];

        // Filter out idporten-only scopes
        yield return
        [
            "ttd",
            "idporten-filter-app",
            """
                [
                    {
                        "prefix": "altinn",
                        "subscope": "maskinporten.scope",
                        "name": "altinn:maskinporten.scope",
                        "description": "Maskinporten scope",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten"
                        ]
                    },
                    {
                        "prefix": "altinn",
                        "subscope": "idporten.scope",
                        "name": "altinn:idporten.scope",
                        "description": "IDporten scope",
                        "active": true,
                        "allowed_integration_types": [
                            "idporten"
                        ]
                    }
                ]
                """,
            "[]",
            1,
        ];

        // Include scopes with both maskinporten and idporten
        yield return
        [
            "ttd",
            "mixed-types-app",
            """
                [
                    {
                        "prefix": "altinn",
                        "subscope": "both.types.scope",
                        "name": "altinn:both.types.scope",
                        "description": "Both integration types",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten",
                            "idporten"
                        ]
                    },
                    {
                        "prefix": "altinn",
                        "subscope": "only.idporten",
                        "name": "altinn:only.idporten",
                        "description": "IDporten only",
                        "active": true,
                        "allowed_integration_types": [
                            "idporten"
                        ]
                    }
                ]
                """,
            """
                [
                    {
                        "scope": "altinn:maskinporten.only",
                        "state": "APPROVED"
                    }
                ]
                """,
            2,
        ];

        // All scopes are idporten-only
        yield return
        [
            "ttd",
            "all-idporten-app",
            """
                [
                    {
                        "prefix": "altinn",
                        "subscope": "idporten.scope1",
                        "name": "altinn:idporten.scope1",
                        "description": "IDporten scope 1",
                        "active": true,
                        "allowed_integration_types": [
                            "idporten"
                        ]
                    }
                ]
                """,
            "[]",
            0,
        ];
    }
}
