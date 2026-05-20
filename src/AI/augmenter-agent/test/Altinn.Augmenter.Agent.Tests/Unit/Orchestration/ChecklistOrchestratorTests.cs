using System.Text.Json;
using Altinn.Augmenter.Agent.Services.Agent.Chat;
using Altinn.Augmenter.Agent.Services.Agent.Orchestration;
using Altinn.Augmenter.Agent.Services.Agent.Tools;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Altinn.Augmenter.Agent.Tests.Unit.Orchestration;

public class ChecklistOrchestratorTests
{
    private static JsonDocument SampleApp() => JsonDocument.Parse("""
        { "Bevillingsansvarlig": { "Styrer": { "Foedselsnummer": "01018012345" } } }
        """);

    private static RuleEntry Rule(string key) => new()
    {
        PunktKey = key,
        Markdown = $"# Rule for {key}\n\nVurder dette punktet.",
    };

    // --- ParseFinalVerdict --------------------------------------------------------

    [Theory]
    [InlineData("{\"status\":\"vurdert_ok\",\"merknad\":\"OK\"}", "vurdert_ok", "OK")]
    [InlineData("```json\n{\"status\":\"vurdert_avslag\",\"merknad\":\"Brudd\"}\n```", "vurdert_avslag", "Brudd")]
    [InlineData("noise before {\"status\":\"maa_undersokes\",\"merknad\":\"Mangler\"} junk after",
        "maa_undersokes", "Mangler")]
    public void ParseFinalVerdict_ExtractsValidJson(string text, string expectedStatus, string expectedMerknad)
    {
        var verdict = ChecklistOrchestrator.ParseFinalVerdict(text);
        verdict.Status.Should().Be(expectedStatus);
        verdict.Merknad.Should().Be(expectedMerknad);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("no json at all here")]
    public void ParseFinalVerdict_NoJson_ReturnsIkkeVurdert(string text)
    {
        var verdict = ChecklistOrchestrator.ParseFinalVerdict(text);
        verdict.Status.Should().Be("ikke_vurdert");
        verdict.Merknad.Should().NotBeEmpty();
    }

    // --- Orchestrator with stub IChatService --------------------------------------

    [Fact]
    public async Task RunAsync_NoToolCalls_ReturnsParsedVerdict()
    {
        var chat = new StubChatService([
            new ChatResponse { Content = """{"status":"vurdert_ok","merknad":"OK"}""", StatusCode = 200 },
        ]);
        var orchestrator = new ChecklistOrchestrator(chat, new ToolRegistry(), NullLogger<ChecklistOrchestrator>.Instance);

        using var app = SampleApp();
        var result = await orchestrator.RunAsync(app, [Rule("personkrav.styrer_alder")], new OrchestratorOptions());

        result.Verdicts.Should().ContainKey("personkrav.styrer_alder");
        result.Verdicts["personkrav.styrer_alder"].Status.Should().Be("vurdert_ok");
        result.TotalLlmCalls.Should().Be(1);
        result.TotalToolCalls.Should().Be(0);
    }

    [Fact]
    public async Task RunAsync_OneToolCall_DispatchesAndContinues()
    {
        // First response: tool_call to days_between. Second response: final JSON.
        var chat = new StubChatService([
            new ChatResponse
            {
                Content = "",
                ToolCalls = [new ToolCall
                {
                    Id = "call_1",
                    Name = "days_between",
                    ArgumentsRaw = """{"from_date":"2026-01-01","to_date":"2026-01-15"}""",
                }],
                StatusCode = 200,
            },
            new ChatResponse { Content = """{"status":"vurdert_ok","merknad":"14 dager"}""", StatusCode = 200 },
        ]);
        var orchestrator = new ChecklistOrchestrator(chat, new ToolRegistry(), NullLogger<ChecklistOrchestrator>.Instance);

        using var app = SampleApp();
        var result = await orchestrator.RunAsync(app, [Rule("p.q")], new OrchestratorOptions());

        result.Verdicts["p.q"].Status.Should().Be("vurdert_ok");
        result.TotalLlmCalls.Should().Be(2);
        result.TotalToolCalls.Should().Be(1);

        // Verify the second request received an assistant-tool_calls message + a tool-reply
        chat.Requests.Should().HaveCount(2);
        var secondMessages = chat.Requests[1].Messages;
        secondMessages.Should().Contain(m => m.Role == "assistant" && m.ToolCalls != null && m.ToolCalls.Count == 1);
        secondMessages.Should().Contain(m => m.Role == "tool" && m.ToolCallId == "call_1");
    }

    [Fact]
    public async Task RunAsync_LoopExhausted_ReturnsIkkeVurdert()
    {
        // 5 iterations all returning tool_calls — never converges.
        var responses = Enumerable.Range(0, 5).Select(i => new ChatResponse
        {
            ToolCalls = [new ToolCall { Id = $"call_{i}", Name = "days_between", ArgumentsRaw = "{}" }],
            StatusCode = 200,
        }).ToList();
        var chat = new StubChatService(responses);
        var orchestrator = new ChecklistOrchestrator(chat, new ToolRegistry(), NullLogger<ChecklistOrchestrator>.Instance);

        using var app = SampleApp();
        var result = await orchestrator.RunAsync(app, [Rule("p.q")], new OrchestratorOptions { MaxToolIterations = 5 });

        result.Verdicts["p.q"].Status.Should().Be("ikke_vurdert");
        result.Verdicts["p.q"].Merknad.Should().Contain("Maks antall");
    }

    [Fact]
    public async Task RunAsync_ChatError_ReturnsIkkeVurdertWithError()
    {
        var chat = new StubChatService([
            new ChatResponse { Error = "HTTP 503: gateway error", StatusCode = 503 },
        ]);
        var orchestrator = new ChecklistOrchestrator(chat, new ToolRegistry(), NullLogger<ChecklistOrchestrator>.Instance);

        using var app = SampleApp();
        var result = await orchestrator.RunAsync(app, [Rule("p.q")], new OrchestratorOptions());

        result.Verdicts["p.q"].Status.Should().Be("ikke_vurdert");
        result.Verdicts["p.q"].Merknad.Should().Contain("HTTP/transport-feil");
    }

    [Fact]
    public async Task RunAsync_MultipleRules_RunsConcurrently()
    {
        // Each rule's "chat call" delays 200ms. With concurrency=3 and 3 rules,
        // parallel execution should land near 200ms; sequential would be ~600ms.
        // Threshold 400ms gives comfortable headroom for cold-start jitter while
        // still falsifying serial execution.
        var chat = new StubChatService(_ => Task.FromResult(new ChatResponse
        {
            Content = """{"status":"vurdert_ok","merknad":"OK"}""",
            StatusCode = 200,
        }), delayMs: 200);

        var orchestrator = new ChecklistOrchestrator(chat, new ToolRegistry(), NullLogger<ChecklistOrchestrator>.Instance);

        using var app = SampleApp();
        var rules = new[] { Rule("a.1"), Rule("a.2"), Rule("a.3") };
        var result = await orchestrator.RunAsync(app, rules, new OrchestratorOptions { Concurrency = 3 });

        result.Verdicts.Should().HaveCount(3);
        result.WallTimeMs.Should().BeLessThan(400);
    }
}

internal sealed class StubChatService : IChatService
{
    private readonly Queue<ChatResponse>? _canned;
    private readonly Func<ChatRequest, Task<ChatResponse>>? _handler;
    private readonly int _delayMs;
    public List<ChatRequest> Requests { get; } = [];

    public StubChatService(IEnumerable<ChatResponse> canned)
    {
        _canned = new Queue<ChatResponse>(canned);
    }

    public StubChatService(Func<ChatRequest, Task<ChatResponse>> handler, int delayMs = 0)
    {
        _handler = handler;
        _delayMs = delayMs;
    }

    public async Task<ChatResponse> RunAsync(ChatRequest request, CancellationToken cancellationToken = default)
    {
        Requests.Add(request);
        if (_delayMs > 0)
            await Task.Delay(_delayMs, cancellationToken);
        if (_handler is not null)
            return await _handler(request);
        return _canned!.Dequeue();
    }
}
