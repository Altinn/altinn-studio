using Altinn.App.Analyzers.Tests.Fixtures;
using Xunit.Abstractions;

namespace Altinn.App.Analyzers.Tests;

[Collection(nameof(AltinnTestAppCollection))]
public class IncompleteBuilderAnalyzerTests : IAsyncLifetime
{
    private readonly AltinnTestAppFixture _fixture;

    public IncompleteBuilderAnalyzerTests(AltinnTestAppFixture fixture, ITestOutputHelper output)
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

        var analyzer = new IncompleteBuilderAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Emits_Diagnostics()
    {
        // The added file discards one eFormidling stage (which must be reported) alongside three uses
        // that must not be: a completed chain, a discarded *completed* builder, and a stage escaping
        // into a local, which this analyzer deliberately leaves to startup validation.
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        using var modification = _fixture.WithDiscardedEFormidlingBuilder();
        var analyzer = new IncompleteBuilderAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        Assert.Single(diagnostics);
        Assert.All(diagnostics, d => Assert.Equal(Diagnostics.Contracts.IncompleteBuilderDiscarded.Id, d.Id));
        await Verify(diagnostics);
    }
}
