using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Maskinporten;

/// <summary>
/// <para>Reads the provisioned credentials at host startup, and what a missing client costs depends on where
/// the app is running.</para>
/// <para>A deployed app does not start without one. Studio provisions every v9 app's Maskinporten client, so
/// credentials that are missing or incomplete there are a platform fault rather than something the app can
/// do anything about, and stopping the host puts it in front of an operator - with the validator's message,
/// which names the file the platform provisions into - instead of leaving it to a token request that fails
/// hours later.</para>
/// <para>A local run starts without one. Most apps never call a Maskinporten-protected API, and a developer
/// working on one of those should not have to store a client before the app will start. The first token
/// request fails instead, through <see cref="MaskinportenClient.Settings"/>, carrying the same validator's
/// message - which names the command that stores a client. Storing one while the app is running is enough:
/// the channel polls, so the app picks it up without a restart.</para>
/// </summary>
/// <param name="options">The monitor the provisioned credentials are bound through.</param>
/// <param name="runtimeEnvironment">The platform the app is running on.</param>
/// <param name="logger">Logger interface.</param>
internal sealed class MaskinportenSettingsStartupCheck(
    IOptionsMonitor<MaskinportenSettings> options,
    RuntimeEnvironment runtimeEnvironment,
    ILogger<MaskinportenSettingsStartupCheck> logger
) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (!runtimeEnvironment.IsLocaltestPlatform())
        {
            // The validation failure is what stops the host, and its message says where the credentials were
            // expected, so there is nothing worth adding to it here.
            _ = options.CurrentValue;
            return Task.CompletedTask;
        }

        try
        {
            _ = options.CurrentValue;
        }
        catch (OptionsValidationException)
        {
            logger.LogInformation(
                "No Maskinporten client is stored for this local run. The app starts without one; the first "
                    + "Maskinporten token request fails until you store one with 'studioctl app maskinporten set', "
                    + "and a running app picks it up without a restart."
            );
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
