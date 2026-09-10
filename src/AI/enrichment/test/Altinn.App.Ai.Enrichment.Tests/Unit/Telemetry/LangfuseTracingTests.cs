using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.DependencyInjection;
using Altinn.App.Ai.Enrichment.Telemetry;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Telemetry;

/// <summary>
/// Start-up behaviour of the exporter. The rule these all serve: an app must boot
/// and keep serving no matter what the observability section says.
/// </summary>
public class LangfuseTracingTests
{
    [Fact]
    public async Task StartAsync_Disabled_BuildsNoProvider()
    {
        var sut = Create(new LangfuseOptions { Enabled = false });

        await sut.StartAsync(CancellationToken.None);

        sut.IsActive.Should().BeFalse();
    }

    [Theory]
    [InlineData(null, "pk-lf-x", "sk-lf-x")] // no host
    [InlineData("https://langfuse.example", null, "sk-lf-x")] // no public key
    [InlineData("https://langfuse.example", "pk-lf-x", null)] // no secret at all
    [InlineData("not-a-url", "pk-lf-x", "sk-lf-x")] // unusable host
    public async Task StartAsync_IncompleteConfiguration_StaysDisabledWithoutThrowing(
        string? host, string? publicKey, string? secretKey)
    {
        var sut = Create(new LangfuseOptions
        {
            Enabled = true,
            Host = host,
            PublicKey = publicKey,
            SecretKey = secretKey,
        });

        var start = async () => await sut.StartAsync(CancellationToken.None);

        await start.Should().NotThrowAsync();
        sut.IsActive.Should().BeFalse();
    }

    [Theory]
    [InlineData(PayloadCaptureMode.None)]
    [InlineData(PayloadCaptureMode.Metadata)]
    [InlineData(PayloadCaptureMode.Redacted)]
    public async Task StartAsync_UnimplementedCaptureMode_StaysDisabled(PayloadCaptureMode mode)
    {
        // Failing loudly beats quietly capturing more than the operator asked for.
        var sut = Create(new LangfuseOptions
        {
            Enabled = true,
            Host = "https://langfuse.example",
            PublicKey = "pk-lf-x",
            SecretKey = "sk-lf-x",
            PayloadCapture = mode,
        });

        await sut.StartAsync(CancellationToken.None);

        sut.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task StartAsync_FullyConfigured_BuildsProviderAndFlushesOnStop()
    {
        var sut = Create(new LangfuseOptions
        {
            Enabled = true,
            Host = "http://localhost:9/",
            PublicKey = "pk-lf-x",
            SecretKey = "sk-lf-x",
            FlushTimeoutSeconds = 1,
        });

        await sut.StartAsync(CancellationToken.None);
        sut.IsActive.Should().BeTrue();

        // Nothing is listening on port 9; StopAsync must still return cleanly.
        var stop = async () => await sut.StopAsync(CancellationToken.None);
        await stop.Should().NotThrowAsync();

        sut.Dispose();
    }

    [Fact]
    public void AddAiEnrichmentCore_WithoutConfiguration_RegistersTracingInactive()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAiEnrichmentCore(new ConfigurationBuilder().Build());

        using var provider = services.BuildServiceProvider();

        // The graph is the same whether tracing is on or off, so an app that upgrades
        // the package and changes nothing resolves everything it did before.
        provider.GetRequiredService<EnrichmentTrace>().Should().NotBeNull();
        provider.GetRequiredService<LangfuseTracing>().IsActive.Should().BeFalse();
        provider.GetRequiredService<ILangfuseKeyProvider>().Should().BeOfType<ConfigurationLangfuseKeyProvider>();
    }

    [Fact]
    public async Task ConfigurationLangfuseKeyProvider_WithoutKey_ReturnsNullRatherThanThrowing()
    {
        // Unlike the chat API key, a missing tracing key must never surface as an exception.
        var sut = new ConfigurationLangfuseKeyProvider(Options.Create(new LangfuseOptions()));

        (await sut.GetSecretKeyAsync()).Should().BeNull();
    }

    private static LangfuseTracing Create(LangfuseOptions options)
    {
        var wrapped = Options.Create(options);
        return new LangfuseTracing(
            wrapped,
            new ConfigurationLangfuseKeyProvider(wrapped),
            NullLogger<LangfuseTracing>.Instance);
    }
}
