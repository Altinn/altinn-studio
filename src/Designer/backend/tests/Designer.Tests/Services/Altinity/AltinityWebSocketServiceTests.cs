using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Hubs.Altinity;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Implementation.Altinity;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Designer.Tests.Services.Altinity;

public class AltinityWebSocketServiceTests
{
    private static readonly Guid s_threadId = Guid.NewGuid();
    private static readonly AltinnRepoEditingContext s_editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
        "ttd",
        "test-app",
        "testUser"
    );

    private readonly Mock<IChatService> _chatServiceMock = new();

    [Fact]
    public async Task TryPersistAssistantMessage_PersistsOnceAndEnrichesTheEvent()
    {
        var persisted = CreateMessageEntity();
        _chatServiceMock
            .Setup(s =>
                s.CreateMessageAsync(
                    s_threadId,
                    It.IsAny<CreateChatMessageRequest>(),
                    s_editingContext,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(persisted);
        AltinityWebSocketService service = CreateService();
        service.TrackSessionContext(s_threadId.ToString(), s_editingContext);
        JsonNode message = CreateAssistantMessage();

        await service.TryPersistAssistantMessageAsync(message);

        _chatServiceMock.Verify(
            s =>
                s.CreateMessageAsync(
                    s_threadId,
                    It.Is<CreateChatMessageRequest>(r =>
                        r.Role == Role.Assistant
                        && r.Content == "Ferdig! Endringene er committet."
                        && r.FilesChanged!.Count == 1
                        && r.Sources!.Count == 1
                        && r.Sources[0].Title == "Dynamiske uttrykk"
                        && r.TraceId == "abc123"
                        && r.EventId == "event-123"
                    ),
                    s_editingContext,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        Assert.Equal(persisted.Id.ToString(), message["data"]!["persistedMessageId"]!.GetValue<string>());
    }

    [Fact]
    public async Task TryPersistAssistantMessage_SkipsUnregisteredSessions()
    {
        AltinityWebSocketService service = CreateService();
        JsonNode message = CreateAssistantMessage();

        await service.TryPersistAssistantMessageAsync(message);

        _chatServiceMock.Verify(
            s =>
                s.CreateMessageAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<CreateChatMessageRequest>(),
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        Assert.Null(message["data"]!["persistedMessageId"]);
    }

    [Fact]
    public async Task TryPersistAssistantMessage_IgnoresOtherEventTypes()
    {
        AltinityWebSocketService service = CreateService();
        service.TrackSessionContext(s_threadId.ToString(), s_editingContext);
        JsonNode message = new JsonObject
        {
            ["type"] = "workflow_status",
            ["session_id"] = s_threadId.ToString(),
            ["data"] = new JsonObject { ["message"] = "Vent litt..." },
        };

        await service.TryPersistAssistantMessageAsync(message);

        _chatServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task TryPersistAssistantMessage_LeavesEventUnenrichedWhenPersistenceFails()
    {
        _chatServiceMock
            .Setup(s =>
                s.CreateMessageAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<CreateChatMessageRequest>(),
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new InvalidOperationException("db down"));
        AltinityWebSocketService service = CreateService();
        service.TrackSessionContext(s_threadId.ToString(), s_editingContext);
        JsonNode message = CreateAssistantMessage();

        // Must not throw — the event is forwarded unenriched and the client
        // falls back to persisting its own copy.
        await service.TryPersistAssistantMessageAsync(message);

        Assert.Null(message["data"]!["persistedMessageId"]);
        _chatServiceMock.Verify(
            s =>
                s.CreateMessageAsync(
                    s_threadId,
                    It.IsAny<CreateChatMessageRequest>(),
                    s_editingContext,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task TryPersistAssistantMessage_LeavesEventUnenrichedWhenThreadIsNotOwned()
    {
        _chatServiceMock
            .Setup(s =>
                s.CreateMessageAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<CreateChatMessageRequest>(),
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((ChatMessageEntity)null);
        AltinityWebSocketService service = CreateService();
        service.TrackSessionContext(s_threadId.ToString(), s_editingContext);
        JsonNode message = CreateAssistantMessage();

        await service.TryPersistAssistantMessageAsync(message);

        Assert.Null(message["data"]!["persistedMessageId"]);
        _chatServiceMock.Verify(
            s =>
                s.CreateMessageAsync(
                    s_threadId,
                    It.IsAny<CreateChatMessageRequest>(),
                    s_editingContext,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task TryPersistAssistantMessage_FallsBackToMessageField()
    {
        _chatServiceMock
            .Setup(s =>
                s.CreateMessageAsync(
                    s_threadId,
                    It.Is<CreateChatMessageRequest>(r => r.Content == "Svar i message-feltet"),
                    s_editingContext,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(CreateMessageEntity());
        AltinityWebSocketService service = CreateService();
        service.TrackSessionContext(s_threadId.ToString(), s_editingContext);
        JsonNode message = new JsonObject
        {
            ["type"] = "assistant_message",
            ["session_id"] = s_threadId.ToString(),
            ["data"] = new JsonObject { ["message"] = "Svar i message-feltet" },
        };

        await service.TryPersistAssistantMessageAsync(message);

        Assert.NotNull(message["data"]!["persistedMessageId"]);
    }

    [Fact]
    public async Task RemoveSessionContextsForDeveloper_EvictsOnlyThatDevelopersSessions()
    {
        var otherContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "other-app", "otherUser");
        var otherThreadId = Guid.NewGuid();
        _chatServiceMock
            .Setup(s =>
                s.CreateMessageAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<CreateChatMessageRequest>(),
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(CreateMessageEntity());
        AltinityWebSocketService service = CreateService();
        service.TrackSessionContext(s_threadId.ToString(), s_editingContext);
        service.TrackSessionContext(otherThreadId.ToString(), otherContext);

        service.RemoveSessionContextsForDeveloper(s_editingContext.Developer);

        // Evicted session: no context → persistence is left to the client.
        JsonNode evicted = CreateAssistantMessage();
        await service.TryPersistAssistantMessageAsync(evicted);
        Assert.Null(evicted["data"]!["persistedMessageId"]);

        // The other developer's session is untouched.
        JsonNode kept = new JsonObject
        {
            ["type"] = "assistant_message",
            ["session_id"] = otherThreadId.ToString(),
            ["data"] = new JsonObject { ["content"] = "Svar" },
        };
        await service.TryPersistAssistantMessageAsync(kept);
        Assert.NotNull(kept["data"]!["persistedMessageId"]);
    }

    [Fact]
    public async Task TryPersistAssistantMessage_SkipsMessagesWithoutContent()
    {
        AltinityWebSocketService service = CreateService();
        service.TrackSessionContext(s_threadId.ToString(), s_editingContext);
        JsonNode message = new JsonObject
        {
            ["type"] = "assistant_message",
            ["session_id"] = s_threadId.ToString(),
            ["data"] = new JsonObject { ["sources"] = new JsonArray() },
        };

        await service.TryPersistAssistantMessageAsync(message);

        _chatServiceMock.VerifyNoOtherCalls();
    }

    private AltinityWebSocketService CreateService()
    {
        var services = new ServiceCollection();
        services.AddTransient(_ => _chatServiceMock.Object);
        ServiceProvider provider = services.BuildServiceProvider();

        return new AltinityWebSocketService(
            NullLogger<AltinityWebSocketService>.Instance,
            Options.Create(new AltinitySettings { AgentUrl = "http://altinn-altinity-agents" }),
            Mock.Of<IHubContext<AltinityProxyHub, IAltinityClient>>(),
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
