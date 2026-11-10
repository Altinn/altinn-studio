using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Hubs.Assistant;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Implementation.Assistant;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Designer.Tests.Services.Assistant;

public class AssistantWebSocketServiceTests
{
    private const string Developer = "testUser";
    private static readonly Guid s_threadId = Guid.NewGuid();

    private readonly Mock<IChatService> _chatServiceMock = new();

    [Fact]
    public async Task TryPersistAssistantMessage_SavesInTheDevelopersThreadWithoutARegisteredSession()
    {
        var persisted = CreateMessageEntity();
        _chatServiceMock
            .Setup(s =>
                s.CreateMessageInDeveloperThreadAsync(
                    s_threadId,
                    Developer,
                    It.IsAny<CreateChatMessageRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(persisted);
        // The test does not register the session, as on a replica that only gets the developer's events.
        AssistantWebSocketService service = CreateService();
        JsonNode message = CreateAssistantMessage();

        await service.TryPersistAssistantMessageAsync(Developer, message);

        _chatServiceMock.Verify(
            s =>
                s.CreateMessageInDeveloperThreadAsync(
                    s_threadId,
                    Developer,
                    It.Is<CreateChatMessageRequest>(r =>
                        r.Role == Role.Assistant
                        && r.Content == "Ferdig! Endringene er committet."
                        && r.FilesChanged!.Count == 1
                        && r.Sources!.Count == 1
                        && r.Sources[0].Title == "Dynamiske uttrykk"
                        && r.TraceId == "abc123"
                        && r.EventId == "event-123"
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        Assert.Equal(persisted.Id.ToString(), message["data"]!["persistedMessageId"]!.GetValue<string>());
    }

    [Fact]
    public async Task TryPersistAssistantMessage_IgnoresOtherEventTypes()
    {
        AssistantWebSocketService service = CreateService();
        JsonNode message = new JsonObject
        {
            ["type"] = "workflow_status",
            ["session_id"] = s_threadId.ToString(),
            ["data"] = new JsonObject { ["message"] = "Vent litt..." },
        };

        await service.TryPersistAssistantMessageAsync(Developer, message);

        _chatServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task TryPersistAssistantMessage_LeavesEventUnenrichedWhenPersistenceFails()
    {
        _chatServiceMock
            .Setup(s =>
                s.CreateMessageInDeveloperThreadAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<CreateChatMessageRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new InvalidOperationException("db down"));
        AssistantWebSocketService service = CreateService();
        JsonNode message = CreateAssistantMessage();

        // Must not throw, so that the listener still forwards the event.
        await service.TryPersistAssistantMessageAsync(Developer, message);

        Assert.Null(message["data"]!["persistedMessageId"]);
    }

    [Fact]
    public async Task TryPersistAssistantMessage_LeavesEventUnenrichedWhenTheDeveloperHasNoSuchThread()
    {
        _chatServiceMock
            .Setup(s =>
                s.CreateMessageInDeveloperThreadAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<CreateChatMessageRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((ChatMessageEntity)null);
        AssistantWebSocketService service = CreateService();
        JsonNode message = CreateAssistantMessage();

        await service.TryPersistAssistantMessageAsync(Developer, message);

        Assert.Null(message["data"]!["persistedMessageId"]);
    }

    [Fact]
    public async Task TryPersistAssistantMessage_FallsBackToMessageField()
    {
        _chatServiceMock
            .Setup(s =>
                s.CreateMessageInDeveloperThreadAsync(
                    s_threadId,
                    Developer,
                    It.Is<CreateChatMessageRequest>(r => r.Content == "Svar i message-feltet"),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(CreateMessageEntity());
        AssistantWebSocketService service = CreateService();
        JsonNode message = new JsonObject
        {
            ["type"] = "assistant_message",
            ["session_id"] = s_threadId.ToString(),
            ["data"] = new JsonObject { ["message"] = "Svar i message-feltet" },
        };

        await service.TryPersistAssistantMessageAsync(Developer, message);

        Assert.NotNull(message["data"]!["persistedMessageId"]);
    }

    [Fact]
    public async Task TryPersistAssistantMessage_SavesTheAnswerWhenOtherFieldsHaveUnexpectedTypes()
    {
        List<CreateChatMessageRequest> requests = SetupSavesAndCaptureRequests();
        AssistantWebSocketService service = CreateService();
        JsonNode message = JsonNode.Parse(
            $$"""
            {
              "type": "assistant_message",
              "session_id": "{{s_threadId}}",
              "data": {
                "content": "Svar",
                "filesChanged": "App/ui/form/layouts/Side1.json",
                "sources": [{"url": "https://docs.altinn.studio/x"}],
                "traceId": 123,
                "attachmentInstructionFlagged": "yes",
                "eventId": "event-123"
              }
            }
            """
        )!;

        await service.TryPersistAssistantMessageAsync(Developer, message);

        CreateChatMessageRequest request = Assert.Single(requests);
        Assert.Equal("Svar", request.Content);
        Assert.Equal("event-123", request.EventId);
        Assert.Null(request.FilesChanged);
        Assert.Null(request.Sources);
        Assert.Null(request.TraceId);
        Assert.Null(request.AttachmentInstructionFlagged);
        Assert.NotNull(message["data"]!["persistedMessageId"]);
    }

    [Fact]
    public async Task TryPersistAssistantMessage_GivesEachCopyOfAnAnswerWithoutEventIdTheSameEventId()
    {
        List<CreateChatMessageRequest> requests = SetupSavesAndCaptureRequests();
        AssistantWebSocketService service = CreateService();

        // Each replica gets its own copy of the event.
        JsonNode firstCopy = CreateAssistantMessageWithoutEventId("Svar");
        JsonNode secondCopy = CreateAssistantMessageWithoutEventId("Svar");
        JsonNode otherAnswer = CreateAssistantMessageWithoutEventId("Et annet svar");
        await service.TryPersistAssistantMessageAsync(Developer, firstCopy);
        await service.TryPersistAssistantMessageAsync(Developer, secondCopy);
        await service.TryPersistAssistantMessageAsync(Developer, otherAnswer);

        Assert.Equal(3, requests.Count);
        Assert.False(string.IsNullOrEmpty(requests[0].EventId));
        Assert.Equal(requests[0].EventId, requests[1].EventId);
        Assert.NotEqual(requests[0].EventId, requests[2].EventId);
        // The browser uses the id to handle the copies of one answer one time.
        Assert.Equal(requests[0].EventId, firstCopy["data"]!["eventId"]!.GetValue<string>());
    }

    [Fact]
    public async Task RegisterSession_OpensTheConnectionWhenItIsClosed()
    {
        var firstFrame = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        await using WebApplication agent = await StartAgentThatReadsOneFrameAsync(firstFrame);
        using AssistantWebSocketService service = CreateService(agent.Urls.First());

        // No EnsureConnectedAsync first, as when the assistant service closed the connection after the hub connected.
        await service.RegisterSessionAsync(s_threadId.ToString(), Developer);

        JsonNode frame = JsonNode.Parse(await firstFrame.Task.WaitAsync(TimeSpan.FromSeconds(10)))!;
        Assert.Equal("session", frame["type"]!.GetValue<string>());
        Assert.Equal(s_threadId.ToString(), frame["session_id"]!.GetValue<string>());
        Assert.Equal(Developer, frame["developer"]!.GetValue<string>());
    }

    [Fact]
    public async Task TryPersistAssistantMessage_SkipsMessagesWithoutContent()
    {
        AssistantWebSocketService service = CreateService();
        JsonNode message = new JsonObject
        {
            ["type"] = "assistant_message",
            ["session_id"] = s_threadId.ToString(),
            ["data"] = new JsonObject { ["sources"] = new JsonArray() },
        };

        await service.TryPersistAssistantMessageAsync(Developer, message);

        _chatServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ListenerForwardsEachMessageInARootSpanWithTheUser()
    {
        await using WebApplication agent = await StartAgentThatSendsOneMessageAsync();
        var assistantClient = new Mock<IAssistantClient>();
        var clients = new Mock<IHubClients<IAssistantClient>>();
        clients.Setup(c => c.Group(Developer)).Returns(assistantClient.Object);
        var hubContext = new Mock<IHubContext<AssistantProxyHub, IAssistantClient>>();
        hubContext.Setup(h => h.Clients).Returns(clients.Object);
        var spans = new List<Activity>();
        // Initializes ServiceTelemetry first: creating its ActivitySource calls the listener's filter.
        string sourceName = ServiceTelemetry.Source.Name;
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == sourceName,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity =>
            {
                lock (spans)
                {
                    spans.Add(activity);
                }
            },
        };
        ActivitySource.AddActivityListener(listener);
        using AssistantWebSocketService service = CreateService(agent.Urls.First(), hubContext.Object);

        // The listener is started from a short-lived span, such as a hub's connect.
        using (Activity caller = new Activity("caller").SetIdFormat(ActivityIdFormat.W3C).Start())
        {
            await service.EnsureConnectedAsync(Developer);
        }

        Activity forwarded = await ForwardedMessageSpanAsync(spans, Developer);
        Assert.Equal(default, forwarded.ParentSpanId);
        Assert.Equal(ActivityKind.Consumer, forwarded.Kind);
        assistantClient.Verify(c => c.ReceiveAgentMessage(It.IsAny<object>()), Times.Once);
    }

    private static async Task<Activity> ForwardedMessageSpanAsync(List<Activity> spans, string developer)
    {
        for (int attempt = 0; attempt < 100; attempt++)
        {
            lock (spans)
            {
                Activity span = spans.Find(span =>
                    span.DisplayName == "AssistantWebSocketService.ForwardMessage"
                    && span.GetTagItem(ServiceTelemetry.Attributes.EndUserId) as string == developer
                );
                if (span is not null)
                {
                    return span;
                }
            }
            await Task.Delay(50);
        }
        throw new TimeoutException("The listener forwarded no message.");
    }

    private static async Task<WebApplication> StartAgentThatSendsOneMessageAsync()
    {
        WebApplicationBuilder builder = WebApplication.CreateSlimBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        WebApplication agent = builder.Build();
        agent.UseWebSockets();
        agent.Run(async context =>
        {
            using WebSocket webSocket = await context.WebSockets.AcceptWebSocketAsync();
            byte[] message = Encoding.UTF8.GetBytes("""{"type":"assistant_message","content":"hello"}""");
            await webSocket.SendAsync(message, WebSocketMessageType.Text, true, CancellationToken.None);
            try
            {
                await webSocket.ReceiveAsync(new byte[256], CancellationToken.None);
            }
            catch (WebSocketException) { }
        });
        await agent.StartAsync();
        return agent;
    }

    private static async Task<WebApplication> StartAgentThatReadsOneFrameAsync(TaskCompletionSource<string> firstFrame)
    {
        WebApplicationBuilder builder = WebApplication.CreateSlimBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        WebApplication agent = builder.Build();
        agent.UseWebSockets();
        agent.Run(async context =>
        {
            using WebSocket webSocket = await context.WebSockets.AcceptWebSocketAsync();
            byte[] buffer = new byte[1024];
            try
            {
                WebSocketReceiveResult frame = await webSocket.ReceiveAsync(buffer, CancellationToken.None);
                firstFrame.TrySetResult(Encoding.UTF8.GetString(buffer, 0, frame.Count));
                await webSocket.ReceiveAsync(buffer, CancellationToken.None);
            }
            catch (WebSocketException) { }
        });
        await agent.StartAsync();
        return agent;
    }

    private List<CreateChatMessageRequest> SetupSavesAndCaptureRequests()
    {
        var requests = new List<CreateChatMessageRequest>();
        _chatServiceMock
            .Setup(s =>
                s.CreateMessageInDeveloperThreadAsync(
                    s_threadId,
                    Developer,
                    Capture.In(requests),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(CreateMessageEntity());
        return requests;
    }

    private static JsonNode CreateAssistantMessageWithoutEventId(string content)
    {
        return new JsonObject
        {
            ["type"] = "assistant_message",
            ["session_id"] = s_threadId.ToString(),
            ["data"] = new JsonObject { ["content"] = content },
        };
    }

    private AssistantWebSocketService CreateService(
        string agentUrl = "http://altinn-altinity-agents",
        IHubContext<AssistantProxyHub, IAssistantClient> hubContext = null
    )
    {
        var services = new ServiceCollection();
        services.AddTransient(_ => _chatServiceMock.Object);
        ServiceProvider provider = services.BuildServiceProvider();

        return new AssistantWebSocketService(
            NullLogger<AssistantWebSocketService>.Instance,
            Options.Create(new AssistantSettings { AgentUrl = agentUrl }),
            hubContext ?? Mock.Of<IHubContext<AssistantProxyHub, IAssistantClient>>(),
            provider.GetRequiredService<IServiceScopeFactory>()
        );
    }

    private static JsonNode CreateAssistantMessage()
    {
        return JsonNode.Parse(
            $$"""
            {
              "type": "assistant_message",
              "session_id": "{{s_threadId}}",
              "data": {
                "content": "Ferdig! Endringene er committet.",
                "filesChanged": ["App/ui/form/layouts/Side1.json"],
                "sources": [{"title": "Dynamiske uttrykk", "url": "https://docs.altinn.studio/x", "kind": "skill"}],
                "traceId": "abc123",
                "eventId": "event-123"
              }
            }
            """
        )!;
    }

    private static ChatMessageEntity CreateMessageEntity()
    {
        return new ChatMessageEntity
        {
            Id = Guid.CreateVersion7(),
            ThreadId = s_threadId,
            CreatedAt = DateTime.UtcNow,
            Role = Role.Assistant,
            Content = "Ferdig! Endringene er committet.",
        };
    }
}
