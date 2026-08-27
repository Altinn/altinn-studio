using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ChatController;

public class SubmitFeedbackTests : ChatControllerTestsBase<SubmitFeedbackTests>
{
    private const string TraceId = "trace-abc-123";
    private static string FeedbackUrl => $"designer/api/{Org}/{App}/chat/feedback/{TraceId}";

    private readonly Mock<IAltinityAgentClient> _altinityAgentClientMock = new();

    public SubmitFeedbackTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_altinityAgentClientMock.Object);
    }

    [Fact]
    public async Task SubmitFeedback_WithValidThumbsUp_ForwardsToAgentAndReturnsNoContent()
    {
        var request = new ChatFeedbackRequest(true, null);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Put, FeedbackUrl)
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _altinityAgentClientMock.Verify(
            client => client.SendFeedbackAsync(Developer, TraceId, true, null, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task SubmitFeedback_WithThumbsDownAndComment_ForwardsCommentToAgent()
    {
        var request = new ChatFeedbackRequest(false, "Svaret traff ikke helt.");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Put, FeedbackUrl)
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _altinityAgentClientMock.Verify(
            client =>
                client.SendFeedbackAsync(
                    Developer,
                    TraceId,
                    false,
                    "Svaret traff ikke helt.",
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task ClearFeedback_ForwardsToAgentAndReturnsNoContent()
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, FeedbackUrl);

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _altinityAgentClientMock.Verify(
            client => client.ClearFeedbackAsync(Developer, TraceId, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task SubmitFeedback_StoresTheVoteOnTheMessageWithThatTraceId()
    {
        var thread = await SeedThreadAsync();
        var message = await SeedAssistantMessageWithTraceAsync(thread.Id, TraceId);

        var request = new ChatFeedbackRequest(true, null);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Put, FeedbackUrl)
        {
            Content = CreateJsonContent(request),
        };
        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var stored = await DesignerDbFixture.DbContext.ChatMessages.FindAsync(message.Id);
        Assert.True(stored!.FeedbackThumbsUp);
    }

    [Fact]
    public async Task ClearFeedback_NullsTheStoredVote()
    {
        var thread = await SeedThreadAsync();
        var message = await SeedAssistantMessageWithTraceAsync(thread.Id, TraceId, thumbsUp: false);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, FeedbackUrl);
        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var stored = await DesignerDbFixture.DbContext.ChatMessages.FindAsync(message.Id);
        Assert.Null(stored!.FeedbackThumbsUp);
    }

    private async Task<ChatMessageDbModel> SeedAssistantMessageWithTraceAsync(
        Guid threadId,
        string traceId,
        bool? thumbsUp = null
    )
    {
        var message = new ChatMessageDbModel
        {
            Id = Guid.CreateVersion7(),
            ThreadId = threadId,
            CreatedAt = DateTime.UtcNow,
            Role = Role.Assistant,
            Content = "Svar",
            TraceId = traceId,
            FeedbackThumbsUp = thumbsUp,
        };
        await DesignerDbFixture.DbContext.ChatMessages.AddAsync(message);
        await DesignerDbFixture.DbContext.SaveChangesAsync();
        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        return message;
    }
}
