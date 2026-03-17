using System.Net;
using System.Text.Json;
using Altinn.Augmenter.Agent.Tests.Integration.Helpers;
using FluentAssertions;

namespace Altinn.Augmenter.Agent.Tests.Integration;

public class HealthTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetHealth_ReturnsOk()
    {
        var response = await _client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("status").GetString().Should().Be("ok");
    }
}
