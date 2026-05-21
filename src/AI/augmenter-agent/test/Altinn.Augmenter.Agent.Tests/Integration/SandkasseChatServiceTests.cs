using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Services.Agent.Chat;
using Altinn.Augmenter.Agent.Services.Agent.Tools;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit.Abstractions;

namespace Altinn.Augmenter.Agent.Tests.Integration;

/// <summary>
/// Hits the live sandkasse gateway. Skips automatically when SANDKASSE_API_KEY
/// is missing (CI runs without secrets).
/// </summary>
[Trait("Category", "Sandkasse")]
public class SandkasseChatServiceTests
{
    private readonly SandkasseChatService? _sut;
    private readonly ITestOutputHelper _output;

    public SandkasseChatServiceTests(ITestOutputHelper output)
    {
        _output = output;
        var apiKey = Environment.GetEnvironmentVariable("SANDKASSE_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _output.WriteLine("SKIP: SANDKASSE_API_KEY not set");
            return;
        }

        var opts = Options.Create(new AgentOptions
        {
            BaseUrl = "https://gw.sandkasse.ai/v1",
            Model = "telenor:gemma4",
            ApiKey = apiKey,
            TimeoutSeconds = 120,
        });

        var services = new ServiceCollection();
        services.AddHttpClient(SandkasseChatService.HttpClientName);
        var sp = services.BuildServiceProvider();
        var httpFactory = sp.GetRequiredService<IHttpClientFactory>();

        var logger = new TestOutputLogger<SandkasseChatService>(output);
        _sut = new SandkasseChatService(httpFactory, opts, logger);
    }

    [Fact]
    public async Task RunAsync_SimplePong_ReturnsText()
    {
        if (_sut == null) return;

        var req = new ChatRequest
        {
            Messages =
            [
                ChatMessage.System("Du svarer alltid med EKSAKT teksten: PONG"),
                ChatMessage.User("Si PONG"),
            ],
            MaxTokens = 16,
        };

        var resp = await _sut.RunAsync(req);
        _output.WriteLine($"status={resp.StatusCode} elapsed={resp.ElapsedMs}ms content=[{resp.Content}] error={resp.Error}");

        resp.Ok.Should().BeTrue($"expected 200; got {resp.StatusCode}: {resp.Error}");
        resp.Content.Trim().Should().Contain("PONG");
        resp.ToolCalls.Should().BeEmpty();
    }

    [Fact]
    public async Task RunAsync_WithToolsAddPrompt_EmitsToolCall()
    {
        if (_sut == null) return;

        // Define an in-test "add" tool that exists only as a JSON schema —
        // we want to see the model emit a tool_call, not actually run anything.
        var addToolDef = new ToolDefinition
        {
            Function = new ToolFunctionDefinition
            {
                Name = "add",
                Description = "Add two integers and return their sum.",
                Parameters = JsonDocument.Parse("""
                    {
                      "type": "object",
                      "properties": {
                        "a": { "type": "integer", "description": "First addend" },
                        "b": { "type": "integer", "description": "Second addend" }
                      },
                      "required": ["a", "b"]
                    }
                    """).RootElement.Clone(),
            },
        };

        var req = new ChatRequest
        {
            Messages =
            [
                ChatMessage.System("Bruk verktøyet 'add' når brukeren spør om en sum. Ikke beregn selv."),
                ChatMessage.User("Hva er 3 pluss 5?"),
            ],
            Tools = [addToolDef],
            ToolChoice = "auto",
            MaxTokens = 256,
        };

        var resp = await _sut.RunAsync(req);
        _output.WriteLine(
            $"status={resp.StatusCode} elapsed={resp.ElapsedMs}ms content=[{resp.Content}] " +
            $"tool_calls={resp.ToolCalls.Count} error={resp.Error}");
        foreach (var tc in resp.ToolCalls)
            _output.WriteLine($"  tool_call: {tc.Name}({tc.ArgumentsRaw})");

        resp.Ok.Should().BeTrue($"expected 200; got {resp.StatusCode}: {resp.Error}");
        resp.ToolCalls.Should().NotBeEmpty("model should request the add tool rather than computing inline");
        resp.ToolCalls[0].Name.Should().Be("add");

        var args = JsonDocument.Parse(resp.ToolCalls[0].ArgumentsRaw);
        args.RootElement.GetProperty("a").GetInt32().Should().Be(3);
        args.RootElement.GetProperty("b").GetInt32().Should().Be(5);
    }
}

file sealed class TestOutputLogger<T>(ITestOutputHelper output) : ILogger<T>
{
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state,
        Exception? exception, Func<TState, Exception?, string> formatter)
    {
        try { output.WriteLine($"[{logLevel}] {formatter(state, exception)}"); }
        catch (InvalidOperationException) { /* test already ended */ }
    }
}
