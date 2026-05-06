using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ChatController;

public class GetThreadsTests : ChatControllerTestsBase<GetThreadsTests>
{
    public GetThreadsTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task GetThreads_ReturnsOk()
    {
        using var response = await HttpClient.GetAsync(ThreadsUrl);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetThreads_ReturnsSeededThread()
    {
        var seeded = await SeedThreadAsync($"GetThreads-{System.Guid.NewGuid():N}");

        using var response = await HttpClient.GetAsync(ThreadsUrl);
        var threads = await DeserializeAsync<List<ChatThreadEntity>>(response.Content);

        Assert.Contains(threads, t => t.Id == seeded.Id && t.Title == seeded.Title);
    }
}
