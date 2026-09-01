using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Moq;
using Moq.Protected;
using Xunit;

namespace Designer.Tests.TypedHttpClients;

public class RuntimeGatewayClientWorkflowsTests
{
    private const string Org = "ttd";
    private const string App = "my-app";

    // The hosted app cluster pattern is authority-only ("https://{org}.{appPrefix}.{hostName}"), so
    // Uri canonicalizes it with a trailing slash — exactly as in production. Every expected URL below
    // is asserted in full, so a stray "//" in the join is a failing test rather than something nginx
    // quietly papers over.
    private const string ClusterBaseUrl = "https://ttd.apps.at23.altinn.cloud";
    private const string CanonicalClusterBaseUrl = ClusterBaseUrl + "/";

    private const string WorkflowsBasePath = "runtime/gateway/api/v1/workflows/apps/my-app";

    private static readonly AltinnEnvironment s_environment = AltinnEnvironment.FromName("at23");

    private readonly Mock<HttpMessageHandler> _messageHandlerMock = new();
    private readonly Mock<IEnvironmentsService> _environmentsServiceMock = new();
    private readonly RuntimeGatewayClient _client;
    private HttpRequestMessage _capturedRequest;

    public RuntimeGatewayClientWorkflowsTests()
    {
        _messageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Callback<HttpRequestMessage, CancellationToken>((request, _) => _capturedRequest = request)
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") });

        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        httpClientFactoryMock
            .Setup(factory => factory.CreateClient("runtime-gateway"))
            .Returns(() => new HttpClient(_messageHandlerMock.Object, disposeHandler: false));

        _environmentsServiceMock
            .Setup(service => service.GetAppClusterUri(Org, s_environment.Name))
            .ReturnsAsync(new Uri(ClusterBaseUrl));

        _client = new RuntimeGatewayClient(
            httpClientFactoryMock.Object,
            new GeneralSettings(),
            _environmentsServiceMock.Object
        );
    }

    private void AssertRequest(HttpMethod expectedMethod, string expectedPathAndQuery) =>
        AssertRequest(expectedMethod, CanonicalClusterBaseUrl, expectedPathAndQuery);

    private void AssertRequest(HttpMethod expectedMethod, string expectedBaseUrl, string expectedPathAndQuery)
    {
        Assert.NotNull(_capturedRequest);
        Assert.Equal(expectedMethod, _capturedRequest.Method);
        Assert.Equal($"{expectedBaseUrl}{expectedPathAndQuery}", _capturedRequest.RequestUri.AbsoluteUri);
    }

    [Fact]
    public void HostedClusterAddress_IsTrailingSlashCanonical()
    {
        // Guards the premise of the assertions above: the production pattern really does produce a
        // trailing slash, so the join has to cope with it.
        Assert.Equal(CanonicalClusterBaseUrl, new Uri(ClusterBaseUrl).AbsoluteUri);
    }

    [Fact]
    public async Task WorkflowRequests_JoinTrailingSlashClusterAddressWithoutDoubleSlash()
    {
        using var response = await _client.GetWorkflowAsync(
            Org,
            App,
            s_environment,
            Guid.Parse("0f8fad5b-d9cb-469f-a165-70867728950e"),
            CancellationToken.None
        );

        Assert.DoesNotContain("//runtime", _capturedRequest.RequestUri.AbsoluteUri, StringComparison.Ordinal);
        AssertRequest(HttpMethod.Get, $"{WorkflowsBasePath}/workflows/0f8fad5b-d9cb-469f-a165-70867728950e");
    }

    [Fact]
    public async Task WorkflowRequests_PreserveThePathOfAClusterAddressWithoutTrailingSlash()
    {
        // The local development pattern carries a path and no trailing slash. Joining must not eat
        // the last segment, so a relative-Uri join is not an option here.
        const string localClusterBaseUrl = "http://host.docker.internal:6161/apps/ttd/at23";
        _environmentsServiceMock
            .Setup(service => service.GetAppClusterUri(Org, s_environment.Name))
            .ReturnsAsync(new Uri(localClusterBaseUrl));

        using var response = await _client.GetWorkflowCollectionsAsync(
            Org,
            App,
            s_environment,
            keys: null,
            failures: null,
            cursor: null,
            pageSize: null,
            CancellationToken.None
        );

        AssertRequest(HttpMethod.Get, $"{localClusterBaseUrl}/", $"{WorkflowsBasePath}/collections");
    }

    [Fact]
    public async Task GetWorkflowCollectionsAsync_EncodesRepeatableKeysAndQueryValues()
    {
        using var response = await _client.GetWorkflowCollectionsAsync(
            Org,
            App,
            s_environment,
            keys: ["0f8fad5b-d9cb-469f-a165-70867728950e", "key/with slash"],
            failures: "any",
            cursor: "cursor value",
            pageSize: 25,
            CancellationToken.None
        );

        AssertRequest(
            HttpMethod.Get,
            $"{WorkflowsBasePath}/collections"
                + "?key=0f8fad5b-d9cb-469f-a165-70867728950e&key=key%2Fwith%20slash"
                + "&failures=any&cursor=cursor%20value&pageSize=25"
        );
    }

    [Fact]
    public async Task GetWorkflowCollectionsAsync_WithoutQueryParameters_SendsBareRequest()
    {
        using var response = await _client.GetWorkflowCollectionsAsync(
            Org,
            App,
            s_environment,
            keys: null,
            failures: null,
            cursor: null,
            pageSize: null,
            CancellationToken.None
        );

        AssertRequest(HttpMethod.Get, $"{WorkflowsBasePath}/collections");
    }

    [Fact]
    public async Task GetWorkflowCollectionAsync_EscapesKeyPathSegment()
    {
        using var response = await _client.GetWorkflowCollectionAsync(
            Org,
            App,
            s_environment,
            key: "key/with slash",
            CancellationToken.None
        );

        AssertRequest(HttpMethod.Get, $"{WorkflowsBasePath}/collections/key%2Fwith%20slash");
    }

    [Fact]
    public async Task GetWorkflowsAsync_EncodesRepeatableStatusAndLabelFilters()
    {
        using var response = await _client.GetWorkflowsAsync(
            Org,
            App,
            s_environment,
            collectionKey: "0f8fad5b-d9cb-469f-a165-70867728950e",
            statuses: ["Failed", "AwaitingRetry"],
            labels: ["step:pdf", "kind:head"],
            isHead: true,
            cursor: "c1",
            pageSize: 10,
            CancellationToken.None
        );

        AssertRequest(
            HttpMethod.Get,
            $"{WorkflowsBasePath}/workflows"
                + "?collectionKey=0f8fad5b-d9cb-469f-a165-70867728950e"
                + "&status=Failed&status=AwaitingRetry&label=step%3Apdf&label=kind%3Ahead"
                + "&isHead=true&cursor=c1&pageSize=10"
        );
    }

    [Fact]
    public async Task GetWorkflowAsync_TargetsWorkflowById()
    {
        var workflowId = Guid.Parse("0f8fad5b-d9cb-469f-a165-70867728950e");

        using var response = await _client.GetWorkflowAsync(
            Org,
            App,
            s_environment,
            workflowId,
            CancellationToken.None
        );

        AssertRequest(HttpMethod.Get, $"{WorkflowsBasePath}/workflows/{workflowId}");
    }

    [Theory]
    [InlineData(true, "true")]
    [InlineData(false, "false")]
    public async Task ResumeWorkflowAsync_PostsWithExplicitCascade(bool cascade, string expectedCascadeValue)
    {
        var workflowId = Guid.Parse("0f8fad5b-d9cb-469f-a165-70867728950e");

        using var response = await _client.ResumeWorkflowAsync(
            Org,
            App,
            s_environment,
            workflowId,
            cascade,
            CancellationToken.None
        );

        AssertRequest(
            HttpMethod.Post,
            $"{WorkflowsBasePath}/workflows/{workflowId}/resume?cascade={expectedCascadeValue}"
        );
    }

    [Fact]
    public async Task AbandonWorkflowAsync_PostsToAbandon()
    {
        var workflowId = Guid.Parse("0f8fad5b-d9cb-469f-a165-70867728950e");

        using var response = await _client.AbandonWorkflowAsync(
            Org,
            App,
            s_environment,
            workflowId,
            CancellationToken.None
        );

        AssertRequest(HttpMethod.Post, $"{WorkflowsBasePath}/workflows/{workflowId}/abandon");
    }

    [Fact]
    public async Task WorkflowRequests_ReturnNonSuccessResponsesInsteadOfThrowing()
    {
        _messageHandlerMock.Reset();
        _messageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                new HttpResponseMessage(HttpStatusCode.BadGateway)
                {
                    Content = new StringContent(
                        /*lang=json,strict*/
                        """{"type":"urn:altinn:studio:gateway:workflow-engine-unavailable","title":"Workflow engine unavailable","status":502,"detail":"The workflow engine could not be reached."}"""
                    ),
                }
            );

        using var response = await _client.GetWorkflowCollectionsAsync(
            Org,
            App,
            s_environment,
            keys: null,
            failures: null,
            cursor: null,
            pageSize: null,
            CancellationToken.None
        );

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Contains(
            "urn:altinn:studio:gateway:workflow-engine-unavailable",
            await response.Content.ReadAsStringAsync()
        );
    }

    [Fact]
    public async Task WorkflowRequests_WrapEnvironmentsRegistryFailures_WithoutCallingTheGateway()
    {
        var registryFailure = new HttpRequestException("environments.json fetch failed");
        _environmentsServiceMock
            .Setup(service => service.GetAppClusterUri(Org, s_environment.Name))
            .ThrowsAsync(registryFailure);

        var exception = await Assert.ThrowsAsync<EnvironmentsRegistryUnavailableException>(() =>
            _client.AbandonWorkflowAsync(Org, App, s_environment, Guid.NewGuid(), CancellationToken.None)
        );

        Assert.Same(registryFailure, exception.InnerException);
        Assert.Null(_capturedRequest);
    }

    [Fact]
    public async Task WorkflowRequests_PropagateUnknownEnvironmentUnwrapped()
    {
        _environmentsServiceMock
            .Setup(service => service.GetAppClusterUri(Org, s_environment.Name))
            .ThrowsAsync(new KeyNotFoundException("Environment 'at23' not found."));

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _client.AbandonWorkflowAsync(Org, App, s_environment, Guid.NewGuid(), CancellationToken.None)
        );

        Assert.Null(_capturedRequest);
    }
}
