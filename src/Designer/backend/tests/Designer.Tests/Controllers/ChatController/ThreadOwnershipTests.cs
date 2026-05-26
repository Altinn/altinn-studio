using System.Collections.Generic;
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

public class ThreadOwnershipTests : ChatControllerTestsBase<ThreadOwnershipTests>
{
    private const string OtherDeveloper = "otherDeveloper";

    public ThreadOwnershipTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task GetThreads_DoesNotReturnThreadsOwnedByDifferentDeveloper()
    {
        var otherThread = await SeedThreadAsync(createdBy: OtherDeveloper);

        using var response = await HttpClient.GetAsync(ThreadsUrl);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var threads = await DeserializeAsync<List<ChatThreadEntity>>(response.Content);
        Assert.DoesNotContain(threads, t => t.Id == otherThread.Id);
    }

    [Fact]
    public async Task GetMessages_ReturnsNotFound_WhenThreadOwnedByDifferentDeveloper()
    {
        var thread = await SeedThreadAsync(createdBy: OtherDeveloper);

        using var response = await HttpClient.GetAsync(MessagesUrl(thread.Id));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateMessage_ReturnsNotFound_WhenThreadOwnedByDifferentDeveloper()
    {
        var thread = await SeedThreadAsync(createdBy: OtherDeveloper);
        var request = new CreateChatMessageRequest(Role.User, "Hello", null, null, null, null);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, MessagesUrl(thread.Id))
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateThread_ReturnsNotFound_WhenThreadOwnedByDifferentDeveloper()
    {
        var thread = await SeedThreadAsync(createdBy: OtherDeveloper);
        var request = new UpdateChatThreadRequest("Updated title");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Put, ThreadUrl(thread.Id))
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteThread_DoesNotDeleteThread_WhenThreadOwnedByDifferentDeveloper()
    {
        var thread = await SeedThreadAsync(createdBy: OtherDeveloper);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, ThreadUrl(thread.Id));

        using var response = await HttpClient.SendAsync(httpRequest);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var dbRecord = await DesignerDbFixture.DbContext.ChatThreads.SingleOrDefaultAsync(t => t.Id == thread.Id);
        Assert.NotNull(dbRecord);
    }

    [Fact]
    public async Task DeleteMessage_DoesNotDeleteMessage_WhenThreadOwnedByDifferentDeveloper()
    {
        var thread = await SeedThreadAsync(createdBy: OtherDeveloper);
        var message = await SeedMessageAsync(thread.Id);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, MessageUrl(thread.Id, message.Id));

        using var response = await HttpClient.SendAsync(httpRequest);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var dbRecord = await DesignerDbFixture.DbContext.ChatMessages.SingleOrDefaultAsync(m => m.Id == message.Id);
        Assert.NotNull(dbRecord);
    }
}
