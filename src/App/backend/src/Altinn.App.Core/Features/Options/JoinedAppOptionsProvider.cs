using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// Utility class for joining multiple app options providers into one
/// </summary>
public class JoinedAppOptionsProvider : IAppOptionsProvider
{
    private readonly IEnumerable<string> _subOptions;
    private readonly Func<AppOptionsFactory> _appOptionsFactory;

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="id">The option id used in layouts to reference this code list</param>
    /// <param name="subOptions">A list of other options to include</param>
    /// <param name="appOptionsFactory">A function that delays the initialization of the factory to use to get the sub options</param>
    public JoinedAppOptionsProvider(
        string id,
        IEnumerable<string> subOptions,
        Func<AppOptionsFactory> appOptionsFactory
    )
    {
        Id = id;
        _subOptions = subOptions;
        _appOptionsFactory = appOptionsFactory;
    }

    /// <inheritdoc />
    public string Id { get; }

    /// <inheritdoc />
    public async Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
    {
        // The app options factory is delayed to avoid circular dependencies
        var appOptionsFactory = _appOptionsFactory();
        // Get options for all subOptions ids
        (string Id, AppOptions AppOption)[] appOptions = await Task.WhenAll(
            _subOptions.Select(async optionId =>
            {
                var p = appOptionsFactory.GetOptionsProvider(optionId);
                return (p.Id, AppOption: await p.GetAppOptionsAsync(language, keyValuePairs));
            })
        );

        // Flatten all options to a single list
        List<AppOption> options = GetAllOptionsInSingleList(appOptions);
        // Flatten all parameters to a single dictionary, prefixing the key with the option id
        Dictionary<string, string?> parameters = GetCombinedParameterDictionary(appOptions);

        // Return the combined AppOptions object
        return new AppOptions
        {
            IsCacheable = Array.TrueForAll(appOptions, o => o.AppOption.IsCacheable),
            Options = options,
            Parameters = parameters,
        };
    }

    private static Dictionary<string, string?> GetCombinedParameterDictionary(
        (string Id, AppOptions AppOption)[] appOptions
    )
    {
        return appOptions
            .SelectMany(o =>
                o.AppOption.Parameters.Select(p => new KeyValuePair<string, string?>($"{o.Id}_{p.Key}", p.Value))
            )
            .ToDictionary();
    }

    private static List<AppOption> GetAllOptionsInSingleList((string Id, AppOptions AppOption)[] appOptions)
    {
        return appOptions
            .SelectMany(o =>
                o.AppOption.Options ?? throw new KeyNotFoundException($"{o.Id} is not registrered as an app option")
            )
            .ToList();
    }
}
