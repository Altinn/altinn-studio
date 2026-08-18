using Altinn.App.Analyzers.Tests.Fixtures;
using Xunit.Abstractions;

namespace Altinn.App.Analyzers.Tests;

[Collection(nameof(AltinnTestAppCollection))]
public class SealedImplementationAnalyzerTests : IAsyncLifetime
{
    private readonly AltinnTestAppFixture _fixture;

    public SealedImplementationAnalyzerTests(AltinnTestAppFixture fixture, ITestOutputHelper output)
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

        var analyzer = new SealedImplementationAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Emits_Diagnostics()
    {
        // The added file contains one explicit and one implicit replacement of IServiceTask's
        // sealed forwarding Define (each must be reported), plus a well-behaved simple task and a
        // well-behaved pipeline task (which must not be).
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        using var modification = _fixture.WithReplacedSealedDefine();
        var analyzer = new SealedImplementationAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        Assert.Equal(2, diagnostics.Count);
        Assert.All(diagnostics, d => Assert.Equal(Diagnostics.Contracts.SealedImplementationReplaced.Id, d.Id));
        await Verify(diagnostics);
    }
}
