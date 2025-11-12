using System;
using System.Net.Mime;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Fixtures;
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
            .WithPath("/designer/frontend/resources/environments.json");

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
            .WithPath("/storage/api/v1/applications")
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
            .WithPath($"/storage/api/v1/applications/{org}/{app}/texts");

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
            .WithPath("/authorization/api/v1/policy")
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
            .WithPath($"/resourceregistry/api/v1/resource/app_{org}_{app}/policy/subjects")
            .WithParam("reloadFromXacml", "true");

        var refreshSubjectsResponse = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody("[]");

        mockServerFixture.MockApi.Given(refreshSubjectsRequest)
            .RespondWith(refreshSubjectsResponse);
    }

    /// <summary>
    /// Prepares all required mock responses for ANY deployment creation
    /// Uses wildcard matchers to handle dynamic org/app values
    /// </summary>
    public static void PrepareAllDeploymentMockResponses(this MockServerFixture mockServerFixture)
    {
        // Environments endpoint
        mockServerFixture.PrepareEnvironmentsResponse(mockServerFixture.MockApi.Url);

        // Authentication token conversion endpoint
        var authConvertRequest = Request.Create()
            .WithPath("/authentication/api/v1/exchange/altinnstudio");

        var authConvertResponse = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody("\"mock-bearer-token\"");

        mockServerFixture.MockApi.Given(authConvertRequest)
            .RespondWith(authConvertResponse);

        // Azure DevOps build queue - responds with dynamic build ID
        var azureDevOpsRequest = Request.Create()
            .UsingPost()
            .WithPath("/build/builds")
            .WithParam("api-version");

        var azureDevOpsResponse = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody($$"""
        {
            "id": 12345,
            "status": "{{BuildStatus.NotStarted.ToString()}}",
            "startTime": "{{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ss.fffZ}}"
        }
        """);

        mockServerFixture.MockApi.Given(azureDevOpsRequest)
            .RespondWith(azureDevOpsResponse);

        // Storage app metadata - accepts any org/app
        var storageAppRequest = Request.Create()
            .UsingPost()
            .WithPath("/storage/api/v1/applications/")
            .WithParam("appId");

        var storageAppResponse = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody("{}");

        mockServerFixture.MockApi.Given(storageAppRequest)
            .RespondWith(storageAppResponse);

        // Storage text resources - wildcard path matching
        var storageTextRequest = Request.Create()
            .UsingPost()
            .WithPath("/storage/api/v1/applications/*/*/texts");

        var storageTextResponse = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody("{}");

        mockServerFixture.MockApi.Given(storageTextRequest)
            .RespondWith(storageTextResponse);

        // Authorization policy - accepts any org/app
        var authPolicyRequest = Request.Create()
            .UsingPost()
            .WithPath("/authorization/api/v1/policy")
            .WithParam("org")
            .WithParam("app");

        var authPolicyResponse = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Xml);

        mockServerFixture.MockApi.Given(authPolicyRequest)
            .RespondWith(authPolicyResponse);

        // Resource registry subjects refresh - wildcard matching
        var refreshSubjectsRequest = Request.Create()
            .UsingGet()
            .WithPath("/resourceregistry/api/v1/resource/app_*/policy/subjects")
            .WithParam("reloadFromXacml");

        var refreshSubjectsResponse = Response.Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Application.Json)
            .WithBody("[]");

        mockServerFixture.MockApi.Given(refreshSubjectsRequest)
            .RespondWith(refreshSubjectsResponse);
    }
}