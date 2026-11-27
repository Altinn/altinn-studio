using System.Diagnostics;
using Altinn.App.Core.Features;

namespace Altinn.App.Core.Tests.Features.Telemetry;

public class KeepTraceTests
{
    [Fact]
    public void KeepTrace_Marks_The_Span_For_The_Collectors()
    {
        using var activity = new Activity("test");

        activity.KeepTrace();

        // The collectors' tail sampling keeps a trace with this attribute and value, so both are a contract.
        Assert.Equal("always", activity.GetTagItem("altinn.sampling"));
        Assert.Equal("altinn.sampling", Core.Features.Telemetry.Labels.Sampling);
    }
}
