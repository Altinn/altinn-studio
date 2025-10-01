using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// Service for handling app options aka code lists.
/// </summary>
public class AppOptionsService : IAppOptionsService
{
    private readonly AppOptionsFactory _appOpptionsFactory;
    private readonly InstanceAppOptionsFactory _instanceAppOptionsFactory;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="AppOptionsService"/> class.
    /// </summary>
    public AppOptionsService(
        AppOptionsFactory appOptionsFactory,
        InstanceAppOptionsFactory instanceAppOptionsFactory,
        Telemetry? telemetry = null
    )
    {
        _appOpptionsFactory = appOptionsFactory;
        _instanceAppOptionsFactory = instanceAppOptionsFactory;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<AppOptions> GetOptionsAsync(
        string optionId,
        string? language,
        Dictionary<string, string> keyValuePairs
    )
    {
        using var activity = _telemetry?.StartGetOptionsActivity();
        return await _appOpptionsFactory.GetOptionsProvider(optionId).GetAppOptionsAsync(language, keyValuePairs);
    }

    /// <inheritdoc/>
    public async Task<AppOptions> GetOptionsAsync(
        InstanceIdentifier instanceIdentifier,
        string optionId,
        string? language,
        Dictionary<string, string> keyValuePairs
    )
    {
        using var activity = _telemetry?.StartGetOptionsActivity(instanceIdentifier);
        return await _instanceAppOptionsFactory
            .GetOptionsProvider(optionId)
            .GetInstanceAppOptionsAsync(instanceIdentifier, language, keyValuePairs);
    }
}
