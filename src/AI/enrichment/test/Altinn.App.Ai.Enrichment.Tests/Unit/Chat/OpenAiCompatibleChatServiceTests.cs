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

    private static OpenAiCompatibleChatService CreateSut(HttpMessageHandler handler, int timeoutSeconds)
    {
        var options = Options.Create(new AgentOptions
        {
            BaseUrl = "http://localhost:9/v1", // never actually reached — handler is stubbed
            ApiKey = "test-key",
            Model = "test-model",
            TimeoutSeconds = timeoutSeconds,
            UseStreaming = false,
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
        MaxTokens = 5,
        Temperature = 0.0,
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
}
