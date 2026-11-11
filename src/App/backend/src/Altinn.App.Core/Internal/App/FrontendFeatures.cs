using System.Text.Json;
using Altinn.App.Core.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Reads the feature flags from the <c>FeatureManagement</c> section of the configuration, where every flag is a
/// boolean: <c>"FeatureManagement": { "SimpleTableEnabled": true }</c>. The flags are read again when the
/// configuration reloads. <c>addInstanceIdentifierToLayoutRequests</c> is enabled when the app registers an
/// <see cref="IInstanceLayoutProvider"/>.
/// </summary>
internal sealed class FrontendFeatures : IFrontendFeatures
{
    internal const string SectionName = "FeatureManagement";

    private readonly IConfiguration _configuration;
    private readonly bool _hasInstanceLayoutProvider;
    private volatile IReadOnlyDictionary<string, bool> _features;

    /// <exception cref="ApplicationConfigException">When a flag is not a boolean.</exception>
    public FrontendFeatures(IConfiguration configuration)
        : this(configuration, hasInstanceLayoutProvider: false) { }

    /// <exception cref="ApplicationConfigException">When a flag is not a boolean.</exception>
    public FrontendFeatures(IConfiguration configuration, IServiceProviderIsService serviceProviderIsService)
        : this(configuration, serviceProviderIsService.IsService(typeof(IInstanceLayoutProvider))) { }

    private FrontendFeatures(IConfiguration configuration, bool hasInstanceLayoutProvider)
    {
        _configuration = configuration;
        _hasInstanceLayoutProvider = hasInstanceLayoutProvider;
        _features = Read(configuration, hasInstanceLayoutProvider);
        ChangeToken.OnChange(
            configuration.GetReloadToken,
            () => _features = Read(_configuration, _hasInstanceLayoutProvider)
        );
    }

    /// <inheritdoc />
    public IReadOnlyDictionary<string, bool> GetDictionary() => _features;

    /// <inheritdoc />
    public bool IsEnabled(string feature) =>
        _features.TryGetValue(JsonNamingPolicy.CamelCase.ConvertName(feature), out bool enabled) && enabled;

    private static IReadOnlyDictionary<string, bool> Read(IConfiguration configuration, bool hasInstanceLayoutProvider)
    {
        var features = new Dictionary<string, bool>(StringComparer.Ordinal);
        foreach (IConfigurationSection flag in configuration.GetSection(SectionName).GetChildren())
        {
            if (flag.Value is null || !bool.TryParse(flag.Value, out bool enabled))
            {
                throw new ApplicationConfigException(
                    $"{SectionName}:{flag.Key} must be true or false, but is "
                        + (flag.Value is null ? "a section" : $"'{flag.Value}'")
                        + ". Feature filters are not supported."
                );
            }

            features[JsonNamingPolicy.CamelCase.ConvertName(flag.Key)] = enabled;
        }

        if (hasInstanceLayoutProvider)
        {
            features[JsonNamingPolicy.CamelCase.ConvertName(FeatureFlags.AddInstanceIdentifierToLayoutRequests)] = true;
        }

        return features;
    }
}
