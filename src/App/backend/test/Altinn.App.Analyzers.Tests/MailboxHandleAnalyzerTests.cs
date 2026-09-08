using Altinn.App.Analyzers.Tests.Fixtures;
using Xunit.Abstractions;

namespace Altinn.App.Analyzers.Tests;

[Collection(nameof(AltinnTestAppCollection))]
public class MailboxHandleAnalyzerTests : IAsyncLifetime
{
    private readonly AltinnTestAppFixture _fixture;

    public MailboxHandleAnalyzerTests(AltinnTestAppFixture fixture, ITestOutputHelper output)
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

        var analyzer = new MailboxHandleAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Emits_Diagnostics()
    {
        // Every pipeline in the added file is labelled there with the decision this rule made about it.
        // Line numbers matter here: the mixed case declares its handle with `out var` and the discarded one
        // with `out _`, so the snapshot pins that both forms are read the way the rules describe.
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        using var modification = _fixture.WithMailboxHandleConsumption();
        var analyzer = new MailboxHandleAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        Assert.Equal(8, diagnostics.Count);
        Assert.Equal(7, diagnostics.Count(d => d.Id == Diagnostics.Contracts.MailboxHandleAnsweredTwice.Id));
        Assert.Equal(1, diagnostics.Count(d => d.Id == Diagnostics.Contracts.MailboxNeverAnswered.Id));
        await Verify(diagnostics);
    }
}
