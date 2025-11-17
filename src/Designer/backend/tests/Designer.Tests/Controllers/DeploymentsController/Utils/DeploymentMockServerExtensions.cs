using System;
using System.Net.Mime;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Fixtures;
using WireMock.Matchers;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;

namespace Designer.Tests.Controllers.DeploymentsController.Utils;

public static class DeploymentMockServerExtensions
{
    /// <summary>
    /// Prepares mock response for environments endpoint
    /// </summary>
    public static void PrepareEnvironmentsResponse(this MockServerFixture mockServerFixture, string mockServerUrl)
    {
        var request = Request.Create()
            .UsingGet()
            .WithPath("/cdn-mock/environments.json");

        var responseBody = $$"""
        {
            "environments": [
                {
                    "name": "at22",
                    "platformUrl": "{{mockServerUrl}}/",
                    "hostname": "at22.altinn.cloud",
                    "appPrefix": "at22",
                    "platformPrefix": "at22",
                    "type": "test"
                },
                {
                    "name": "at23",
                    "platformUrl": "{{mockServerUrl}}/",
                    "hostname": "at23.altinn.cloud",
                    "appPrefix": "at23",
                    "platformPrefix": "at23",
                    "type": "test"
                },
                {
                    "name": "at24",
                    "platformUrl": "{{mockServerUrl}}/",
                    "hostname": "at24.altinn.cloud",
                    "appPrefix": "at24",
                    "platformPrefix": "at24",
                    "type": "test"
                },
                {
                    "name": "tt02",
                    "platformUrl": "{{mockServerUrl}}/",
                    "hostname": "tt02.altinn.no",
                    "appPrefix": "tt02",
                    "platformPrefix": "tt02",
                    "type": "test"
                },
                {
                    "name": "production",
                    "platformUrl": "{{mockServerUrl}}/",
                    "hostname": "altinn.no",
                    "appPrefix": "",
                    "platformPrefix": "",
                    "type": "production"
                }
            ]
        }
        """;

        var response = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody(responseBody);

        mockServerFixture.MockApi.Given(request)
            .RespondWith(response);
    }

    /// <summary>
    /// Prepares mock responses for Azure DevOps build queue endpoint
    /// </summary>
    public static void PrepareAzureDevOpsBuildQueueResponse(this MockServerFixture mockServerFixture, int buildId, BuildStatus status = BuildStatus.NotStarted)
    {
        var request = Request.Create()
            .UsingPost()
            .WithPath("/build/builds")
            .WithParam("api-version", "5.1");

        var responseBody = $$"""
        {
            "id": {{buildId}},
            "status": "{{status.ToString()}}",
            "startTime": "{{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ss.fffZ}}"
        }
        """;

        var response = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody(responseBody);

        mockServerFixture.MockApi.Given(request)
            .RespondWith(response);
    }

    /// <summary>
    /// Prepares mock responses for Altinn Storage Application Metadata endpoint
    /// Path: /storage/api/v1/applications?appId={{org}}/{{app}}
    /// </summary>
    public static void PrepareStorageAppMetadataResponse(this MockServerFixture mockServerFixture, string org, string app)
    {
        var request = Request.Create()
            .UsingPost()
            .WithPath(new WildcardMatcher("*/storage/api/v1/applications*"))
            .WithParam("appId", $"{org}/{app}");

        var response = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody("{}");

        mockServerFixture.MockApi.Given(request)
            .RespondWith(response);
    }

    /// <summary>
    /// Prepares mock responses for Altinn Storage Text Resource endpoint
    /// Path: /storage/api/v1/applications/{{org}}/{{app}}/texts
    /// </summary>
    public static void PrepareStorageTextResourceResponse(this MockServerFixture mockServerFixture, string org, string app)
    {
        var request = Request.Create()
            .UsingPost()
            .WithPath(new WildcardMatcher($"*/storage/api/v1/applications/{org}/{app}/texts"));

        var response = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody("{}");

        mockServerFixture.MockApi.Given(request)
            .RespondWith(response);
    }

    /// <summary>
    /// Prepares mock responses for Altinn Authorization Policy endpoint
    /// Path: /authorization/api/v1/policy?org={{org}}&amp;app={{app}}
    /// </summary>
    public static void PrepareAuthorizationPolicyResponse(this MockServerFixture mockServerFixture, string org, string app)
    {
        // Mock the SavePolicy endpoint
        var savePolicyRequest = Request.Create()
            .UsingPost()
            .WithPath(new WildcardMatcher("*/authorization/api/v1/policy*"))
            .WithParam("org", org)
            .WithParam("app", app);

        var savePolicyResponse = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Xml);

        mockServerFixture.MockApi.Given(savePolicyRequest)
            .RespondWith(savePolicyResponse);

        // Mock the refresh subjects endpoint
        // Path: /resourceregistry/api/v1/resource/app_{{org}}_{{app}}/policy/subjects?reloadFromXacml=true
        var refreshSubjectsRequest = Request.Create()
            .UsingGet()
            .WithPath(new WildcardMatcher($"*/resourceregistry/api/v1/resource/app_{org}_{app}/policy/subjects*"))
            .WithParam("reloadFromXacml", "true");

        var refreshSubjectsResponse = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody("[]");

        mockServerFixture.MockApi.Given(refreshSubjectsRequest)
            .RespondWith(refreshSubjectsResponse);
    }

    /// <summary>
    /// Prepares mock response for authentication token conversion endpoint
    /// </summary>
    public static void PrepareAuthenticationTokenConversionResponse(this MockServerFixture mockServerFixture)
    {
        var authConvertRequest = Request.Create()
            .WithPath("/authentication/api/v1/exchange/altinnstudio");

        var authConvertResponse = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody("\"mock-bearer-token\"");

        mockServerFixture.MockApi.Given(authConvertRequest)
            .RespondWith(authConvertResponse);
    }

    /// <summary>
    /// Prepares mock response for Azure DevOps build queue endpoint with specific buildId for org/app combination
    /// </summary>
    /// <param name="mockServerFixture">The mock server fixture</param>
    /// <param name="org">Organization name (APP_OWNER)</param>
    /// <param name="app">Application name (APP_REPO)</param>
    /// <param name="buildId">The build ID to return from the mock (as string)</param>
    public static void PrepareAzureDevOpsBuildQueueResponseForOrgApp(
        this MockServerFixture mockServerFixture,
        string org,
        string app,
        string buildId)
    {
        // Match on APP_OWNER and APP_REPO in the parameters field to ensure each test gets its own response
        var azureDevOpsRequest = Request.Create()
            .UsingPost()
            .WithPath("/build/builds")
            .WithParam("api-version")
            .WithBody(new WildcardMatcher($"*APP_OWNER*{org}*", true))
            .WithBody(new WildcardMatcher($"*APP_REPO*{app}*", true));

        var azureDevOpsResponseBody = $$"""
        {
            "id": {{buildId}},
            "status": "{{BuildStatus.NotStarted.ToString()}}",
            "startTime": "{{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ss.fffZ}}"
        }
        """;

        var azureDevOpsResponse = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody(azureDevOpsResponseBody);

        mockServerFixture.MockApi.Given(azureDevOpsRequest)
            .RespondWith(azureDevOpsResponse);
    }

    /// <summary>
    /// Prepares mock responses for a specific deployment test
    /// </summary>
    /// <param name="mockServerFixture">The mock server fixture</param>
    /// <param name="org">Organization name</param>
    /// <param name="app">Application name</param>
    /// <param name="buildId">The build ID to return from Azure DevOps mock (as string)</param>
    public static void PrepareDeploymentMockResponses(
        this MockServerFixture mockServerFixture,
        string org,
        string app,
        string buildId)
    {
        // Environments endpoint (shared across all tests)
        mockServerFixture.PrepareEnvironmentsResponse(mockServerFixture.MockApi.Url);

        // Authentication token conversion endpoint
        mockServerFixture.PrepareAuthenticationTokenConversionResponse();

        // Azure DevOps build queue - responds with specific build ID for this test
        mockServerFixture.PrepareAzureDevOpsBuildQueueResponseForOrgApp(org, app, buildId);

        // Storage app metadata for specific org/app
        mockServerFixture.PrepareStorageAppMetadataResponse(org, app);

        // Storage text resources for specific org/app
        mockServerFixture.PrepareStorageTextResourceResponse(org, app);

        // Authorization policy for specific org/app
        mockServerFixture.PrepareAuthorizationPolicyResponse(org, app);
    }
}
