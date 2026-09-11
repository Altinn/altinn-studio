using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.App.Tests.Configuration;

/// <summary>
/// The namespace circuit breaker ships dark in the engine library, so every deployment of this host
/// depends on the opt-in in its <c>appsettings.json</c> actually reaching the options object. Nothing
/// reports it when that stops being true: the disabled path logs at <c>Debug</c>, below this host's
/// own <c>Information</c> floor for <c>WorkflowEngine.Data.Services</c>, so a setting that no longer
/// binds looks exactly like a week with no failure storms.
/// </summary>
[Collection(AppTestCollection.Name)]
public sealed class ThrottlingConfigurationTests(AppTestFixture fixture)
{
    /// <summary>
    /// Asserts the flag the host boots with is the flag its settings file asks for — deliberately not
    /// that it is <c>true</c>. Pinning the value would make disabling the breaker a two-file change,
    /// and the kill switch should never be harder to reach than the switch.
    /// </summary>
    [Fact]
    public void Throttling_EnabledFlag_MatchesTheShippedSettingsFile()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        using var document = JsonDocument.Parse(File.ReadAllText(path));

        bool? enabledInFile = null;
        if (
            document.RootElement.TryGetProperty("EngineSettings", out var engineSettings)
            && engineSettings.TryGetProperty("Throttling", out var throttling)
            && throttling.TryGetProperty("Enabled", out var enabled)
        )
        {
            enabledInFile = enabled.GetBoolean();
        }

        Assert.True(
            enabledInFile.HasValue,
            $"{path} no longer declares EngineSettings:Throttling:Enabled. The engine library "
                + "defaults it to false, so dropping it silently disables the breaker everywhere."
        );

        var bound = fixture.Services.GetRequiredService<IOptions<EngineSettings>>().Value.Throttling;

        Assert.Equal(enabledInFile.Value, bound.Enabled);
    }
}
