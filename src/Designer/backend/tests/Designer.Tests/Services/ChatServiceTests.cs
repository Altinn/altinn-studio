using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class ChatServiceTests
{
    private readonly Mock<IChatRepository> _repositoryMock;
    private readonly ChatService _chatService;
    private readonly AltinnRepoEditingContext _context = AltinnRepoEditingContext.FromOrgRepoDeveloper(
        "ttd",
        "test-app",
        "testUser"
    );

    public ChatServiceTests()
    {
        _repositoryMock = new Mock<IChatRepository>();
        _chatService = new ChatService(_repositoryMock.Object, TimeProvider.System, new SchedulingSettings());
    }

    [Fact]
    public async Task GetThreadsAsync_ReturnsThreads()
    {
        var expected = new List<ChatThreadEntity> { CreateThreadEntity() };
        _repositoryMock.Setup(r => r.GetThreadsAsync(_context, It.IsAny<CancellationToken>())).ReturnsAsync(expected);

        var result = await _chatService.GetThreadsAsync(_context);

        Assert.Equivalent(expected, result, strict: true);
    }

    [Fact]
    public async Task CreateThreadAsync_BuildsEntityFromContextAndTitle()
    {
        const string Title = "My thread";
        _repositoryMock
            .Setup(r => r.CreateThreadAsync(It.IsAny<ChatThreadEntity>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ChatThreadEntity t, CancellationToken _) => t);

        var result = await _chatService.CreateThreadAsync(Title, _context);

        Assert.Equal(Title, result.Title);
        Assert.Equal(_context.Org, result.Org);
        Assert.Equal(_context.Repo, result.App);
        Assert.Equal(_context.Developer, result.CreatedBy);
        Assert.NotEqual(Guid.Empty, result.Id);
    }

    [Fact]
    public async Task UpdateThreadAsync_UpdatesTitleAndPersists()
    {
        var existingThread = CreateThreadEntity(title: "Old title");
        _repositoryMock
            .Setup(r => r.GetThreadAsync(existingThread.Id, _context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingThread);

        await _chatService.UpdateThreadAsync(existingThread.Id, new UpdateChatThreadRequest("New title"), _context);

        _repositoryMock.Verify(
            r =>
                r.UpdateThreadAsync(
                    It.Is<ChatThreadEntity>(t => t.Title == "New title"),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task UpdateThreadAsync_ReturnsNull_WhenThreadNotFound()
    {
        _repositoryMock
            .Setup(r => r.GetThreadAsync(It.IsAny<Guid>(), _context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(default(ChatThreadEntity));

        var result = await _chatService.UpdateThreadAsync(
            Guid.NewGuid(),
            new UpdateChatThreadRequest("New title"),
            _context
        );

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteThreadAsync_CallsDeleteOnRepository()
    {
        var thread = CreateThreadEntity();
        _repositoryMock
            .Setup(r => r.GetThreadAsync(thread.Id, _context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(thread);

        await _chatService.DeleteThreadAsync(thread.Id, _context);

        _repositoryMock.Verify(r => r.DeleteThreadAsync(thread.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteThreadAsync_DoesNotThrow_WhenThreadNotFound()
    {
        _repositoryMock
            .Setup(r => r.GetThreadAsync(It.IsAny<Guid>(), _context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(default(ChatThreadEntity));

        await _chatService.DeleteThreadAsync(Guid.NewGuid(), _context);

        _repositoryMock.Verify(r => r.DeleteThreadAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteInactiveThreadsAsync_ComputesAndPassesCutoff()
    {
        var fixedNow = new DateTimeOffset(2026, 5, 6, 12, 0, 0, TimeSpan.Zero);
        var fakeTimeProvider = new FakeTimeProvider(fixedNow);
        var schedulingSettings = new SchedulingSettings
        {
            ChatInactivityCleanup = new ChatInactivityCleanupSettings { RetentionDays = 30 },
        };
        var chatService = new ChatService(_repositoryMock.Object, fakeTimeProvider, schedulingSettings);
        DateTime expectedCutoff = fixedNow.UtcDateTime.AddDays(-30);

        await chatService.DeleteInactiveThreadsAsync();

        _repositoryMock.Verify(
            r => r.DeleteInactiveThreadsAsync(expectedCutoff, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task GetMessagesAsync_ReturnsMessages()
    {
        var thread = CreateThreadEntity();
        var expected = new List<ChatMessageEntity> { CreateMessageEntity(thread.Id) };
        _repositoryMock
            .Setup(r => r.GetThreadAsync(thread.Id, _context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(thread);
        _repositoryMock.Setup(r => r.GetMessagesAsync(thread.Id, It.IsAny<CancellationToken>())).ReturnsAsync(expected);

        var result = await _chatService.GetMessagesAsync(thread.Id, _context);

        Assert.Equivalent(expected, result, strict: true);
    }

    [Fact]
    public async Task GetMessagesAsync_ReturnsNull_WhenThreadNotFound()
    {
        _repositoryMock
            .Setup(r => r.GetThreadAsync(It.IsAny<Guid>(), _context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(default(ChatThreadEntity));

        var result = await _chatService.GetMessagesAsync(Guid.NewGuid(), _context);

        Assert.Null(result);
    }

    [Fact]
    public async Task CreateMessageAsync_BuildsEntityFromRequest()
    {
        var thread = CreateThreadEntity();
        var request = new CreateChatMessageRequest(
            Role: Role.User,
            Content: "Hello",
            AllowAppChanges: true,
            AttachmentFileNames: null,
            FilesChanged: null,
            Sources: null
        );
        _repositoryMock
            .Setup(r => r.GetThreadAsync(thread.Id, _context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(thread);
        _repositoryMock
            .Setup(r => r.CreateMessageAsync(It.IsAny<ChatMessageEntity>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ChatMessageEntity m, CancellationToken _) => m);

        var result = await _chatService.CreateMessageAsync(thread.Id, request, _context);

        Assert.Equal(thread.Id, result.ThreadId);
        Assert.Equal(request.Content, result.Content);
        Assert.Equal(request.Role, result.Role);
        Assert.Equal(request.AllowAppChanges, result.AllowAppChanges);
        Assert.NotEqual(Guid.Empty, result.Id);
    }

    [Fact]
    public async Task CreateMessageAsync_ReturnsNull_WhenThreadNotFound()
    {
        _repositoryMock
            .Setup(r => r.GetThreadAsync(It.IsAny<Guid>(), _context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(default(ChatThreadEntity));

        var result = await _chatService.CreateMessageAsync(
            Guid.NewGuid(),
            new CreateChatMessageRequest(
                Role: Role.User,
                Content: "Hello",
                AllowAppChanges: null,
                AttachmentFileNames: null,
                FilesChanged: null,
                Sources: null
            ),
            _context
        );

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteMessageAsync_DelegatesToRepository()
    {
        var thread = CreateThreadEntity();
        var messageId = Guid.NewGuid();
        _repositoryMock
            .Setup(r => r.GetThreadAsync(thread.Id, _context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(thread);

        await _chatService.DeleteMessageAsync(thread.Id, messageId, _context);

        _repositoryMock.Verify(
            r => r.DeleteMessageAsync(thread.Id, messageId, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task DeleteMessageAsync_DoesNotCallDelete_WhenThreadNotFound()
    {
        _repositoryMock
            .Setup(r => r.GetThreadAsync(It.IsAny<Guid>(), _context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(default(ChatThreadEntity));

        await _chatService.DeleteMessageAsync(Guid.NewGuid(), Guid.NewGuid(), _context);

        _repositoryMock.Verify(
            r => r.DeleteMessageAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    private static ChatThreadEntity CreateThreadEntity(string title = "Test thread") =>
        new()
        {
            Id = Guid.CreateVersion7(),
            Title = title,
            Org = "ttd",
            App = "test-app",
            CreatedBy = "testUser",
            CreatedAt = DateTime.UtcNow,
        };

    private static ChatMessageEntity CreateMessageEntity(Guid threadId) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            ThreadId = threadId,
            CreatedAt = DateTime.UtcNow,
            Role = Role.User,
            Content = "Test message",
        };
}
