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
            null,
            new Dictionary<string, string> { ["org"] = "ttd" },
            [PersistentItemStatus.Enqueued, PersistentItemStatus.Failed]
        );

        // Assert
        Assert.Equal(2, workflows.Count);
        Assert.Equal("first-workflow", workflows[0].OperationId);
        Assert.Equal("second-workflow", workflows[1].OperationId);

        Assert.Equal(
            "http://workflow-engine/api/v1/ttd%2Fapp/workflows?label=org:ttd&status=Enqueued&status=Failed",
            requestUris[0]!.ToString()
        );
        Assert.Equal(
            $"http://workflow-engine/api/v1/ttd%2Fapp/workflows?label=org:ttd&status=Enqueued&status=Failed&cursor={nextCursor}",
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
                                        StepsCompleted = 1,
                                        StepsTotal = 1,
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
            "process-next:abc:Task_1:2",
            new WorkflowEnqueueRequest { Workflows = [] }
        );

        Assert.NotNull(capturedRequest);
        Assert.True(capturedRequest!.Headers.TryGetValues("Collection-Key", out IEnumerable<string>? headerValues));
        Assert.Equal(["process-next:abc:Task_1:2"], headerValues);
    }

    [Theory]
    [InlineData(HttpStatusCode.Created)]
    [InlineData(HttpStatusCode.OK)]
    public async Task MintMailbox_PostsToMailboxEndpointAndReadsTheMailbox(HttpStatusCode statusCode)
    {
        HttpRequestMessage? capturedRequest = null;
        string? capturedBody = null;
        Guid mailboxId = Guid.NewGuid();
        DateTimeOffset deadline = new(2026, 9, 9, 12, 0, 0, TimeSpan.Zero);

        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns<HttpRequestMessage, CancellationToken>(
                async (request, ct) =>
                {
                    capturedRequest = request;
                    capturedBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(ct);
                    HttpResponseMessage response = CreateJsonResponse(
                        new MailboxResponse
                        {
                            Id = mailboxId,
                            Namespace = "ttd/app",
                            IdempotencyKey = "step-key",
                            CollectionKey = "collection-key",
                            Timeout = TimeSpan.FromDays(3),
                            Deadline = deadline,
                            Status = MailboxStatus.Open,
                            NextIdx = 0,
                            NextSeq = 0,
                            CreatedAt = deadline - TimeSpan.FromDays(3),
                        }
                    );
                    response.StatusCode = statusCode;
                    return response;
                }
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        MailboxMintResult result = await client.MintMailbox(
            "ttd/app",
            new MailboxCreateRequest
            {
                IdempotencyKey = "step-key",
                Timeout = TimeSpan.FromDays(3),
                CollectionKey = "collection-key",
            }
        );

        MailboxMintResult.Minted minted = Assert.IsType<MailboxMintResult.Minted>(result);
        Assert.Equal(mailboxId, minted.Mailbox.Id);
        Assert.Equal(deadline, minted.Mailbox.Deadline);

        Assert.NotNull(capturedRequest);
        Assert.Equal(HttpMethod.Post, capturedRequest!.Method);
        Assert.Equal("http://workflow-engine/api/v1/ttd%2Fapp/mailboxes", capturedRequest.RequestUri!.ToString());
        Assert.NotNull(capturedBody);
        using JsonDocument body = JsonDocument.Parse(capturedBody!);
        Assert.Equal("step-key", body.RootElement.GetProperty("idempotencyKey").GetString());
        Assert.Equal("collection-key", body.RootElement.GetProperty("collectionKey").GetString());
        Assert.Equal("3.00:00:00", body.RootElement.GetProperty("timeout").GetString());
    }

    [Fact]
    public async Task MintMailbox_BadRequest_ReturnsRejectedCarryingTheEngineDetail()
    {
        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns<HttpRequestMessage, CancellationToken>(
                (_, _) =>
                    Task.FromResult(
                        new HttpResponseMessage
                        {
                            StatusCode = HttpStatusCode.BadRequest,
                            Content = new StringContent(
                                """{"title":"Bad Request","status":400,"detail":"Timeout 30.00:00:00 exceeds the maximum mailbox timeout of 21.00:00:00."}""",
                                Encoding.UTF8,
                                "application/problem+json"
                            ),
                        }
                    )
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        MailboxMintResult result = await client.MintMailbox(
            "ttd/app",
            new MailboxCreateRequest { IdempotencyKey = "step-key", Timeout = TimeSpan.FromDays(30) }
        );

        MailboxMintResult.Rejected rejected = Assert.IsType<MailboxMintResult.Rejected>(result);
        Assert.Equal("Timeout 30.00:00:00 exceeds the maximum mailbox timeout of 21.00:00:00.", rejected.Detail);
    }

    [Fact]
    public async Task MintMailbox_TooManyRequests_ReturnsAtCapacityCarryingTheEngineDetail()
    {
        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns<HttpRequestMessage, CancellationToken>(
                (_, _) =>
                    Task.FromResult(
                        new HttpResponseMessage
                        {
                            StatusCode = HttpStatusCode.TooManyRequests,
                            Content = new StringContent(
                                """{"title":"Too Many Requests","status":429,"detail":"Collection 'inst-1' already holds the maximum of 100 open mailboxes."}""",
                                Encoding.UTF8,
                                "application/problem+json"
                            ),
                        }
                    )
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        MailboxMintResult result = await client.MintMailbox(
            "ttd/app",
            new MailboxCreateRequest { IdempotencyKey = "step-key", Timeout = TimeSpan.FromDays(3) }
        );

        MailboxMintResult.AtCapacity atCapacity = Assert.IsType<MailboxMintResult.AtCapacity>(result);
        Assert.Equal("Collection 'inst-1' already holds the maximum of 100 open mailboxes.", atCapacity.Detail);
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task MintMailbox_OtherFailures_Throw(HttpStatusCode statusCode)
    {
        // 400 and 429 are the only statuses modeled as values; every other unsuccessful status throws to put
        // the step back on its ladder.
        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns<HttpRequestMessage, CancellationToken>(
                (_, _) =>
                    Task.FromResult(
                        new HttpResponseMessage
                        {
                            StatusCode = statusCode,
                            Content = new StringContent("{}", Encoding.UTF8, "application/problem+json"),
                        }
                    )
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.MintMailbox(
                "ttd/app",
                new MailboxCreateRequest { IdempotencyKey = "step-key", Timeout = TimeSpan.FromDays(3) }
            )
        );
    }

    [Theory]
    [InlineData(HttpStatusCode.Accepted)]
    [InlineData(HttpStatusCode.OK)]
    public async Task DeliverToMailbox_PostsToTheDeliveriesEndpointAndReadsThePosition(HttpStatusCode statusCode)
    {
        HttpRequestMessage? capturedRequest = null;
        string? capturedBody = null;
        Guid mailboxId = Guid.NewGuid();

        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns<HttpRequestMessage, CancellationToken>(
                async (request, ct) =>
                {
                    capturedRequest = request;
                    capturedBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(ct);
                    HttpResponseMessage response = CreateJsonResponse(
                        new MailboxDeliveryResponse
                        {
                            MailboxId = mailboxId,
                            Idx = 4,
                            IdempotencyKey = "fiks-message-42",
                            AcceptedAt = new DateTimeOffset(2026, 8, 20, 9, 0, 0, TimeSpan.Zero),
                        }
                    );
                    response.StatusCode = statusCode;
                    return response;
                }
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        MailboxDeliveryResult result = await client.DeliverToMailbox(
            "ttd/app",
            mailboxId,
            new MailboxDeliveryRequest { IdempotencyKey = "fiks-message-42", Payload = "sealed-envelope" }
        );

        Assert.Equal(statusCode, result.StatusCode);
        Assert.Equal(4, result.Body!.Idx);
        Assert.Null(result.ErrorDetail);

        Assert.NotNull(capturedRequest);
        Assert.Equal(HttpMethod.Post, capturedRequest!.Method);
        Assert.Equal(
            $"http://workflow-engine/api/v1/ttd%2Fapp/mailboxes/{mailboxId}/deliveries",
            capturedRequest.RequestUri!.ToString()
        );
        Assert.NotNull(capturedBody);
        using JsonDocument body = JsonDocument.Parse(capturedBody!);
        Assert.Equal("fiks-message-42", body.RootElement.GetProperty("idempotencyKey").GetString());
        Assert.Equal("sealed-envelope", body.RootElement.GetProperty("payload").GetString());
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.Conflict)]
    [InlineData(HttpStatusCode.RequestEntityTooLarge)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.InternalServerError)]
    public async Task DeliverToMailbox_UnsuccessfulStatuses_ComeBackAsValuesWithTheEngineDetail(
        HttpStatusCode statusCode
    )
    {
        // None of these throws: each is a decision the receiving channel makes about its own message.
        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                new HttpResponseMessage
                {
                    StatusCode = statusCode,
                    Content = new StringContent(
                        """{"detail":"Mailbox 018f4e00 was closed at its deadline."}""",
                        Encoding.UTF8,
                        "application/problem+json"
                    ),
                }
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        MailboxDeliveryResult result = await client.DeliverToMailbox(
            "ttd/app",
            Guid.NewGuid(),
            new MailboxDeliveryRequest { IdempotencyKey = "fiks-message-42", Payload = "sealed-envelope" }
        );

        Assert.Equal(statusCode, result.StatusCode);
        Assert.Null(result.Body);
        Assert.Contains("closed at its deadline", result.ErrorDetail!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task DeliverToMailbox_AcceptedWithAnUnreadableBody_StillReportsAcceptance()
    {
        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.Accepted,
                    Content = new StringContent("not json at all", Encoding.UTF8, "application/json"),
                }
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        MailboxDeliveryResult result = await client.DeliverToMailbox(
            "ttd/app",
            Guid.NewGuid(),
            new MailboxDeliveryRequest { IdempotencyKey = "fiks-message-42", Payload = "sealed-envelope" }
        );

        Assert.Equal(HttpStatusCode.Accepted, result.StatusCode);
        Assert.Null(result.Body);
        Assert.Null(result.ErrorDetail);
    }

    [Fact]
    public async Task DeliverToMailbox_OverlongErrorBody_IsTruncated()
    {
        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.BadGateway,
                    Content = new StringContent(new string('x', 5000), Encoding.UTF8, "text/html"),
                }
            );
        handlerMock.Protected().Setup("Dispose", ItExpr.IsAny<bool>());

        using var httpClient = new HttpClient(handlerMock.Object);
        var client = new WorkflowEngineClient(
            httpClient,
            Options.Create(new PlatformSettings { ApiWorkflowEngineEndpoint = "http://workflow-engine/api/v1/" }),
            Mock.Of<ILogger<WorkflowEngineClient>>()
        );

        MailboxDeliveryResult result = await client.DeliverToMailbox(
            "ttd/app",
            Guid.NewGuid(),
            new MailboxDeliveryRequest { IdempotencyKey = "fiks-message-42", Payload = "sealed-envelope" }
        );

        Assert.Equal(512, result.ErrorDetail!.Length);
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
