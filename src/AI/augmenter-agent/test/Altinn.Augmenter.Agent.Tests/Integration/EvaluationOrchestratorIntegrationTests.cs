using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Services.Agent;
using Altinn.Augmenter.Agent.Services.Agent.Chat;
using Altinn.Augmenter.Agent.Services.Agent.Orchestration;
using Altinn.Augmenter.Agent.Services.Agent.Tools;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit.Abstractions;

namespace Altinn.Augmenter.Agent.Tests.Integration;

/// <summary>
/// Runs the full orchestrator (live LLM + real tools) for 3 representative
/// punkter against a sample application. Skipped when SANDKASSE_API_KEY is
/// missing. Purpose: catch quality regression early (before scaling to all 39
/// punkter in Phase E end-to-end verification).
/// </summary>
[Trait("Category", "Sandkasse")]
public class EvaluationOrchestratorIntegrationTests
{
    private readonly EvaluationOrchestrator? _sut;
    private readonly ITestOutputHelper _output;

    public EvaluationOrchestratorIntegrationTests(ITestOutputHelper output)
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
            Provider = "sandkasse-http",
            BaseUrl = "https://gw.sandkasse.ai/v1",
            Model = "telenor:gemma4",
            ApiKey = apiKey,
            TimeoutSeconds = 120,
        });

        var services = new ServiceCollection();
        services.AddHttpClient(SandkasseHttpAgentService.HttpClientName);
        var sp = services.BuildServiceProvider();
        var httpFactory = sp.GetRequiredService<IHttpClientFactory>();

        var chatLogger = new TestOutputLogger<SandkasseChatService>(output);
        var orchLogger = new TestOutputLogger<EvaluationOrchestrator>(output);
        var chat = new SandkasseChatService(httpFactory, opts, chatLogger);

        // Use the real config/orchestrator/system-prompt.md + config/tools/*.json
        // for an end-to-end verification — same content the production image runs against.
        var contentPaths = Options.Create(new ContentPathsOptions());
        new ContentPathsPostConfigure().PostConfigure(null, contentPaths.Value);
        var promptProvider = new FileSystemPromptProvider(contentPaths);
        var toolLoader = new FileToolDefinitionLoader(contentPaths);
        var domain = new Altinn.Augmenter.Agent.Services.Domain.DomainDataProvider(contentPaths);
        var registry = new ToolRegistry(ToolRegistry.BuiltIn(domain), toolLoader);

        _sut = new EvaluationOrchestrator(chat, registry, promptProvider, orchLogger);
    }

    [Fact]
    public async Task RunAsync_ThreeRepresentativePunkter_AllReturnVerdicts()
    {
        if (_sut == null) return;

        // Three punkter spanning the spectrum:
        //  - styrer_alder      → mechanical (model must call age_at_date_from_fnr)
        //  - skjenketider_ok   → hybrid (call time_within_legal_schedule + reason)
        //  - vandel_styrer     → pure text judgment (no tool — should always be ikke_vurdert)
        var repoRoot = FindRepoRoot();
        var rulesDir = Path.Combine(repoRoot, "training", "experiments", "exp-direct-tools", "rules");
        var appPath = Path.Combine(repoRoot, "examples", "applications", "julebord-kristiansand.json");

        var rules = new List<RuleEntry>
        {
            new() { Key = "personkrav.styrer_alder", Markdown = await File.ReadAllTextAsync(Path.Combine(rulesDir, "personkrav.styrer_alder.md")) },
            new() { Key = "lokalpolitisk.skjenketider_ok", Markdown = await File.ReadAllTextAsync(Path.Combine(rulesDir, "lokalpolitisk.skjenketider_ok.md")) },
            new() { Key = "vandel.vandel_styrer", Markdown = await File.ReadAllTextAsync(Path.Combine(rulesDir, "vandel.vandel_styrer.md")) },
        };

        using var app = JsonDocument.Parse(await File.ReadAllTextAsync(appPath));

        var result = await _sut.RunAsync(app, rules, new OrchestratorOptions { Concurrency = 3, MaxToolIterations = 5 });

        _output.WriteLine($"Wall: {result.WallTimeMs}ms  LLM calls: {result.TotalLlmCalls}  Tool calls: {result.TotalToolCalls}");
        foreach (var (key, verdict) in result.Verdicts)
            _output.WriteLine($"  {key}: {verdict.Status} — {verdict.Merknad}");

        result.Verdicts.Should().HaveCount(3);
        result.Verdicts["personkrav.styrer_alder"].Status.Should().NotBeNullOrEmpty();
        result.Verdicts["lokalpolitisk.skjenketider_ok"].Status.Should().NotBeNullOrEmpty();
        result.Verdicts["vandel.vandel_styrer"].Status.Should().NotBeNullOrEmpty();

        // Mechanical punkter should have triggered at least one tool call between them
        result.TotalToolCalls.Should().BeGreaterThan(0, "mechanical punkter should invoke deterministic tools");

        // Wall time generous bound — Phase 4 baseline was ~26s for 39 punkter at concurrency 5
        result.WallTimeMs.Should().BeLessThan(60_000);
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "training", "experiments", "exp-direct-tools", "rules")))
                return dir.FullName;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("Could not locate augmenter-agent repo root from AppContext.BaseDirectory.");
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
