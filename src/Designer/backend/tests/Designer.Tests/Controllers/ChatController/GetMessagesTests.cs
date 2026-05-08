using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ChatController;

public class GetMessagesTests : ChatControllerTestsBase<GetMessagesTests>
{
    public GetMessagesTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task GetMessages_ReturnsOkWithMessages()
    {
        var thread = await SeedThreadAsync();
        var seededMessage = await SeedMessageAsync(thread.Id, "Hello from test");

        using var response = await HttpClient.GetAsync(MessagesUrl(thread.Id));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var messages = await DeserializeAsync<List<ChatMessageEntity>>(response.Content);
        Assert.Contains(messages, m => m.Id == seededMessage.Id && m.Content == seededMessage.Content);
    }

    [Fact]
    public async Task GetMessages_ReturnsNotFound_WhenThreadDoesNotExist()
    {
        using var response = await HttpClient.GetAsync(MessagesUrl(Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
