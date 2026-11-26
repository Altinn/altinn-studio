using Altinn.Studio.Fleet.Cli;

namespace Altinn.Studio.Fleet.Tests;

public sealed class ConsoleProgressTests
{
    [Fact]
    public async Task OnAppsProgress_DoesNotShowACountThatArrivesAfterAHigherOne()
    {
        using var output = new StringWriter();
        var progress = new ConsoleProgress(output, interactive: true);

        progress.OnAppsProgress(FleetTestContext.Prod, 2, 2);
        // Long enough for the next report to be due.
        await Task.Delay(TimeSpan.FromMilliseconds(150), TestContext.Current.CancellationToken);
        progress.OnAppsProgress(FleetTestContext.Prod, 1, 2);

        Assert.EndsWith("analyzing 2/2", output.ToString(), StringComparison.Ordinal);
    }
}
