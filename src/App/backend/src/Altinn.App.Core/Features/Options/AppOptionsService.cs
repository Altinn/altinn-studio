using System.Runtime.ExceptionServices;
using System.Text.Json;
using Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// Service for handling app options aka code lists. See <see cref="IAppOptionsService"/> for the sources and
/// <see cref="AppOptionsSource"/> for the order they are tried in.
/// </summary>
internal sealed class AppOptionsService : IAppOptionsService
{
    /// <summary>
    /// A joined list may include other joined lists, but a list that includes itself would recurse forever.
    /// </summary>
    private const int MaxJoinDepth = 8;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web)
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private readonly AppFilesAccessor _appFiles;
    private readonly IServiceProvider _serviceProvider;
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
        _serviceProvider = serviceProvider;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<AppOptionsResult[]> GetOptionsAsync(
        IReadOnlyList<AppOptionsLookup> lookups,
        string? language,
        IInstanceDataAccessor? dataAccessor,
        CancellationToken cancellationToken
    )
    {
        var instanceIdentifier = dataAccessor is null ? null : new InstanceIdentifier(dataAccessor.Instance);
        using var activity = instanceIdentifier is null
            ? _telemetry?.StartGetOptionsActivity()
            : _telemetry?.StartGetOptionsActivity(instanceIdentifier);

        if (lookups.Count == 0)
        {
            return [];
        }

        var batch = new Batch(
            _appImplementationFactory,
            _serviceProvider,
            _appFiles.Current,
            language,
            instanceIdentifier,
            cancellationToken
        );
        var tasks = new Task<AppOptionsResult>[lookups.Count];
        for (var i = 0; i < lookups.Count; i++)
        {
            tasks[i] = batch.Resolve(lookups[i], depth: 0);
        }

        return await Task.WhenAll(tasks);
    }

    /// <inheritdoc/>
    public async Task<AppOptions> GetOptionsAsync(
        string optionId,
        string? language,
        Dictionary<string, string> keyValuePairs
    )
    {
        var results = await GetOptionsAsync(
            [new AppOptionsLookup(optionId, keyValuePairs)],
            language,
            dataAccessor: null,
            CancellationToken.None
        );
        var result = results[0];
        if (result.Error is { } error)
        {
            ExceptionDispatchInfo.Throw(error);
        }

        // Null options tells the caller that the app has nothing with this id
        return result.AppOptions ?? new AppOptions();
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
        foreach (var provider in _appImplementationFactory.GetAll<IInstanceAppOptionsProvider>())
        {
            if (string.Equals(provider.Id, optionId, StringComparison.OrdinalIgnoreCase))
            {
                return await provider.GetInstanceAppOptionsAsync(instanceIdentifier, language, keyValuePairs);
            }
        }

        return null;
    }

    /// <inheritdoc/>
    public IReadOnlyList<AppOptionsRegistration> GetRegistrations()
    {
        var registrations = new List<AppOptionsRegistration>();
        foreach (var provider in _appImplementationFactory.GetAll<IInstanceAppOptionsProvider>())
        {
            registrations.Add(new InstanceProviderOptionsRegistration(provider.Id, provider.GetType()));
        }

        foreach (var joined in _serviceProvider.GetServices<JoinedAppOptionsDefinition>())
        {
            registrations.Add(new JoinedOptionsRegistration(joined.Id, joined.SubOptionIds));
        }

        foreach (var library in _serviceProvider.GetServices<LibraryCodeListDefinition>())
        {
            registrations.Add(
                new LibraryOptionsRegistration(library.Id, library.Org, library.CodeListId, library.Version)
            );
        }

        foreach (var provider in _appImplementationFactory.GetAll<IAppOptionsProvider>())
        {
            registrations.Add(new ProviderOptionsRegistration(provider.Id, provider.GetType()));
        }

        foreach (var optionId in _appFiles.Current.GetOptionIds())
        {
            registrations.Add(new FileOptionsRegistration(optionId));
        }

        return registrations;
    }

    /// <summary>
    /// The registrations of one kind indexed by id. Ids match without regard to case, and the first registration
    /// with an id wins, so each provider's <see cref="IAppOptionsProvider.Id"/> is read exactly once.
    /// </summary>
    private static Dictionary<string, T> Index<T>(IEnumerable<T> items, Func<T, string> id)
    {
        var index = new Dictionary<string, T>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in items)
        {
            index.TryAdd(id(item), item);
        }

        return index;
    }

    /// <summary>
    /// One call to the batch method. The registrations are resolved at most once per call, and only the kinds a
    /// lookup gets far enough to need, so a call without an instance never constructs the instance providers
    /// unless an id matches nothing else.
    /// </summary>
    private sealed class Batch
    {
        private readonly AppImplementationFactory _appImplementationFactory;
        private readonly IServiceProvider _serviceProvider;
        private readonly AppFiles _appFiles;
        private readonly string? _language;
        private readonly InstanceIdentifier? _instanceIdentifier;
        private readonly CancellationToken _cancellationToken;
        private Dictionary<string, IInstanceAppOptionsProvider>? _instanceProviders;
        private Dictionary<string, JoinedAppOptionsDefinition>? _joined;
        private Dictionary<string, LibraryCodeListDefinition>? _library;
        private Dictionary<string, IAppOptionsProvider>? _appProviders;
        private IAltinn3LibraryCodeListService? _libraryService;

        public Batch(
            AppImplementationFactory appImplementationFactory,
            IServiceProvider serviceProvider,
            AppFiles appFiles,
            string? language,
            InstanceIdentifier? instanceIdentifier,
            CancellationToken cancellationToken
        )
        {
            _appImplementationFactory = appImplementationFactory;
            _serviceProvider = serviceProvider;
            // One snapshot for the whole call, so every lookup sees the same files
            _appFiles = appFiles;
            _language = language;
            _instanceIdentifier = instanceIdentifier;
            _cancellationToken = cancellationToken;
        }

        // The app implemented providers are resolved as late as possible, and the definitions are singletons the
        // app registered, so they come from the root provider
        private Dictionary<string, IInstanceAppOptionsProvider> InstanceProviders() =>
            LazyInitializer.EnsureInitialized(
                ref _instanceProviders,
                () => Index(_appImplementationFactory.GetAll<IInstanceAppOptionsProvider>(), p => p.Id)
            );

        private Dictionary<string, JoinedAppOptionsDefinition> Joined() =>
            LazyInitializer.EnsureInitialized(
                ref _joined,
                () => Index(_serviceProvider.GetServices<JoinedAppOptionsDefinition>(), d => d.Id)
            );

        private Dictionary<string, LibraryCodeListDefinition> Library() =>
            LazyInitializer.EnsureInitialized(
                ref _library,
                () => Index(_serviceProvider.GetServices<LibraryCodeListDefinition>(), d => d.Id)
            );

        private Dictionary<string, IAppOptionsProvider> AppProviders() =>
            LazyInitializer.EnsureInitialized(
                ref _appProviders,
                () => Index(_appImplementationFactory.GetAll<IAppOptionsProvider>(), p => p.Id)
            );

        private IAltinn3LibraryCodeListService LibraryService() =>
            LazyInitializer.EnsureInitialized(
                ref _libraryService,
                _serviceProvider.GetRequiredService<IAltinn3LibraryCodeListService>
            );

        public async Task<AppOptionsResult> Resolve(AppOptionsLookup lookup, int depth)
        {
            var optionId = lookup.OptionId;
            var source = AppOptionsSource.None;
            try
            {
                if (
                    _instanceIdentifier is { } instanceIdentifier
                    && InstanceProviders().TryGetValue(optionId, out var instanceProvider)
                )
                {
                    source = AppOptionsSource.InstanceProvider;
                    var options = await instanceProvider.GetInstanceAppOptionsAsync(
                        instanceIdentifier,
                        _language,
                        lookup.KeyValuePairs
                    );
                    return new AppOptionsResult
                    {
                        Lookup = lookup,
                        Source = source,
                        AppOptions = options,
                    };
                }

                if (Joined().TryGetValue(optionId, out var joined))
                {
                    source = AppOptionsSource.Joined;
                    return await ResolveJoined(lookup, joined, depth);
                }

                if (
                    Library().TryGetValue(optionId, out var library)
                    || LibraryCodeListReference.TryParse(optionId, out library)
                )
                {
                    source = AppOptionsSource.Library;
                    var options = await LibraryService()
                        .GetAppOptionsAsync(
                            library.Org,
                            library.CodeListId,
                            library.Version ?? "latest",
                            _language,
                            _cancellationToken
                        );
                    return new AppOptionsResult
                    {
                        Lookup = lookup,
                        Source = source,
                        AppOptions = options,
                    };
                }

                if (AppProviders().TryGetValue(optionId, out var provider))
                {
                    source = AppOptionsSource.AppProvider;
                    var options = await provider.GetAppOptionsAsync(_language, lookup.KeyValuePairs);
                    return new AppOptionsResult
                    {
                        Lookup = lookup,
                        Source = source,
                        AppOptions = options,
                    };
                }

                // File names match exactly, unlike the registered ids
                if (_appFiles.GetOptions(optionId) is { } bytes)
                {
                    source = AppOptionsSource.File;
                    // AppFilesLoader has verified that the file is json, so a failure here is a list element of
                    // the wrong shape
                    var options = JsonSerializer.Deserialize<List<AppOption>>(bytes.Span, _jsonSerializerOptions);
                    return new AppOptionsResult
                    {
                        Lookup = lookup,
                        Source = source,
                        AppOptions = new AppOptions { Options = options },
                    };
                }

                // The id exists, but only for lookups with an instance
                if (_instanceIdentifier is null && InstanceProviders().ContainsKey(optionId))
                {
                    source = AppOptionsSource.InstanceProvider;
                }

                return new AppOptionsResult { Lookup = lookup, Source = source };
            }
            catch (Exception exception) when (!_cancellationToken.IsCancellationRequested)
            {
                return new AppOptionsResult
                {
                    Lookup = lookup,
                    Source = source,
                    Error = exception,
                };
            }
        }

        /// <summary>
        /// Loads the sub lists with the same key/value pairs and instance, then concatenates their options in
        /// definition order and prefixes their parameters with the sub list id.
        /// </summary>
        private async Task<AppOptionsResult> ResolveJoined(
            AppOptionsLookup lookup,
            JoinedAppOptionsDefinition definition,
            int depth
        )
        {
            if (depth >= MaxJoinDepth)
            {
                throw new InvalidOperationException(
                    $"The joined app options '{definition.Id}' are nested more than {MaxJoinDepth} levels deep. "
                        + "Check AddJoinedAppOptions for a list that includes itself."
                );
            }

            var tasks = new Task<AppOptionsResult>[definition.SubOptionIds.Length];
            for (var i = 0; i < tasks.Length; i++)
            {
                tasks[i] = Resolve(new AppOptionsLookup(definition.SubOptionIds[i], lookup.KeyValuePairs), depth + 1);
            }

            var options = new List<AppOption>();
            var parameters = new Dictionary<string, string?>();
            var isCacheable = true;
            foreach (var sub in await Task.WhenAll(tasks))
            {
                if (sub.Error is { } error)
                {
                    return new AppOptionsResult
                    {
                        Lookup = lookup,
                        Source = AppOptionsSource.Joined,
                        Error = error,
                    };
                }

                if (sub.AppOptions?.Options is not { } subOptions)
                {
                    throw new KeyNotFoundException($"{sub.Lookup.OptionId} is not registered as an app option");
                }

                options.AddRange(subOptions);
                foreach (var (key, value) in sub.AppOptions.Parameters)
                {
                    parameters.Add($"{sub.Lookup.OptionId}_{key}", value);
                }

                isCacheable &= sub.AppOptions.IsCacheable;
            }

            return new AppOptionsResult
            {
                Lookup = lookup,
                Source = AppOptionsSource.Joined,
                AppOptions = new AppOptions
                {
                    Options = options,
                    Parameters = parameters,
                    IsCacheable = isCacheable,
                },
            };
        }
    }
}
