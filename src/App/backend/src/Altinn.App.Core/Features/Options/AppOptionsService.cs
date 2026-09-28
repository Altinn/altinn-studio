using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// Service for handling app options aka code lists. An option list comes from the <see cref="IAppOptionsProvider"/>
/// or <see cref="IInstanceAppOptionsProvider"/> the app registered with that id, or else from the app's
/// <c>options/{optionId}.json</c> in the current <see cref="AppFiles"/> snapshot.
/// </summary>
internal sealed class AppOptionsService : IAppOptionsService
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web)
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private readonly AppFilesAccessor _appFiles;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="AppOptionsService"/> class.
    /// </summary>
    /// <param name="appFiles">The app resource files</param>
    /// <param name="serviceProvider">A way to resolve the option providers the app registered</param>
    /// <param name="telemetry">Telemetry for traces</param>
    public AppOptionsService(AppFilesAccessor appFiles, IServiceProvider serviceProvider, Telemetry? telemetry = null)
    {
        _appFiles = appFiles;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
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
        if (GetOptionsProvider(optionId) is { } provider)
        {
            return await provider.GetAppOptionsAsync(language, keyValuePairs);
        }

        // Null options tells the caller that the app has neither a provider nor a file with this id
        return new AppOptions { Options = GetOptionsFromFile(optionId) };
    }

    /// <inheritdoc/>
    public async Task<AppOptions?> GetOptionsAsync(
        InstanceIdentifier instanceIdentifier,
        string optionId,
        string? language,
        Dictionary<string, string> keyValuePairs
    )
    {
        using var activity = _telemetry?.StartGetOptionsActivity(instanceIdentifier);
        if (GetInstanceOptionsProvider(optionId) is { } provider)
        {
            return await provider.GetInstanceAppOptionsAsync(instanceIdentifier, language, keyValuePairs);
        }

        return null;
    }

    /// <inheritdoc/>
    public bool IsStatic(string optionId) =>
        GetOptionsProvider(optionId) is null && _appFiles.Current.GetOptions(optionId) is not null;

    /// <inheritdoc/>
    public bool IsInstanceAppOptionsProviderRegistered(string optionId) =>
        GetInstanceOptionsProvider(optionId) is not null;

    /// <summary>
    /// The option list in the app's <c>options/{optionId}.json</c>, or null when the app has no such file.
    /// </summary>
    private List<AppOption>? GetOptionsFromFile(string optionId)
    {
        if (_appFiles.Current.GetOptions(optionId) is not { } bytes)
        {
            return null;
        }

        // AppFilesLoader has verified that the file is json, so a failure here is a list element of the wrong shape
        return JsonSerializer.Deserialize<List<AppOption>>(bytes.Span, _jsonSerializerOptions);
    }

    /// <summary>
    /// The <see cref="IAppOptionsProvider"/> the app registered with the id, or null. The id is matched without
    /// regard to case, unlike the file names.
    /// </summary>
    private IAppOptionsProvider? GetOptionsProvider(string optionId) =>
        _appImplementationFactory
            .GetAll<IAppOptionsProvider>()
            .FirstOrDefault(provider => string.Equals(provider.Id, optionId, StringComparison.OrdinalIgnoreCase));

    private IInstanceAppOptionsProvider? GetInstanceOptionsProvider(string optionId) =>
        _appImplementationFactory
            .GetAll<IInstanceAppOptionsProvider>()
            .FirstOrDefault(provider => string.Equals(provider.Id, optionId, StringComparison.OrdinalIgnoreCase));
}
