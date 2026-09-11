using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.App.Tests.Configuration;

/// <summary>
/// Pins what this host's shipped <c>appsettings.json</c> actually binds to for the namespace circuit
/// breaker. The engine library ships the feature dark, so every deployment running this image depends
/// on the opt-in here being bound — and a mis-keyed or dropped setting has no symptom at all: the
/// sweep simply never runs and the fetch query ignores <c>throttled_until</c>, which is
/// indistinguishable from a quiet week.
/// </summary>
[Collection(AppTestCollection.Name)]
public sealed class ThrottlingConfigurationTests(AppTestFixture fixture)
{
    private ThrottlingSettings Throttling =>
        fixture.Services.GetRequiredService<IOptions<EngineSettings>>().Value.Throttling;

    [Fact]
    public void Throttling_IsEnabled_ForThisHost()
    {
        Assert.True(Throttling.Enabled);
    }

    /// <summary>
    /// The values are those the failure-throttling ADR documents. They are spelled out in
    /// <c>appsettings.json</c> rather than left to the library defaults, so this asserts the file is
    /// what is in force — not that the library's defaults happen to agree with it.
    /// </summary>
    [Fact]
    public void Throttling_BindsTheDocumentedKnobs()
    {
        Assert.Equal(50, Throttling.MinRequeuedWorkflows);
        Assert.Equal(0.5, Throttling.MinRequeuedRatio);
        Assert.Equal(TimeSpan.FromSeconds(30), Throttling.SweepInterval);
        Assert.Equal(3, Throttling.CanaryCount);
        Assert.Equal(TimeSpan.FromMinutes(10), Throttling.InitialWindow);
        Assert.Equal(TimeSpan.FromHours(1), Throttling.MaxWindow);
    }
}
