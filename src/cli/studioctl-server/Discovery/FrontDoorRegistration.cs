using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Altinn.Studio.StudioctlServer.Platform;

namespace Altinn.Studio.StudioctlServer.Discovery;

/// <summary>
/// Whether the discovered apps are registered with the localtest-v2 front door, and where it is: on while that runtime is
/// up (studioctl sets <c>Localtest:RegisterApps</c>), at the public origin <c>Localtest:Url</c> the storage probe uses.
/// </summary>
internal sealed record FrontDoorRegistrationOptions(Uri? PlatformUri, bool Enabled)
{
    public static FrontDoorRegistrationOptions FromConfiguration(IConfiguration configuration)
    {
        var platform = Uri.TryCreate(configuration["Localtest:Url"], UriKind.Absolute, out var uri) ? uri : null;
        var enabled = EnvironmentValues.IsTruthy(configuration["Localtest:RegisterApps"]);
        return new FrontDoorRegistrationOptions(platform, enabled && platform is not null);
    }
}

/// <summary>
/// Registers each discovered app with the localtest-v2 front door, the localtest container: one
/// <c>PUT localtest/api/apps/{org}/{app}</c> with the app's address as the container reaches it routes
/// <c>/{org}/{app}/</c> to the app and deploys it to the platform from the app's own API, as Altinn Studio deploys one;
/// <c>DELETE</c> deprovisions it when the app is gone. Apps started from an IDE are registered exactly like apps started
/// by <c>studioctl run</c>, since discovery finds both. The registry's refresh hands over the discovered apps, and the
/// calls run beside discovery, at most one per app: a slow front door delays only the app it is registering.
/// </summary>
internal sealed class FrontDoorRegistration
{
    public const string HttpClientName = "front-door-registration";

    /// <summary>How the front door, in a container, reaches the host: the runtime's host gateway.</summary>
    public const string HostGatewayName = "host.docker.internal";

    private const string AppsPath = "localtest/api/apps";
    private const string AppPathPrefix = "localtest/api/apps/";
    private const int MaxLoggedBody = 2000;

    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    private readonly FrontDoorRegistrationOptions _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<FrontDoorRegistration> _logger;

    private readonly Lock _lock = new();

    /// <summary>The apps this server registers or registered, by app id.</summary>
    private readonly Dictionary<string, AppState> _apps = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>The listing of the front door's apps in flight, if any.</summary>
    private Task? _listing;

    public FrontDoorRegistration(
        FrontDoorRegistrationOptions options,
        IHttpClientFactory httpClientFactory,
        ILogger<FrontDoorRegistration> logger
    )
    {
        _options = options;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public bool Enabled => _options.Enabled;

    /// <summary>
    /// The app's address as the front door reaches it: the one discovery found for it (a container on the localtest-v2 network,
    /// at its alias), else its port on the host, through the host gateway.
    /// </summary>
    public static Uri FrontDoorUrl(DiscoveredApp app) =>
        app.FrontDoorUri ?? new UriBuilder(Uri.UriSchemeHttp, HostGatewayName, app.BaseUri.Value.Port).Uri;

    /// <summary>
    /// Starts bringing the front door in line with the discovered apps, without waiting for it. An app is registered
    /// when it is new, came back on another port or as another process or container (it may have changed, and the
    /// registration provisions it from its API again), or when the front door no longer lists it, as after the
    /// localtest container lost its data. A failed registration is retried on the next refresh. An app that is gone is
    /// deregistered. Only apps this server registered are deregistered, so a registration left from an earlier session
    /// is not deprovisioned. An app with a call in flight is left to it and looked at again on a later refresh.
    /// </summary>
    public void Reconcile(IReadOnlyList<DiscoveredApp> apps, CancellationToken cancellationToken)
    {
        if (_options is not { Enabled: true, PlatformUri: { } platform })
            return;

        var current = new Dictionary<string, Registered>(StringComparer.OrdinalIgnoreCase);
        foreach (var app in apps)
            current.TryAdd(app.AppId, new Registered(FrontDoorUrl(app), InstanceOf(app)));

        lock (_lock)
        {
            var unchanged = new Dictionary<string, Registered>(StringComparer.OrdinalIgnoreCase);
            foreach (var (appId, wanted) in current)
            {
                if (!_apps.TryGetValue(appId, out var state))
                {
                    state = new AppState();
                    _apps.Add(appId, state);
                }
                if (state.Work is not null)
                    continue;
                if (state.Registered == wanted && !state.Retry)
                    unchanged.Add(appId, wanted);
                else
                    StartRegistration(platform, appId, state, wanted, cancellationToken);
            }

            foreach (var (appId, state) in _apps.Where(app => !current.ContainsKey(app.Key)).ToArray())
            {
                if (state.Work is not null)
                    continue;
                if (state.Registered is null)
                    _apps.Remove(appId);
                else
                    state.Work = Task.Run(() => RunRemoval(platform, appId, cancellationToken), CancellationToken.None);
            }

            if (_listing is null && unchanged.Count > 0)
                _listing = Task.Run(
                    () => RegisterUnlisted(platform, unchanged, cancellationToken),
                    CancellationToken.None
                );
        }
    }

    /// <summary>
    /// Whether the app's registration has an outcome: the front door has been asked to register this instance of the
    /// app at this address, and no call for it is in flight. Always true with registration off.
    /// </summary>
    public bool Settled(DiscoveredApp app)
    {
        if (_options is not { Enabled: true, PlatformUri: not null })
            return true;

        var wanted = new Registered(FrontDoorUrl(app), InstanceOf(app));
        lock (_lock)
            return _apps.TryGetValue(app.AppId, out var state) && state is { Work: null } && state.Attempted == wanted;
    }

    /// <summary>Completes once no call to the front door is in flight, including those the finished calls started.</summary>
    public async Task WhenIdle()
    {
        while (true)
        {
            Task[] inFlight;
            lock (_lock)
            {
                inFlight = [.. _apps.Values.Select(static state => state.Work).OfType<Task>()];
                if (_listing is not null)
                    inFlight = [.. inFlight, _listing];
            }
            if (inFlight.Length == 0)
                return;
            await Task.WhenAll(inFlight);
        }
    }

    /// <summary>Starts registering the app. The caller holds the lock and the app has no call in flight.</summary>
    private void StartRegistration(
        Uri platform,
        string appId,
        AppState state,
        Registered wanted,
        CancellationToken cancellationToken
    ) =>
        state.Work = Task.Run(
            () => RunRegistration(platform, appId, wanted, cancellationToken),
            CancellationToken.None
        );

    private async Task RunRegistration(
        Uri platform,
        string appId,
        Registered wanted,
        CancellationToken cancellationToken
    )
    {
        var outcome = Outcome.Failed;
        try
        {
            using var client = _httpClientFactory.CreateClient(HttpClientName);
            outcome = await Register(client, platform, appId, wanted.Url, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Shutting down.
        }
        finally
        {
            lock (_lock)
            {
                var state = _apps[appId];
                state.Attempted = wanted;
                if (outcome is not Outcome.Failed)
                    state.Registered = wanted;
                state.Retry = outcome is not Outcome.Registered;
                state.Work = null;
            }
        }
    }

    private async Task RunRemoval(Uri platform, string appId, CancellationToken cancellationToken)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient(HttpClientName);
            await Deregister(client, platform, appId, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Shutting down.
        }
        finally
        {
            lock (_lock)
                _apps.Remove(appId);
        }
    }

    /// <summary>
    /// Registers again the apps of <paramref name="registered"/> the front door no longer lists, unless a call for one
    /// started or its registration changed meanwhile.
    /// </summary>
    private async Task RegisterUnlisted(
        Uri platform,
        Dictionary<string, Registered> registered,
        CancellationToken cancellationToken
    )
    {
        HashSet<string>? listed = null;
        try
        {
            using var client = _httpClientFactory.CreateClient(HttpClientName);
            listed = await Listed(client, platform, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Shutting down.
        }
        finally
        {
            lock (_lock)
            {
                _listing = null;
                foreach (var (appId, wanted) in registered)
                {
                    if (listed is null || listed.Contains(Key(appId, wanted.Url)))
                        continue;
                    if (
                        !_apps.TryGetValue(appId, out var state)
                        || state.Work is not null
                        || state.Registered != wanted
                        || state.Retry
                    )
                        continue;
                    if (_logger.IsEnabled(LogLevel.Information))
                        _logger.LogInformation(
                            "The localtest-v2 front door no longer lists {AppId} at {Url}; registering it again",
                            appId,
                            wanted.Url
                        );
                    StartRegistration(platform, appId, state, wanted, cancellationToken);
                }
            }
        }
    }

    /// <summary>The app instance: its process or container, so that a restarted app is registered again.</summary>
    private static string InstanceOf(DiscoveredApp app) =>
        app.ContainerId ?? app.ProcessId?.ToString(CultureInfo.InvariantCulture) ?? "";

    private static string Key(string appId, Uri url) => appId + " " + url.GetLeftPart(UriPartial.Authority);

    /// <summary>
    /// The registrations the front door lists (<c>GET localtest/api/apps</c>), as app id and address. Null when it
    /// cannot say, in which case the apps this server registered count as registered.
    /// </summary>
    private async Task<HashSet<string>?> Listed(HttpClient client, Uri platform, CancellationToken cancellationToken)
    {
        var endpoint = new Uri(platform, AppsPath);
        try
        {
            var listed = await client.GetFromJsonAsync<ListedApp[]>(endpoint, _jsonOptions, cancellationToken);
            return listed is null
                ? null
                : new HashSet<string>(
                    listed
                        .Where(app => Uri.TryCreate(app.Url, UriKind.Absolute, out _))
                        .Select(app => Key(app.Org + "/" + app.App, new Uri(app.Url))),
                    StringComparer.OrdinalIgnoreCase
                );
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            if (_logger.IsEnabled(LogLevel.Debug))
                _logger.LogDebug(ex, "Listing the localtest-v2 front door's apps at {Endpoint} failed", endpoint);
            return null;
        }
    }

    private async Task<Outcome> Register(
        HttpClient client,
        Uri platform,
        string appId,
        Uri url,
        CancellationToken cancellationToken
    )
    {
        var endpoint = new Uri(platform, AppPathPrefix + appId);
        try
        {
            using var response = await client.PutAsJsonAsync(
                endpoint,
                new RegistrationRequest(url.GetLeftPart(UriPartial.Authority)),
                _jsonOptions,
                cancellationToken
            );
            var raw = await response.Content.ReadAsStringAsync(cancellationToken);
            var body = ForLog(raw);
            if (response.IsSuccessStatusCode && DialogportenSyncFailed(raw))
            {
                if (_logger.IsEnabled(LogLevel.Warning))
                    _logger.LogWarning(
                        "Registered {AppId} with the localtest-v2 front door at {Url}, but Dialogporten's sync failed: {Result}; registering it again on the next refresh",
                        appId,
                        url,
                        body
                    );
                return Outcome.Partial;
            }
            if (response.IsSuccessStatusCode)
            {
                if (_logger.IsEnabled(LogLevel.Information))
                    _logger.LogInformation(
                        "Registered {AppId} with the localtest-v2 front door at {Url}: {Result}",
                        appId,
                        url,
                        body
                    );
                return Outcome.Registered;
            }
            if (_logger.IsEnabled(LogLevel.Warning))
                _logger.LogWarning(
                    "Registering {AppId} with the localtest-v2 front door at {Url} answered {StatusCode}: {Result}; retrying on the next refresh",
                    appId,
                    url,
                    (int)response.StatusCode,
                    body
                );
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Registering {AppId} with the localtest-v2 front door at {Endpoint} failed; retrying on the next refresh",
                appId,
                endpoint
            );
        }
        return Outcome.Failed;
    }

    /// <summary>
    /// Whether the registration's answer says Dialogporten's sync failed (<c>provisioning.result.dialogporten</c>), as
    /// when the app is registered while the <c>dialogporten</c> group is still starting. The front door does not retry
    /// it. Registering again does.
    /// </summary>
    private static bool DialogportenSyncFailed(string body)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            return document.RootElement.TryGetProperty("provisioning", out var provisioning)
                && provisioning.ValueKind == JsonValueKind.Object
                && provisioning.TryGetProperty("result", out var result)
                && result.ValueKind == JsonValueKind.Object
                && result.TryGetProperty("dialogporten", out var dialogporten)
                && dialogporten.ValueKind == JsonValueKind.String
                && dialogporten.GetString() == "Failed";
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private async Task Deregister(HttpClient client, Uri platform, string appId, CancellationToken cancellationToken)
    {
        var endpoint = new Uri(platform, AppPathPrefix + appId);
        try
        {
            using var response = await client.DeleteAsync(endpoint, cancellationToken);
            var body = ForLog(await response.Content.ReadAsStringAsync(cancellationToken));
            if (response.IsSuccessStatusCode)
            {
                if (_logger.IsEnabled(LogLevel.Information))
                    _logger.LogInformation("Removed {AppId} from the localtest-v2 front door", appId);
            }
            else if (_logger.IsEnabled(LogLevel.Warning))
                _logger.LogWarning(
                    "Removing {AppId} from the localtest-v2 front door answered {StatusCode}: {Result}",
                    appId,
                    (int)response.StatusCode,
                    body
                );
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Removing {AppId} from the localtest-v2 front door failed", appId);
        }
    }

    private static string ForLog(string body)
    {
        body = body.ReplaceLineEndings(" ");
        return body.Length <= MaxLoggedBody ? body : body[..MaxLoggedBody] + "...";
    }

    private sealed record RegistrationRequest(string Url);

    private enum Outcome
    {
        Failed,
        Registered,

        /// <summary>Registered, but a step to repeat failed (Dialogporten's sync).</summary>
        Partial,
    }

    private sealed record Registered(Uri Url, string Instance);

    private sealed class AppState
    {
        /// <summary>What the front door has from this server: set by a registration that did not fail.</summary>
        public Registered? Registered { get; set; }

        /// <summary>What the last registration asked for, whatever its outcome.</summary>
        public Registered? Attempted { get; set; }

        /// <summary>Whether to register the app again on the next refresh: the last registration failed or was partial.</summary>
        public bool Retry { get; set; }

        /// <summary>The registration or removal in flight, if any.</summary>
        public Task? Work { get; set; }
    }

    private sealed record ListedApp(string Org, string App, string Url);
}
