using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Channels;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal;

internal static class LocaltestValidationDI
{
    public static IServiceCollection AddLocaltestValidation(this IServiceCollection services)
    {
        services.AddHostedService<LocaltestValidation>();
        return services;
    }
}

internal sealed class LocaltestValidation : BackgroundService
{
    private readonly ILogger<LocaltestValidation> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptionsMonitor<GeneralSettings> _generalSettings;
    private readonly RuntimeEnvironment _runtimeEnvironment;
    private readonly IHostApplicationLifetime _lifetime;
    private readonly TimeProvider _timeProvider;
    private readonly Channel<VersionResult> _resultChannel;
    private readonly IServer _server;
    private readonly IAppMetadata _appMetadata;
    private string? _registeredAppId = null;

    internal IAsyncEnumerable<VersionResult> Results => _resultChannel.Reader.ReadAllAsync();

    public LocaltestValidation(
        ILogger<LocaltestValidation> logger,
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<GeneralSettings> generalSettings,
        RuntimeEnvironment runtimeEnvironment,
        IHostApplicationLifetime lifetime,
        IServer server,
        IAppMetadata appMetadata,
        TimeProvider? timeProvider = null
    )
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _generalSettings = generalSettings;
        _runtimeEnvironment = runtimeEnvironment;
        _lifetime = lifetime;
        _server = server;
        _appMetadata = appMetadata;
        _timeProvider = timeProvider ?? TimeProvider.System;
        _resultChannel = Channel.CreateBounded<VersionResult>(
            new BoundedChannelOptions(10) { FullMode = BoundedChannelFullMode.DropWrite }
        );
    }

    private void Exit() => _lifetime.StopApplication();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        string? baseUrl = null;
        try
        {
            var settings = _generalSettings.CurrentValue;
            if (settings.DisableLocaltestValidation)
                return;

            if (!_runtimeEnvironment.IsLocaltestPlatform())
                return;

            baseUrl = _runtimeEnvironment.GetPlatformBaseUrl();
            while (!stoppingToken.IsCancellationRequested)
            {
                var result = await Version();
                try
                {
                    switch (result)
                    {
                        case VersionResult.Ok { Version: var version }:
                        {
                            _logger.LogInformation("Localtest version: {Version}", version);
                            if (version >= 2)
                            {
                                await WaitForServerAddresses(stoppingToken);

                                // Try to register with localtest if not on port 5005
                                var addressesFeature = _server.Features.Get<IServerAddressesFeature>();
                                if (addressesFeature?.Addresses != null && addressesFeature.Addresses.Count > 0)
                                {
                                    var address = addressesFeature.Addresses.First();

                                    // Server addresses can contain wildcard bind addresses that aren't valid URIs
                                    var portMatch = System.Text.RegularExpressions.Regex.Match(address, @":(\d+)$");
                                    if (portMatch.Success && int.TryParse(portMatch.Groups[1].Value, out var port))
                                    {
                                        if (port != 5005)
                                        {
                                            // Not on default port - registration is required
                                            await RegisterWithLocaltest(baseUrl, port, stoppingToken);
                                            // Wait for app shutdown before unregistering
                                            await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
                                        }
                                    }
                                    else
                                    {
                                        _logger.LogWarning(
                                            "Could not extract port from server address: {Address}",
                                            address
                                        );
                                    }
                                }
                                // Running on port 5005 or couldn't determine port - no registration needed
                                return;
                            }
                            _logger.LogError(
                                "Localtest version is not supported for this version of the app backend. Update your local copy of localtest (git pull)."
                                    + " Version found: '{Version}'. Shutting down..",
                                version
                            );
                            Exit();
                            return;
                        }
                        case VersionResult.ApiNotFound:
                        {
                            _logger.LogError(
                                "Localtest version may be outdated, as we failed to probe {HostName} API for version information."
                                    + " Is localtest running? Do you have a recent copy of localtest? Shutting down..",
                                baseUrl
                            );
                            Exit();
                            return;
                        }
                        case VersionResult.ApiNotAvailable { Error: var error }:
                            _logger.LogWarning(
                                "Localtest API could not be reached, is it running? Trying again soon.. Error: '{Error}'. Trying again soon..",
                                error
                            );
                            break;
                        case VersionResult.UnhandledStatusCode { StatusCode: var statusCode }:
                            _logger.LogError(
                                "Localtest version endpoint returned unexpected status code: '{StatusCode}'. Trying again soon..",
                                statusCode
                            );
                            break;
                        case VersionResult.UnknownError { Exception: var ex }:
                            _logger.LogError(ex, "Error while trying to fetch localtest version. Trying again soon..");
                            break;
                        case VersionResult.AppShuttingDown:
                            return;
                    }
                }
                finally
                {
                    if (!_resultChannel.Writer.TryWrite(result))
                        _logger.LogWarning("Couldn't log result to channel");
                }
                await Task.Delay(TimeSpan.FromSeconds(5), _timeProvider, stoppingToken);
            }
        }
        catch (OperationCanceledException) { }
        finally
        {
            // Unregister app if it was registered
            if (_registeredAppId != null && baseUrl != null)
            {
                await UnregisterFromLocaltest(baseUrl);
            }

            if (!_resultChannel.Writer.TryComplete())
                _logger.LogWarning("Couldn't close result channel");
        }
    }

    internal abstract record VersionResult
    {
        // Localtest is running, and we got a version number, which means this is a version of localtest that has
        // the new version endpoint.
        public sealed record Ok(int Version) : VersionResult;

        public sealed record InvalidVersionResponse(string Repsonse) : VersionResult;

        // Whatever listened on "local.altinn.cloud:80" responded with a 404
        public sealed record ApiNotFound() : VersionResult;

        // The request timed out. Note that there may be multiple variants of timeouts.
        public sealed record Timeout() : VersionResult;

        // Could not connect to "local.altinn.cloud:80", a server might not be listening on that address
        // or it might be a network issue
        public sealed record ApiNotAvailable(HttpRequestError Error) : VersionResult;

        // Request was cancelled because the application is shutting down
        public sealed record AppShuttingDown() : VersionResult;

        // The localtest endpoint returned an unexpected statuscode
        public sealed record UnhandledStatusCode(HttpStatusCode StatusCode) : VersionResult;

        // Unhandled error
        public sealed record UnknownError(Exception Exception) : VersionResult;
    }

    private async Task<VersionResult> Version()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5), _timeProvider);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cts.Token, _lifetime.ApplicationStopping);
        var cancellationToken = linkedCts.Token;
        try
        {
            using var client = _httpClientFactory.CreateClient();

            var baseUrl = _runtimeEnvironment.GetPlatformBaseUrl();
            var url = $"{baseUrl}/Home/Localtest/Version";

            using var response = await client.GetAsync(url, cancellationToken);
            switch (response.StatusCode)
            {
                case HttpStatusCode.OK:
                    var versionStr = await response.Content.ReadAsStringAsync(cancellationToken);
                    if (!int.TryParse(versionStr, CultureInfo.InvariantCulture, out var version))
                        return new VersionResult.InvalidVersionResponse(versionStr);
                    return new VersionResult.Ok(version);
                case HttpStatusCode.NotFound:
                    return new VersionResult.ApiNotFound();
                default:
                    return new VersionResult.UnhandledStatusCode(response.StatusCode);
            }
        }
        catch (OperationCanceledException)
        {
            if (_lifetime.ApplicationStopping.IsCancellationRequested)
                return new VersionResult.AppShuttingDown();

            return new VersionResult.Timeout();
        }
        catch (HttpRequestException ex)
        {
            if (_lifetime.ApplicationStopping.IsCancellationRequested)
                return new VersionResult.AppShuttingDown();

            return new VersionResult.ApiNotAvailable(ex.HttpRequestError);
        }
        catch (Exception ex)
        {
            return new VersionResult.UnknownError(ex);
        }
    }

    private async Task WaitForServerAddresses(CancellationToken stoppingToken)
    {
        // Wait for server to bind addresses (checked every 100ms, max 10 seconds)
        var addressesFeature = _server.Features.Get<IServerAddressesFeature>();
        if (addressesFeature == null)
        {
            _logger.LogWarning("Server does not support IServerAddressesFeature");
            return;
        }

        var maxAttempts = 100; // 10 seconds total
        var attempt = 0;
        while (attempt < maxAttempts && !stoppingToken.IsCancellationRequested)
        {
            if (addressesFeature.Addresses != null && addressesFeature.Addresses.Count > 0)
            {
                // Check if we have actual bound addresses (not configuration placeholders)
                // Configuration addresses contain wildcards like "http://*:8080" or "http://*:0"
                // Actual bound addresses look like "http://[::]:46519" or "http://0.0.0.0:5005"
                var firstAddress = addressesFeature.Addresses.First();
                if (!firstAddress.Contains("*"))
                {
                    return;
                }
            }
            await Task.Delay(TimeSpan.FromMilliseconds(100), _timeProvider, stoppingToken);
            attempt++;
        }

        _logger.LogWarning("Server addresses not available after 10 seconds");
    }

    private async Task RegisterWithLocaltest(string baseUrl, int port, CancellationToken stoppingToken)
    {
        var applicationMetadata = await _appMetadata.GetApplicationMetadata();
        var appId = applicationMetadata.Id;
        var registrationRequest = new { appId, port };

        var url = $"{baseUrl}/Home/Localtest/Register";

        int maxRetries = 3;
        int retryCount = 0;

        while (retryCount < maxRetries && !stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var client = _httpClientFactory.CreateClient();
                var response = await client.PostAsJsonAsync(url, registrationRequest, stoppingToken);
                response.EnsureSuccessStatusCode();

                _registeredAppId = appId;
                _logger.LogInformation(
                    "Successfully registered {AppId} with localtest on port {Port}",
                    appId,
                    port
                );

            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Could not connect to localtest for app registration (attempt {Attempt}/{MaxAttempts}). Retrying in 2 seconds...",
                    retryCount + 1,
                    maxRetries
                );
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(
                    ex,
                    "Error while registering app with localtest (attempt {Attempt}/{MaxAttempts})",
                    retryCount + 1,
                    maxRetries
                );
            }

            retryCount++;
            if (retryCount < maxRetries)
            {
                await Task.Delay(TimeSpan.FromSeconds(2), _timeProvider, stoppingToken);
            }
        }

        if (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogError(
                "Failed to register app {AppId} with localtest after {MaxAttempts} attempts",
                appId,
                maxRetries
            );
            Exit();
        }
    }

    private async Task UnregisterFromLocaltest(string baseUrl)
    {
        if (_registeredAppId == null)
            return;

        using var client = _httpClientFactory.CreateClient();
        var url = $"{baseUrl}/Home/Localtest/Register/{Uri.EscapeDataString(_registeredAppId)}";

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var response = await client.DeleteAsync(url, cts.Token);

        if (response.IsSuccessStatusCode)
        {
            _logger.LogInformation("Successfully unregistered app {AppId} from localtest", _registeredAppId);
        }
        else
        {
            _logger.LogWarning(
                "Failed to unregister app {AppId} from localtest. Status: {StatusCode}",
                _registeredAppId,
                response.StatusCode
            );
        }
    }
}
