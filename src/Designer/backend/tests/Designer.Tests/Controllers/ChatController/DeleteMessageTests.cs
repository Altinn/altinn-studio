using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.Controllers.ChatController;

public class DeleteMessageTests : ChatControllerTestsBase<DeleteMessageTests>
{
    public DeleteMessageTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task DeleteMessage_ReturnsNoContent()
    {
        var thread = await SeedThreadAsync();
        var message = await SeedMessageAsync(thread.Id);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, MessageUrl(thread.Id, message.Id));

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteMessage_RemovesMessageFromDatabase()
    {
        var thread = await SeedThreadAsync();
        var message = await SeedMessageAsync(thread.Id);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, MessageUrl(thread.Id, message.Id));

        using var response = await HttpClient.SendAsync(httpRequest);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var dbRecord = await DesignerDbFixture.DbContext.ChatMessages.SingleOrDefaultAsync(m => m.Id == message.Id);
        Assert.Null(dbRecord);
    }

    [Fact]
    public async Task DeleteMessage_ReturnsNoContent_WhenThreadDoesNotExist()
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, MessageUrl(Guid.NewGuid(), Guid.NewGuid()));

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
