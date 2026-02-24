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
                    "prefix": "altinn",
                    "subscope": "access.scope",
                    "description": "Access scope",
                    "active": true,
                    "allowed_integration_types": [
                        "maskinporten"
                    ]
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
            );

        int CountAccessScopesCalls() =>
            _mockServerFixture.MockApi.LogEntries.Count(entry =>
                entry.RequestMessage.Method == HttpMethod.Get.Method
                && entry.RequestMessage.Path == "/api/v1/scopes/access/all"
            );
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
                        "prefix": "altinn",
                        "subscope": "mirko.dan.test",
                        "description": "Dette er bare en test for Altinn Studio integrasjon",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten"
                        ]
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
                        "description": "First occurrence",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten"
                        ]
                    },
                    {
                        "prefix": "altinn",
                        "subscope": "unique.scope1",
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
                        "prefix": "altinn",
                        "subscope": "duplicate.scope",
                        "description": "Second occurrence (should be ignored)",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten"
                        ]
                    },
                    {
                        "prefix": "altinn",
                        "subscope": "unique.scope2",
                        "description": "Unique scope 2",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten"
                        ]
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
                        "prefix": "altinn",
                        "subscope": "single.scope",
                        "description": "Single scope",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten"
                        ]
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
                        "description": "Maskinporten scope",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten"
                        ]
                    },
                    {
                        "prefix": "altinn",
                        "subscope": "idporten.scope",
                        "description": "IDporten scope",
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
                        "prefix": "altinn",
                        "subscope": "another.idporten.scope",
                        "description": "Another IDporten scope",
                        "active": true,
                        "allowed_integration_types": [
                            "idporten"
                        ]
                    }
                ]
                """,
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
                        "prefix": "altinn",
                        "subscope": "maskinporten.only",
                        "description": "Maskinporten only",
                        "active": true,
                        "allowed_integration_types": [
                            "maskinporten"
                        ]
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
                        "description": "IDporten scope 1",
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
                        "prefix": "altinn",
                        "subscope": "idporten.scope2",
                        "description": "IDporten scope 2",
                        "active": true,
                        "allowed_integration_types": [
                            "idporten"
                        ]
                    }
                ]
                """,
            0,
        ];
    }
}
