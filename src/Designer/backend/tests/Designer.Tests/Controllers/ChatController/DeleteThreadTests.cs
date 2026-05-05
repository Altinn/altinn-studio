using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.Controllers.ChatController;

public class DeleteThreadTests : ChatControllerTestsBase<DeleteThreadTests>
{
    public DeleteThreadTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task DeleteThread_ReturnsNoContent()
    {
        var seeded = await SeedThreadAsync();
        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, ThreadUrl(seeded.Id));

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteThread_RemovesThreadFromDatabase()
    {
        var seeded = await SeedThreadAsync();
        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, ThreadUrl(seeded.Id));

        using var response = await HttpClient.SendAsync(httpRequest);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var dbRecord = await DesignerDbFixture.DbContext.ChatThreads.SingleOrDefaultAsync(t => t.Id == seeded.Id);
        Assert.Null(dbRecord);
    }

    [Fact]
    public async Task DeleteThread_ReturnsNoContent_WhenThreadDoesNotExist()
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, ThreadUrl(Guid.NewGuid()));

        using var response = await HttpClient.SendAsync(httpRequest);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
