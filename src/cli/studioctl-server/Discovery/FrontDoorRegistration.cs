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
/// by <c>studioctl run</c>, since discovery finds both. Called from the registry's refresh, so one app at a time.
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

    /// <summary>The apps this server registered, by app id: the address and the app instance it registered.</summary>
    private readonly Dictionary<string, Registered> _registered = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>The apps to register again on the next refresh: the last registration failed or was partial.</summary>
    private readonly HashSet<string> _retry = new(StringComparer.OrdinalIgnoreCase);

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

    /// <summary>The app's address as the front door reaches it: its port on the host, through the host gateway.</summary>
    public static Uri FrontDoorUrl(DiscoveredApp app) =>
        new UriBuilder(Uri.UriSchemeHttp, HostGatewayName, app.BaseUri.Value.Port).Uri;

    /// <summary>
    /// Brings the front door in line with the discovered apps. An app is registered when it is new, came back on
    /// another port or as another process or container (it may have changed, and the registration provisions it from
    /// its API again), or when the front door no longer lists it, as after the localtest container lost its data; a
    /// failed registration is retried on the next refresh. An app that is gone is deregistered. Only apps this server
    /// registered are deregistered, so a registration left from an earlier session is not deprovisioned.
    /// </summary>
    public async Task Reconcile(IReadOnlyList<DiscoveredApp> apps, CancellationToken cancellationToken)
    {
        if (_options is not { Enabled: true, PlatformUri: { } platform })
            return;

        var current = new Dictionary<string, Registered>(StringComparer.OrdinalIgnoreCase);
        foreach (var app in apps)
            current.TryAdd(app.AppId, new Registered(FrontDoorUrl(app), InstanceOf(app)));

        using var client = _httpClientFactory.CreateClient(HttpClientName);
        var listed = current.Any(app => _registered.GetValueOrDefault(app.Key) == app.Value)
            ? await Listed(client, platform, cancellationToken)
            : null;
        foreach (var (appId, wanted) in current)
        {
            if (_registered.GetValueOrDefault(appId) == wanted && !_retry.Contains(appId))
            {
                if (listed is null || listed.Contains(Key(appId, wanted.Url)))
                    continue;
                if (_logger.IsEnabled(LogLevel.Information))
                    _logger.LogInformation(
                        "The localtest-v2 front door no longer lists {AppId} at {Url}; registering it again",
                        appId,
                        wanted.Url
                    );
            }
            var outcome = await Register(client, platform, appId, wanted.Url, cancellationToken);
            if (outcome is not Outcome.Failed)
                _registered[appId] = wanted;
            if (outcome is Outcome.Registered)
                _retry.Remove(appId);
            else
                _retry.Add(appId);
        }

        foreach (var appId in _registered.Keys.Where(appId => !current.ContainsKey(appId)).ToArray())
        {
            await Deregister(client, platform, appId, cancellationToken);
            _registered.Remove(appId);
        }
        _retry.RemoveWhere(appId => !current.ContainsKey(appId));
    }

    /// <summary>The app instance: its process or container, so that a restarted app is registered again.</summary>
    private static string InstanceOf(DiscoveredApp app) =>
        app.ContainerId ?? app.ProcessId?.ToString(CultureInfo.InvariantCulture) ?? "";

    private static string Key(string appId, Uri url) => appId + " " + url.GetLeftPart(UriPartial.Authority);

    /// <summary>
    /// The registrations the front door lists (<c>GET localtest/api/apps</c>), as app id and address; null when it
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
    /// it; registering again does.
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

    private sealed record ListedApp(string Org, string App, string Url);
}
