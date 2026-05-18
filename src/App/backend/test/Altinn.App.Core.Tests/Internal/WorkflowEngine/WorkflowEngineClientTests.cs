using System.Net;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowEngineClientTests
{
    [Fact]
    public async Task ListWorkflows_FollowsCursorPaginationAndReturnsAllPages()
    {
        // Arrange
        Guid correlationId = Guid.NewGuid();
        Guid nextCursor = Guid.NewGuid();
        var requestUris = new List<Uri?>();
        int requestCount = 0;

        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns<HttpRequestMessage, CancellationToken>(
                (request, _) =>
                {
                    requestUris.Add(request.RequestUri);

                    requestCount++;
                    return requestCount switch
                    {
                        1 => Task.FromResult(
                            CreateJsonResponse(
                                new PaginatedResponse<WorkflowStatusResponse>
                                {
                                    Data = [CreateWorkflowStatusResponse("first-workflow")],
                                    PageSize = 1,
                                    TotalCount = 2,
                                    NextCursor = nextCursor,
                                }
                            )
                        ),
                        2 => Task.FromResult(
                            CreateJsonResponse(
                                new PaginatedResponse<WorkflowStatusResponse>
                                {
                                    Data = [CreateWorkflowStatusResponse("second-workflow")],
                                    PageSize = 1,
                                    TotalCount = 2,
                                    NextCursor = null,
                                }
                            )
                        ),
                        _ => throw new InvalidOperationException("Unexpected extra request."),
                    };
                }
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        // Act
        IReadOnlyList<WorkflowStatusResponse> workflows = await client.ListWorkflows(
            "ttd/app",
            correlationId,
            null,
            new Dictionary<string, string> { ["org"] = "ttd" },
            [PersistentItemStatus.Enqueued, PersistentItemStatus.Failed]
        );

        // Assert
        Assert.Equal(2, workflows.Count);
        Assert.Equal("first-workflow", workflows[0].OperationId);
        Assert.Equal("second-workflow", workflows[1].OperationId);

        Assert.Equal(
            $"http://workflow-engine/api/v1/ttd%2Fapp/workflows?correlationId={correlationId}&label=org:ttd&status=Enqueued&status=Failed",
            requestUris[0]!.ToString()
        );
        Assert.Equal(
            $"http://workflow-engine/api/v1/ttd%2Fapp/workflows?correlationId={correlationId}&label=org:ttd&status=Enqueued&status=Failed&cursor={nextCursor}",
            requestUris[1]!.ToString()
        );

        handlerMock
            .Protected()
            .Verify(
                "SendAsync",
                Times.Exactly(2),
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            );
    }

    [Fact]
    public async Task GetCollection_UsesCollectionEndpoint()
    {
        var requestUris = new List<Uri?>();

        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns<HttpRequestMessage, CancellationToken>(
                (request, _) =>
                {
                    requestUris.Add(request.RequestUri);
                    return Task.FromResult(
                        CreateJsonResponse(
                            new WorkflowCollectionDetailResponse
                            {
                                Key = "process-next:abc:Task_1:2",
                                Namespace = "ttd/app",
                                Heads =
                                [
                                    new CollectionHeadStatus
                                    {
                                        DatabaseId = Guid.NewGuid(),
                                        Status = PersistentItemStatus.Completed,
                                    },
                                ],
                                CreatedAt = DateTimeOffset.UtcNow,
                                UpdatedAt = DateTimeOffset.UtcNow,
                            }
                        )
                    );
                }
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        WorkflowCollectionDetailResponse? collection = await client.GetCollection(
            "ttd/app",
            "process-next:abc:Task_1:2"
        );

        Assert.NotNull(collection);
        Assert.Equal("process-next:abc:Task_1:2", collection.Key);
        Assert.Equal(
            "http://workflow-engine/api/v1/ttd%2Fapp/collections/process-next%3Aabc%3ATask_1%3A2",
            requestUris[0]!.ToString()
        );
    }

    [Theory]
    [InlineData(false, "false")]
    [InlineData(true, "true")]
    public async Task ResumeWorkflow_SendsExplicitCascadeQuery(bool cascade, string expectedCascadeValue)
    {
        HttpRequestMessage? capturedRequest = null;
        Guid workflowId = Guid.NewGuid();

        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns<HttpRequestMessage, CancellationToken>(
                (request, _) =>
                {
                    capturedRequest = request;
                    return Task.FromResult(
                        CreateJsonResponse(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []))
                    );
                }
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        await client.ResumeWorkflow("ttd/app", workflowId, cascade);

        Assert.NotNull(capturedRequest);
        Assert.Equal(HttpMethod.Post, capturedRequest!.Method);
        Assert.Equal(
            $"http://workflow-engine/api/v1/ttd%2Fapp/workflows/{workflowId}/resume?cascade={expectedCascadeValue}",
            capturedRequest.RequestUri!.ToString()
        );
    }

    [Fact]
    public async Task EnqueueWorkflows_SendsCollectionKeyHeader()
    {
        HttpRequestMessage? capturedRequest = null;

        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns<HttpRequestMessage, CancellationToken>(
                (request, _) =>
                {
                    capturedRequest = request;
                    return Task.FromResult(
                        CreateJsonResponse(
                            new WorkflowEnqueueResponse.Accepted
                            {
                                Workflows = [new WorkflowResult { DatabaseId = Guid.NewGuid(), Namespace = "ttd/app" }],
                            }
                        )
                    );
                }
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        await client.EnqueueWorkflows(
            "ttd/app",
            "idempotency-key",
            Guid.NewGuid(),
            "process-next:abc:Task_1:2",
            new WorkflowEnqueueRequest { Workflows = [] }
        );

        Assert.NotNull(capturedRequest);
        Assert.True(capturedRequest!.Headers.TryGetValues("Collection-Key", out IEnumerable<string>? headerValues));
        Assert.Equal(["process-next:abc:Task_1:2"], headerValues);
    }

    private static HttpResponseMessage CreateJsonResponse<T>(T body) =>
        new()
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
        };

    private static WorkflowStatusResponse CreateWorkflowStatusResponse(string operationId) =>
        new()
        {
            DatabaseId = Guid.NewGuid(),
            CorrelationId = Guid.NewGuid(),
            OperationId = operationId,
            IdempotencyKey = $"{operationId}-key",
            Namespace = "ttd/app",
            CreatedAt = DateTimeOffset.UtcNow,
            OverallStatus = PersistentItemStatus.Processing,
            Steps =
            [
                new StepStatusResponse
                {
                    DatabaseId = Guid.NewGuid(),
                    OperationId = $"{operationId}-step",
                    ProcessingOrder = 1,
                    Command = new StepStatusResponse.CommandDetails { Type = "app" },
                    Status = PersistentItemStatus.Processing,
                    RetryCount = 0,
                },
            ],
        };
}
