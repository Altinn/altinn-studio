using System.Text.Json;
using Altinn.App.Ai.Enrichment.Agents;
using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.Orchestration;
using Altinn.App.Ai.Enrichment.Rendering;
using Altinn.App.Ai.Enrichment.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Agents;

public class AgentRuntimeFactoryTests
{
    [Fact]
    public void Create_DemoFixture_LoadsAndValidates()
    {
        var runtime = CreateFactory().Create(TestPaths.DemoAgentRoot);

        runtime.Name.Should().Be("demo");
    }

    [Fact]
    public void Create_EmptyFolder_FailsWithContractMessage()
    {
        var dir = Directory.CreateTempSubdirectory("empty-agent-").FullName;
        try
        {
            var act = () => CreateFactory().Create(dir);
            act.Should().Throw<FileNotFoundException>().WithMessage("*agent.yaml*");
        }
        finally
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    [Fact]
    public void Create_MissingSystemPrompt_FailsValidationListingTheProblem()
    {
        var dir = CopyFixtureWithout("system-prompt.md");
        try
        {
            var act = () => CreateFactory().Create(dir);
            act.Should().Throw<InvalidOperationException>().WithMessage("*system-prompt.md*");
        }
        finally
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    [Fact]
    public async Task Execute_DemoFixture_PublishesEnrichmentJsonAndRendersPdfs()
    {
        if (TypstLocator.FindTypst() is not string typstPath)
        {
            return; // Skip: Typst not installed
        }

        var runtime = CreateFactory(typstPath).Create(TestPaths.DemoAgentRoot);
        using var application = Models.EnrichmentData.Parse(
            await File.ReadAllBytesAsync(Path.Combine(TestPaths.ApplicationsRoot, "rombooking.json")));

        var result = await runtime.ExecuteAsync(application);

        result.Files.Select(f => f.Name).Should().BeEquivalentTo("info.pdf", "sjekkliste.pdf");
        result.Files.Should().OnlyContain(f => f.ContentType == "application/pdf" && f.Data.Length > 0);

        var published = result.Context.Get<string>("sjekkliste");
        published.Should().NotBeNull();
        using var enrichment = JsonDocument.Parse(published!);
        enrichment.RootElement.TryGetProperty("sjekkliste", out var sjekkliste).Should().BeTrue();
        sjekkliste.EnumerateObject().Should().NotBeEmpty();
    }

    private static AgentRuntimeFactory CreateFactory(string? typstPath = null)
    {
        var typstOptions = Options.Create(new TypstOptions { BinaryPath = typstPath ?? "typst" });
        return new AgentRuntimeFactory(
            new StubChatService(),
            new TypstRenderer(NullLogger<TypstRenderer>.Instance, typstOptions),
            new MarkdownRulesLoader(),
            NullLoggerFactory.Instance);
    }

    /// <summary>Always answers with a final verdict — no tool calls, no HTTP.</summary>
    private sealed class StubChatService : IChatService
    {
        public Task<ChatResponse> RunAsync(ChatRequest request, CancellationToken cancellationToken = default)
            => Task.FromResult(new ChatResponse
            {
                Content = """{ "status": "ok", "merknad": "stub verdict" }""",
                FinishReason = "stop",
                StatusCode = 200,
            });
    }

    private static string CopyFixtureWithout(string relativePathToRemove)
    {
        var dir = Directory.CreateTempSubdirectory("agent-fixture-").FullName;
        CopyDirectory(TestPaths.DemoAgentRoot, dir);
        var victim = Path.Combine(dir, relativePathToRemove);
        if (File.Exists(victim))
            File.Delete(victim);
        else if (Directory.Exists(victim))
            Directory.Delete(victim, recursive: true);
        return dir;
    }

    private static void CopyDirectory(string source, string target)
    {
        foreach (var sourceDir in Directory.GetDirectories(source, "*", SearchOption.AllDirectories))
            Directory.CreateDirectory(Path.Combine(target, Path.GetRelativePath(source, sourceDir)));
        foreach (var file in Directory.GetFiles(source, "*", SearchOption.AllDirectories))
            File.Copy(file, Path.Combine(target, Path.GetRelativePath(source, file)));
    }
}
