using System.Net;
using System.Text.Json;
using FluentAssertions;

namespace Altinn.App.Api.Tests.Controllers;

internal static class ProcessStatusProblemAssertions
{
    public static async Task AssertResponse(HttpResponseMessage response, string expectedStatus)
    {
        response.Should().HaveStatusCode(HttpStatusCode.Conflict);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/problem+json");

        string responseContent = await response.Content.ReadAsStringAsync();
        using JsonDocument document = JsonDocument.Parse(responseContent);
        JsonElement root = document.RootElement;
        root.EnumerateObject()
            .Select(property => property.Name)
            .Should()
            .BeEquivalentTo("type", "title", "status", "detail", "processStatus");
        root.TryGetProperty("type", out JsonElement type).Should().BeTrue(responseContent);
        type.GetString().Should().Be("instance-processing");
        root.GetProperty("title").GetString().Should().Be("Instance mutation blocked.");
        root.GetProperty("status").GetInt32().Should().Be(409);
        root.GetProperty("detail").GetString().Should().Contain($"'{expectedStatus}'");
        root.GetProperty("processStatus").GetString().Should().Be(expectedStatus);
    }
}
