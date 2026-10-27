using Altinn.App.Ai.Enrichment.Agents;
using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.DependencyInjection;
using Altinn.App.Ai.Enrichment.Orchestration;
using Altinn.App.Ai.Enrichment.Pipeline;
using Altinn.App.Ai.Enrichment.Rendering;
using Altinn.App.Ai.Enrichment.Telemetry;
using Altinn.App.Ai.Enrichment.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Pipeline;

/// <summary>
/// The agent step's concurrency: AiEnrichment:Agent:Concurrency (per environment)
/// wins over concurrency in agent.yaml (shared by every environment), which wins
/// over the default.
/// </summary>
public class ConcurrencySettingTests
{
    [Theory]
    [InlineData(1, 4, 1, AgentOrchestratedStep.ConcurrencyFromAppSettings)]
    [InlineData(1, null, 1, AgentOrchestratedStep.ConcurrencyFromAppSettings)]
    [InlineData(null, 4, 4, AgentOrchestratedStep.ConcurrencyFromAgentYaml)]
    [InlineData(null, null, AgentOrchestratedStep.DefaultConcurrency, AgentOrchestratedStep.ConcurrencyFromDefault)]
    public void ResolveConcurrency_EnvironmentWinsOverAgentYamlWhichWinsOverDefault(
        int? configured, int? fromAgentYaml, int expectedValue, string expectedSource)
    {
        var resolved = AgentOrchestratedStep.ResolveConcurrency(configured, fromAgentYaml);

        resolved.Should().Be(new ResolvedConcurrency(expectedValue, expectedSource));
    }

    [Fact]
    public void AgentOptions_BindsConcurrencyFromAppSettings()
    {
        using var provider = BuildProvider(new() { ["AiEnrichment:Agent:Concurrency"] = "1" });

        provider.GetRequiredService<IOptions<AgentOptions>>().Value.Concurrency.Should().Be(1);
    }

    [Fact]
    public void AgentOptions_ConcurrencyUnset_IsNull()
    {
        using var provider = BuildProvider(new());

        provider.GetRequiredService<IOptions<AgentOptions>>().Value.Concurrency.Should().BeNull();
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    public void AgentOptions_ConcurrencyBelowOne_FailsValidation(string value)
    {
        using var provider = BuildProvider(new() { ["AiEnrichment:Agent:Concurrency"] = value });

        var act = () => provider.GetRequiredService<IOptions<AgentOptions>>().Value;

        act.Should().Throw<OptionsValidationException>().WithMessage("*AiEnrichment:Agent:Concurrency*at least 1*");
    }

    [Fact]
    public void Create_AgentYamlConcurrencyBelowOne_FailsValidation()
    {
        var dir = CopyDemoAgentWithConcurrency(0);
        try
        {
            var act = () => CreateFactory(configuredConcurrency: null, NullLoggerFactory.Instance).Create(dir);

            act.Should().Throw<InvalidOperationException>().WithMessage("*concurrency must be at least 1*");
        }
        finally
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    [Fact]
    public void Create_AgentYamlConcurrencyWithoutAppSetting_WarnsThatItIsDeprecated()
    {
        var dir = CopyDemoAgentWithConcurrency(4);
        try
        {
            var loggers = new RecordingLoggerFactory();

            CreateFactory(configuredConcurrency: null, loggers).Create(dir);

            loggers.Entries.Should().ContainSingle(e =>
                e.Level == LogLevel.Warning
                && e.Message.Contains("deprecated")
                && e.Message.Contains("AiEnrichment:Agent:Concurrency"));
        }
        finally
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    [Fact]
    public void Create_AgentYamlConcurrencyOverriddenByAppSetting_SaysSoWithoutWarning()
    {
        var dir = CopyDemoAgentWithConcurrency(4);
        try
        {
            var loggers = new RecordingLoggerFactory();

            CreateFactory(configuredConcurrency: 1, loggers).Create(dir);

            loggers.Entries.Should().NotContain(e => e.Level >= LogLevel.Warning);
            loggers.Entries.Should().ContainSingle(e =>
                e.Level == LogLevel.Information
                && e.Message.Contains("AiEnrichment:Agent:Concurrency=1 overrides concurrency: 4"));
        }
        finally
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    [Fact]
    public void Create_NoAgentYamlConcurrency_LogsNothingAboutIt()
    {
        var loggers = new RecordingLoggerFactory();

        CreateFactory(configuredConcurrency: 1, loggers).Create(TestPaths.DemoAgentRoot);

        loggers.Entries.Should().NotContain(e => e.Message.Contains("concurrency"));
    }

    private static ServiceProvider BuildProvider(Dictionary<string, string?> settings)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        return new ServiceCollection().AddLogging().AddAiEnrichmentCore(configuration).BuildServiceProvider();
    }

    private static AgentRuntimeFactory CreateFactory(int? configuredConcurrency, ILoggerFactory loggerFactory) =>
        new(
            Substitute.For<IChatService>(),
            new TypstRenderer(NullLogger<TypstRenderer>.Instance, Options.Create(new TypstOptions())),
            new MarkdownRulesLoader(),
            Options.Create(new AgentOptions { Model = "test-model", Concurrency = configuredConcurrency }),
            EnrichmentTrace.Disabled,
            loggerFactory);

    /// <summary>Copies the demo agent and sets <c>concurrency</c> on its orchestrated (last) step.</summary>
    private static string CopyDemoAgentWithConcurrency(int concurrency)
    {
        var dir = Directory.CreateTempSubdirectory("concurrency-agent-").FullName;
        foreach (var source in Directory.EnumerateFiles(TestPaths.DemoAgentRoot, "*", SearchOption.AllDirectories))
        {
            var target = Path.Combine(dir, Path.GetRelativePath(TestPaths.DemoAgentRoot, source));
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.Copy(source, target);
        }
        File.AppendAllText(Path.Combine(dir, "agent.yaml"), $"    concurrency: {concurrency}{Environment.NewLine}");
        return dir;
    }

    private sealed record LogEntry(LogLevel Level, string Message);

    private sealed class RecordingLoggerFactory : ILoggerFactory
    {
        private readonly System.Collections.Concurrent.ConcurrentQueue<LogEntry> _entries = new();

        public IReadOnlyCollection<LogEntry> Entries => _entries;

        public ILogger CreateLogger(string categoryName) => new RecordingLogger(_entries);

        public void AddProvider(ILoggerProvider provider) { }

        public void Dispose() { }

        private sealed class RecordingLogger(System.Collections.Concurrent.ConcurrentQueue<LogEntry> entries) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel, EventId eventId, TState state, Exception? exception,
                Func<TState, Exception?, string> formatter) =>
                entries.Enqueue(new LogEntry(logLevel, formatter(state, exception)));
        }
    }
}
