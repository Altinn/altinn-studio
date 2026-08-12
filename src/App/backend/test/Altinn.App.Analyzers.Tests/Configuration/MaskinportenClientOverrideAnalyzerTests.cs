using Altinn.App.Analyzers.Configuration;
using Altinn.App.Analyzers.Tests.Fixtures;
using Xunit.Abstractions;

namespace Altinn.App.Analyzers.Tests.Configuration;

[Collection(nameof(AltinnTestAppCollection))]
public class MaskinportenClientOverrideAnalyzerTests : IAsyncLifetime
{
    private readonly AltinnTestAppFixture _fixture;

    public MaskinportenClientOverrideAnalyzerTests(AltinnTestAppFixture fixture, ITestOutputHelper output)
    {
        fixture.SetTestOutputHelper(output);
        _fixture = fixture;
    }

    public async Task InitializeAsync() => await _fixture.Initialize();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Builds_OK_By_Default()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        var analyzer = new MaskinportenClientOverrideAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(
            analyzer,
            cancellationToken,
            AltinnAppAnalyzerOptions.Create()
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Emits_Diagnostics()
    {
        // The added file redirects the default client three ways that must be reported (custom section
        // path, configuration lambda, non-constant section path) alongside three no-op re-binds of the
        // provisioned section that must not be (exact literal, different casing, const reference).
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        using var modification = _fixture.WithMaskinportenClientOverride();
        var analyzer = new MaskinportenClientOverrideAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(
            analyzer,
            cancellationToken,
            AltinnAppAnalyzerOptions.Create()
        );

        Assert.Equal(3, diagnostics.Count);
        Assert.All(diagnostics, d => Assert.Equal(Diagnostics.Configuration.MaskinportenClientOverride.Id, d.Id));
        await Verify(diagnostics);
    }

    [Fact]
    public async Task Emits_Nothing_Outside_An_App_Project()
    {
        // The analyzer travels transitively into app unit-test projects, where configuring the client
        // with test credentials is legitimate — without the IsAltinnApp property it must stay silent.
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        using var modification = _fixture.WithMaskinportenClientOverride();
        var analyzer = new MaskinportenClientOverrideAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        Assert.Empty(diagnostics);
    }
}
