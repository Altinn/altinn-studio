#nullable enable
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;
using Microsoft.Extensions.Logging;
using Microsoft.Rest.TransientFaultHandling;
using Xunit;

namespace Designer.Tests.TypedHttpClients.DelegatingHandlers;

public class EnsureSuccessHandlerTests
{
    [Fact]
    public async Task SendAsync_FailedResponse_LogsUrlWithoutQueryOrBody()
    {
        var logger = new CapturingLogger();
        using var handler = new EnsureSuccessHandler(logger)
        {
            InnerHandler = new StubHandler(HttpStatusCode.BadRequest, "response-body-secret"),
        };
        using var client = new HttpClient(handler);

        await Assert.ThrowsAsync<HttpRequestWithStatusException>(() =>
            client.GetAsync("https://platform.example/storage/api/v1/items?token=query-secret")
        );

        string message = Assert.Single(logger.Messages);
        Assert.Contains("GET request to https://platform.example/storage/api/v1/items failed", message);
        Assert.Contains("BadRequest", message);
        Assert.DoesNotContain("query-secret", message);
        Assert.DoesNotContain("response-body-secret", message);
    }

    private sealed class StubHandler(HttpStatusCode statusCode, string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        ) => Task.FromResult(new HttpResponseMessage(statusCode) { Content = new StringContent(body) });
    }

    private sealed class CapturingLogger : ILogger<EnsureSuccessHandler>
    {
        public List<string> Messages { get; } = [];

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter
        ) => Messages.Add(formatter(state, exception));
    }
}
