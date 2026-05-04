using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.Controllers.ChatController;

public class CreateThreadTests : ChatControllerTestsBase<CreateThreadTests>
{
    public CreateThreadTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task CreateThread_ReturnsCreatedWithBody()
    {
        var request = new CreateChatThreadRequest($"Thread-{Guid.NewGuid():N}");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, ThreadsUrl)
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await DeserializeAsync<ChatThreadEntity>(response.Content);
        Assert.NotEqual(Guid.Empty, created.Id);
        Assert.Equal(request.Title, created.Title);
        Assert.Equal(Org, created.Org);
        Assert.Equal(App, created.App);
    }

    [Fact]
    public async Task CreateThread_PersistsToDatabase()
    {
        var request = new CreateChatThreadRequest($"Thread-{Guid.NewGuid():N}");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, ThreadsUrl)
        {
            Content = CreateJsonContent(request),
        };

        using var response = await HttpClient.SendAsync(httpRequest);
        var created = await DeserializeAsync<ChatThreadEntity>(response.Content);

        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var dbRecord = await DesignerDbFixture.DbContext.ChatThreads.SingleAsync(t => t.Id == created.Id);
        Assert.Equal(request.Title, dbRecord.Title);
        Assert.Equal(Developer, dbRecord.CreatedBy);
    }
}
