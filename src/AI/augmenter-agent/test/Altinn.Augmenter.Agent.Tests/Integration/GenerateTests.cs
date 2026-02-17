using System.Net;
using System.Text;
using Altinn.Augmenter.Agent.Tests.Integration.Helpers;
using FluentAssertions;

namespace Altinn.Augmenter.Agent.Tests.Integration;

public class GenerateTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task PostGenerate_WithValidFile_ReturnsPdf()
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent("{}"u8.ToArray());
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
        content.Add(fileContent, "file", "test.json");

        var response = await _client.PostAsync("/generate", content);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");

        var bytes = await response.Content.ReadAsByteArrayAsync();
        Encoding.ASCII.GetString(bytes, 0, 5).Should().Be("%PDF-");
    }

    [Fact]
    public async Task PostGenerate_WithInvalidContentType_Returns400()
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent("hello"u8.ToArray());
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/plain");
        content.Add(fileContent, "file", "test.txt");

        var response = await _client.PostAsync("/generate", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostGenerate_WithNoFiles_Returns400()
    {
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent("value"), "some-field");

        var response = await _client.PostAsync("/generate", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
