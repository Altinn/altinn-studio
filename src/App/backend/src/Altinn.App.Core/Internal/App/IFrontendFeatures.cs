using System.Text.Json;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// The feature flags in the <c>FeatureManagement</c> section of the app configuration, which the frontend reads to
/// support several versions of the backend and the backend reads for its own opt-in behavior.
/// </summary>
public interface IFrontendFeatures
{
    /// <summary>
    /// Every configured flag by its camel case name, as the frontend expects them in the application metadata.
    /// </summary>
    public IReadOnlyDictionary<string, bool> GetDictionary();

    /// <summary>
    /// Whether a flag is enabled. A flag that is not configured is disabled.
    /// </summary>
    /// <param name="feature">The flag name as configured, in any casing. See <see cref="Core.Features.FeatureFlags"/>.</param>
    public bool IsEnabled(string feature) =>
        GetDictionary().TryGetValue(JsonNamingPolicy.CamelCase.ConvertName(feature), out bool enabled) && enabled;

    /// <summary>
    /// <see cref="GetDictionary"/> as a task, for code written when the flags were read asynchronously.
    /// </summary>
    [Obsolete("The flags are in memory. Use GetDictionary() or IsEnabled(feature).")]
    public Task<Dictionary<string, bool>> GetFrontendFeatures() =>
        Task.FromResult(new Dictionary<string, bool>(GetDictionary(), StringComparer.Ordinal));
}
