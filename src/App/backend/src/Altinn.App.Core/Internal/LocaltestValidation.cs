using System.Globalization;
using System.Net;
using System.Threading.Channels;
using Altinn.App.Core.Configuration;
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

    internal IAsyncEnumerable<VersionResult> Results => _resultChannel.Reader.ReadAllAsync();

    public LocaltestValidation(
        ILogger<LocaltestValidation> logger,
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<GeneralSettings> generalSettings,
        RuntimeEnvironment runtimeEnvironment,
        IHostApplicationLifetime lifetime,
        TimeProvider? timeProvider = null
    )
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _generalSettings = generalSettings;
        _runtimeEnvironment = runtimeEnvironment;
        _lifetime = lifetime;
        _timeProvider = timeProvider ?? TimeProvider.System;
        _resultChannel = Channel.CreateBounded<VersionResult>(
            new BoundedChannelOptions(10) { FullMode = BoundedChannelFullMode.DropWrite }
        );
    }

    private void Exit() => _lifetime.StopApplication();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            var settings = _generalSettings.CurrentValue;
            if (settings.DisableLocaltestValidation)
                return;

            if (!_runtimeEnvironment.IsLocaltestPlatform())
                return;

            var baseUrl = _runtimeEnvironment.GetPlatformBaseUrl();
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
                                return;
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
}
