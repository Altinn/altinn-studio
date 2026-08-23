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
        // The added file holds twenty-two pipelines, and every one of them is a decision this rule made.
        //
        // Eight are defects. Seven double-answer one handle: two handlers in one chain, a handler then the
        // terminal, the same spread over statements, and - because a branch earlier in a method must not
        // buy the rest of it silence - the same chain after an if/else merge, after a `??`, inside a
        // `using`, and inside a try whose catch only rethrows. The eighth is a mailbox whose handle is
        // never mentioned again.
        //
        // The fourteen others must stay silent. One is simply correct (two exchanges answered once each);
        // the rest are shapes this rule cannot prove and leaves to the builder's own check at startup.
        // Handles it cannot follow: through a helper method, a field, a captured lambda, a ref alias or a
        // deconstruction; a local a second mailbox-opening stage reassigned; one discarded with `out _`.
        // Answers that do not both certainly run: one per if/else branch; two sharing a block the method
        // may never enter, once behind an if and once in a loop body; two in a try whose catch swallows
        // the builder's complaint; and two below a try whose handler - plain or filtered - returns a
        // pipeline of its own, so an execution returns without reaching them at all.
        //
        // Line numbers matter here: the mixed case declares its handle with `out var` and the discarded
        // one with `out _`, so the snapshot pins that both forms are read the way the rules describe.
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
