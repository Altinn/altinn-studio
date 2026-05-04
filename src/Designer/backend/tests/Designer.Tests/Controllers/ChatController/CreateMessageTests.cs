using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.Controllers.ChatController;

public class CreateMessageTests : ChatControllerTestsBase<CreateMessageTests>
{
    public CreateMessageTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task CreateMessage_ReturnsCreatedWithBody()
    {
        var thread = await SeedThreadAsync();
        var request = new CreateChatMessageRequest(
            Role: Role.User,
            Content: "Hello",
            AllowAppChanges: null,
            AttachmentFileNames: null,
            FilesChanged: null,
            Sources: null
        );
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, MessagesUrl(thread.Id))
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await DeserializeAsync<ChatMessageEntity>(response.Content);
        Assert.NotEqual(Guid.Empty, created.Id);
        Assert.Equal(request.Content, created.Content);
        Assert.Equal(thread.Id, created.ThreadId);
    }

    [Fact]
    public async Task CreateMessage_PersistsToDatabase()
    {
        var thread = await SeedThreadAsync();
        var request = new CreateChatMessageRequest(
            Role: Role.Assistant,
            Content: "Assistant reply",
            AllowAppChanges: true,
            AttachmentFileNames: null,
            FilesChanged: null,
            Sources: null
        );
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, MessagesUrl(thread.Id))
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);
        var created = await DeserializeAsync<ChatMessageEntity>(response.Content);

        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var dbRecord = await DesignerDbFixture.DbContext.ChatMessages.SingleAsync(m => m.Id == created.Id);
        Assert.Equal(request.Content, dbRecord.Content);
        Assert.Equal(Role.Assistant, dbRecord.Role);
        Assert.True(dbRecord.AllowAppChanges);
    }

    [Fact]
    public async Task CreateMessage_ReturnsNotFound_WhenThreadDoesNotExist()
    {
        var request = new CreateChatMessageRequest(
            Role: Role.User,
            Content: "Hello",
            AllowAppChanges: null,
            AttachmentFileNames: null,
            FilesChanged: null,
            Sources: null
        );
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, MessagesUrl(Guid.NewGuid()))
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
