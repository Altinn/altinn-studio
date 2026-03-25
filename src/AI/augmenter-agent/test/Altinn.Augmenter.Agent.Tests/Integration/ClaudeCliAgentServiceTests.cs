using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Services.Agent;
using Altinn.Augmenter.Agent.Tests.Integration.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit.Abstractions;

namespace Altinn.Augmenter.Agent.Tests.Integration;

/// <summary>
/// Integration tests that call the real Claude CLI.
/// Skipped automatically if claude is not installed.
/// Tagged with [Trait("Category", "Agent")] so they can be filtered:
///   dotnet test --filter "Category=Agent"
/// </summary>
[Trait("Category", "Agent")]
public class ClaudeCliAgentServiceTests
{
    private readonly ClaudeCliAgentService? _sut;
    private readonly ITestOutputHelper _output;

    public ClaudeCliAgentServiceTests(ITestOutputHelper output)
    {
        _output = output;

        var claudePath = ClaudeCliLocator.FindClaude();
        if (claudePath == null)
        {
            _output.WriteLine("SKIP: Claude CLI not found on this machine");
            return;
        }

        _output.WriteLine($"Using Claude CLI at: {claudePath}");

        var opts = Options.Create(new AgentOptions
        {
            CliPath = claudePath,
            TimeoutSeconds = 120,
        });

        var logger = new TestOutputLogger<ClaudeCliAgentService>(output);
        _sut = new ClaudeCliAgentService(opts, logger);
    }

    [Fact]
    public async Task RunAsync_SimplePrompt_ReturnsResponse()
    {
        if (_sut == null) return;

        // Create a minimal skill folder in temp
        var skillDir = CreateTempSkillFolder("Svar alltid med exakt texten: PONG");

        try
        {
            var request = new AgentRequest
            {
                SkillFolder = skillDir,
                UserPrompt = "PING",
            };

            var result = await _sut.RunAsync(request);

            _output.WriteLine($"Agent response: [{result}]");
            result.Trim().Should().Contain("PONG");
        }
        finally
        {
            Directory.Delete(Path.Combine(AppContext.BaseDirectory, skillDir), recursive: true);
        }
    }

    [Fact]
    public async Task RunAsync_WithSkillAndAtReference_ResolvesAndReturns()
    {
        if (_sut == null) return;

        var skillDir = CreateTempSkillFolder(
            skillContent: "Bruk reglene i vedlegget.\n\n@regler.md",
            additionalFiles: new Dictionary<string, string>
            {
                ["regler.md"] = "Regel 1: Svar alltid med JSON. Regel 2: Inkluder feltet \"ok\": true"
            });

        try
        {
            var request = new AgentRequest
            {
                SkillFolder = skillDir,
                UserPrompt = "Gi meg et svar som følger reglene.",
            };

            var result = await _sut.RunAsync(request);

            _output.WriteLine($"Agent response: [{result}]");
            result.Should().Contain("ok");
        }
        finally
        {
            Directory.Delete(Path.Combine(AppContext.BaseDirectory, skillDir), recursive: true);
        }
    }

    [Fact]
    public async Task RunAsync_ChecklistSkill_ReturnsValidJson()
    {
        if (_sut == null) return;

        // This test uses the real checklist skill folder (must be copied to output)
        const string skillFolder = "Pipelines/Checklist/Skill";
        var skillPath = Path.Combine(AppContext.BaseDirectory, skillFolder, "skill.md");

        if (!File.Exists(skillPath))
        {
            _output.WriteLine($"SKIP: Skill folder not found at {skillPath}");
            return;
        }

        var minimalInput = """
            {
                "BevillingsType": "enkeltbevilling",
                "OrganisasjonsInformasjon": {
                    "Navn": "Test AS",
                    "Organisasjonsnummer": "912345678"
                }
            }
            """;

        var checklistJson = """
            {
                "meta": { "saksnummer": "TEST", "saksbehandler": "AI-agent" },
                "soker": { "navn": "Test AS", "organisasjonsnummer": "912345678" },
                "sjekkliste": {
                    "formelle_krav": {
                        "label": "Formelle krav",
                        "punkter": {
                            "soknad_komplett": {
                                "label": "Søknaden er komplett utfylt",
                                "status": "ikke_vurdert",
                                "merknad": ""
                            }
                        }
                    }
                }
            }
            """;

        var userPrompt = $"""
            Her er rådata fra søknaden:

            ```json
            {minimalInput}
            ```

            Her er sjekklisten som skal evalueres:

            ```json
            {checklistJson}
            ```
            """;

        var request = new AgentRequest
        {
            SkillFolder = skillFolder,
            UserPrompt = userPrompt,
        };

        var result = await _sut.RunAsync(request);

        _output.WriteLine($"Agent response ({result.Length} chars):");
        _output.WriteLine(result.Length > 500 ? result[..500] + "..." : result);

        // Strip markdown fences if present
        var json = result.Trim();
        if (json.StartsWith("```"))
        {
            var nl = json.IndexOf('\n');
            if (nl >= 0) json = json[(nl + 1)..];
        }
        if (json.EndsWith("```"))
            json = json[..^3].TrimEnd();

        var doc = System.Text.Json.JsonDocument.Parse(json);
        doc.RootElement.TryGetProperty("sjekkliste", out _).Should().BeTrue("response must contain sjekkliste");
    }

    /// <summary>
    /// Creates a temporary skill folder under AppContext.BaseDirectory
    /// and returns the relative path.
    /// </summary>
    private static string CreateTempSkillFolder(
        string skillContent,
        Dictionary<string, string>? additionalFiles = null)
    {
        var relativeDir = Path.Combine("_test_skills", Guid.NewGuid().ToString("N"));
        var absoluteDir = Path.Combine(AppContext.BaseDirectory, relativeDir);
        Directory.CreateDirectory(absoluteDir);

        File.WriteAllText(Path.Combine(absoluteDir, "skill.md"), skillContent);

        if (additionalFiles != null)
        {
            foreach (var (name, content) in additionalFiles)
            {
                File.WriteAllText(Path.Combine(absoluteDir, name), content);
            }
        }

        return relativeDir;
    }
}

/// <summary>
/// Bridges ILogger to xUnit's ITestOutputHelper so we see log output in test results.
/// </summary>
file sealed class TestOutputLogger<T>(ITestOutputHelper output) : ILogger<T>
{
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        output.WriteLine($"[{logLevel}] {formatter(state, exception)}");
        if (exception != null)
            output.WriteLine(exception.ToString());
    }
}
