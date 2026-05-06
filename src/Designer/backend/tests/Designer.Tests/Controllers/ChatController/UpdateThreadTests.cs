using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.Controllers.ChatController;

public class UpdateThreadTests : ChatControllerTestsBase<UpdateThreadTests>
{
    public UpdateThreadTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task UpdateThread_ReturnsNoContent()
    {
        var seeded = await SeedThreadAsync();
        var request = new UpdateChatThreadRequest("Updated title");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Put, ThreadUrl(seeded.Id))
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateThread_UpdatesTitleInDatabase()
    {
        var seeded = await SeedThreadAsync("Original title");
        var request = new UpdateChatThreadRequest("Updated title");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Put, ThreadUrl(seeded.Id))
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);

        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var dbRecord = await DesignerDbFixture.DbContext.ChatThreads.SingleAsync(t => t.Id == seeded.Id);
        Assert.Equal("Updated title", dbRecord.Title);
    }

    [Fact]
    public async Task UpdateThread_ReturnsNotFound_WhenThreadDoesNotExist()
    {
        var request = new UpdateChatThreadRequest("Updated title");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Put, ThreadUrl(Guid.NewGuid()))
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
