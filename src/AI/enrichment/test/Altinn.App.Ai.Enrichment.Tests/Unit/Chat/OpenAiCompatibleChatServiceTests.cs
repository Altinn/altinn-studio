using System.Text.Json;
using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Configuration;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Chat;

public class OpenAiCompatibleChatServiceTests
{
    [Fact]
    public async Task RunAsync_TimeoutBudgetExpires_ReturnsErrorResponseInsteadOfThrowing()
    {
        // A gateway that never answers within the 1s budget. The orchestrator
        // records transport errors per item, so the budget expiring must surface
        // as ChatResponse.Error — not as an exception that kills the whole run.
        var sut = CreateSut(new SlowHandler(delayMs: 30_000), timeoutSeconds: 1);

        var response = await sut.RunAsync(MinimalRequest());

        response.Error.Should().Contain("timeout after 1s");
        response.StatusCode.Should().Be(0);
    }

    [Fact]
    public async Task RunAsync_CallerCancellation_StillThrows()
    {
        var sut = CreateSut(new SlowHandler(delayMs: 30_000), timeoutSeconds: 300);
        using var cts = new CancellationTokenSource(millisecondsDelay: 200);

        var act = async () => await sut.RunAsync(MinimalRequest(), cts.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    [Fact]
    public async Task RunAsync_StreamAndMaxTokensUnset_UsesConfiguredValues()
    {
        // The request leaves Stream/MaxTokens null, so AgentOptions.UseStreaming
        // and AgentOptions.MaxTokens must govern what goes over the wire.
        var handler = new CapturingHandler(SseResponse("hei"));
        var sut = CreateSut(handler, timeoutSeconds: 300, useStreaming: true, maxTokens: 1234);

        var response = await sut.RunAsync(MinimalRequest());

        response.Error.Should().BeNull();
        response.Content.Should().Be("hei");
        handler.SentAcceptHeader.Should().Be("text/event-stream");
        using var body = JsonDocument.Parse(handler.SentBody!);
        body.RootElement.GetProperty("stream").GetBoolean().Should().BeTrue();
        body.RootElement.GetProperty("max_tokens").GetInt32().Should().Be(1234);
    }

    [Fact]
    public async Task RunAsync_StreamAndMaxTokensSetOnRequest_OverrideConfiguredValues()
    {
        var handler = new CapturingHandler(BlockingResponse("hei"));
        var sut = CreateSut(handler, timeoutSeconds: 300, useStreaming: true, maxTokens: 1234);

        var response = await sut.RunAsync(MinimalRequest() with { Stream = false, MaxTokens = 99 });

        response.Error.Should().BeNull();
        response.Content.Should().Be("hei");
        handler.SentAcceptHeader.Should().Be("application/json");
        using var body = JsonDocument.Parse(handler.SentBody!);
        body.RootElement.TryGetProperty("stream", out _).Should().BeFalse();
        body.RootElement.GetProperty("max_tokens").GetInt32().Should().Be(99);
    }

    private static OpenAiCompatibleChatService CreateSut(
        HttpMessageHandler handler,
        int timeoutSeconds,
        bool useStreaming = false,
        int maxTokens = 4096)
    {
        var options = Options.Create(new AgentOptions
        {
            BaseUrl = "http://localhost:9/v1", // never actually reached — handler is stubbed
            ApiKey = "test-key",
            Model = "test-model",
            TimeoutSeconds = timeoutSeconds,
            UseStreaming = useStreaming,
            MaxTokens = maxTokens,
        });
        return new OpenAiCompatibleChatService(
            new StubHttpClientFactory(handler),
            options,
            new ConfigurationApiKeyProvider(options),
            NullLogger<OpenAiCompatibleChatService>.Instance);
    }

    private static ChatRequest MinimalRequest() => new()
    {
        Messages = [ChatMessage.User("hei")],
        Temperature = 0.0,
    };

    private static HttpResponseMessage BlockingResponse(string content) => new(System.Net.HttpStatusCode.OK)
    {
        Content = new StringContent(
            $$"""{"choices":[{"message":{"role":"assistant","content":"{{content}}"},"finish_reason":"stop"}]}""",
            System.Text.Encoding.UTF8,
            "application/json"),
    };

    private static HttpResponseMessage SseResponse(string content) => new(System.Net.HttpStatusCode.OK)
    {
        Content = new StringContent(
            $$"""
            data: {"choices":[{"delta":{"content":"{{content}}"},"finish_reason":"stop"}]}

            data: [DONE]

            """,
            System.Text.Encoding.UTF8,
            "text/event-stream"),
    };

    private sealed class StubHttpClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        // Infinite client timeout mirrors the AddAiEnrichmentCore registration —
        // the service's own TimeoutSeconds budget is what must fire.
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false)
        {
            Timeout = Timeout.InfiniteTimeSpan,
        };
    }

    private sealed class SlowHandler(int delayMs) : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            await Task.Delay(delayMs, cancellationToken);
            return new HttpResponseMessage(System.Net.HttpStatusCode.OK);
        }
    }

    private sealed class CapturingHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        public string? SentBody { get; private set; }
        public string? SentAcceptHeader { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            SentBody = await request.Content!.ReadAsStringAsync(cancellationToken);
            SentAcceptHeader = request.Headers.Accept.SingleOrDefault()?.MediaType;
            return response;
        }
    }
}
