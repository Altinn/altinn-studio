using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Designer.Tests.TypedHttpClients.AzureDevOps;

public class AzureDevOpsBuildClientTests
{
    [Fact]
    public async Task QueueAsync_WhenAzureDevOpsRejectsTheRequest_Throws()
    {
        // Azure DevOps' error body would otherwise parse into a build with ID 0.
        using var httpClient = new HttpClient(
            new StubHandler(HttpStatusCode.BadRequest, """{"message":"The pipeline is disabled.","typeKey":"x"}""")
        )
        {
            BaseAddress = new Uri("https://dev.azure.com/org/project/_apis/"),
        };
        var client = new AzureDevOpsBuildClient(httpClient, NullLogger<AzureDevOpsBuildClient>.Instance);

        var exception = await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.QueueAsync(new { AppOwner = "ttd" }, 618, CancellationToken.None)
        );
        Assert.Equal(HttpStatusCode.BadRequest, exception.StatusCode);
    }

    [Fact]
    public async Task QueueAsync_ReturnsTheQueuedBuild()
    {
        using var httpClient = new HttpClient(
            new StubHandler(HttpStatusCode.OK, """{"id":12345,"status":"notStarted"}""")
        )
        {
            BaseAddress = new Uri("https://dev.azure.com/org/project/_apis/"),
        };
        var client = new AzureDevOpsBuildClient(httpClient, NullLogger<AzureDevOpsBuildClient>.Instance);

        var build = await client.QueueAsync(new { AppOwner = "ttd" }, 618, CancellationToken.None);

        Assert.Equal(12345, build.Id);
    }

    private sealed class StubHandler(HttpStatusCode statusCode, string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        ) =>
            Task.FromResult(
                new HttpResponseMessage(statusCode)
                {
                    Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
                }
            );
    }
}
