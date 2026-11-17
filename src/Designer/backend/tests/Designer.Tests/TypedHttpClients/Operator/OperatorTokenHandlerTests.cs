#nullable enable
using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.Operator;
using Microsoft.Extensions.Options;
using Xunit;

namespace Designer.Tests.TypedHttpClients.Operator;

public sealed class OperatorTokenHandlerTests : IDisposable
{
    private readonly string _directory = Directory.CreateTempSubdirectory("core-operator-token-").FullName;

    [Fact]
    public async Task SendAsync_SendsTheTokenFromTheFileAsABearerToken()
    {
        string tokenPath = Path.Join(_directory, "token");
        await File.WriteAllTextAsync(tokenPath, "token-1\n");
        using var client = CreateClient(tokenPath, out var recorder);

        await client.GetAsync("http://core-operator/api/v1/kinds");

        Assert.Equal("Bearer", recorder.Authorization?.Scheme);
        Assert.Equal("token-1", recorder.Authorization?.Parameter);
    }

    [Fact]
    public async Task SendAsync_AfterARotation_SendsTheNewToken()
    {
        string tokenPath = Path.Join(_directory, "token");
        await File.WriteAllTextAsync(tokenPath, "token-1");
        using var client = CreateClient(tokenPath, out var recorder);
        await client.GetAsync("http://core-operator/api/v1/kinds");

        await File.WriteAllTextAsync(tokenPath, "token-2");
        await client.GetAsync("http://core-operator/api/v1/kinds");

        Assert.Equal("token-2", recorder.Authorization?.Parameter);
    }

    [Fact]
    public async Task SendAsync_WithoutTheFile_ThrowsAndNamesThePath()
    {
        string tokenPath = Path.Join(_directory, "missing");
        using var client = CreateClient(tokenPath, out var recorder);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.GetAsync("http://core-operator/api/v1/kinds")
        );

        Assert.Contains(tokenPath, exception.Message);
        Assert.Null(recorder.Authorization);
    }

    [Fact]
    public async Task SendAsync_WithAnEmptyFile_Throws()
    {
        string tokenPath = Path.Join(_directory, "token");
        await File.WriteAllTextAsync(tokenPath, "\n");
        using var client = CreateClient(tokenPath, out _);

        await Assert.ThrowsAsync<InvalidOperationException>(() => client.GetAsync("http://core-operator/api/v1/kinds"));
    }

    public void Dispose() => Directory.Delete(_directory, recursive: true);

    private static HttpClient CreateClient(string tokenPath, out RecordingHandler recorder)
    {
        recorder = new RecordingHandler();
        var handler = new OperatorTokenHandler(
            Options.Create(new OperatorSettings { BaseUrl = "http://core-operator", TokenPath = tokenPath })
        )
        {
            InnerHandler = recorder,
        };
        return new HttpClient(handler);
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public AuthenticationHeaderValue? Authorization { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            Authorization = request.Headers.Authorization;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        }
    }
}
