using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.ProvisionedSecrets;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Maskinporten;

/// <summary>
/// <para>Says where the credentials were expected, and how to supply them, when nothing at all was read. The
/// data annotations on <see cref="MaskinportenSettings"/> report a missing field by name, and the options
/// factory aggregates every validator's failures, so for the empty file - the case a developer meets first -
/// this adds the fix to those field names.</para>
/// <para>Anything at all having been read is enough to step aside: a file with only a key in it is a file the
/// platform provisioned, and the data annotations name the fields it is missing. This validator speaks for
/// the empty file alone, so every field <see cref="MaskinportenSettings"/> holds counts as something read -
/// including the key, which no annotation requires.</para>
/// <para>Every app has a provisioned Maskinporten client, so this runs at host startup and an app with no
/// credentials does not start. Rotating a file that is there is a different matter, and still reaches a
/// running app without a restart through the channel's polling file provider.</para>
/// </summary>
/// <param name="secrets">The channel the credentials are provisioned through.</param>
/// <param name="runtimeEnvironment">The platform the app is running on.</param>
internal sealed class ValidateMaskinportenSettingsProvisioned(
    ProvisionedSecrets secrets,
    RuntimeEnvironment runtimeEnvironment
) : IValidateOptions<MaskinportenSettings>
{
    public ValidateOptionsResult Validate(string? name, MaskinportenSettings options)
    {
        bool somethingWasRead =
            !string.IsNullOrWhiteSpace(options.Authority)
            || !string.IsNullOrWhiteSpace(options.ClientId)
            || options.Jwk is not null
            || !string.IsNullOrWhiteSpace(options.JwkBase64);

        return somethingWasRead
            ? ValidateOptionsResult.Skip
            : ValidateOptionsResult.Fail(MissingCredentialsMessage(secrets, runtimeEnvironment));
    }

    /// <summary>
    /// The local-run message names the command and not the file: where studioctl keeps the client is
    /// studioctl's business, and naming the file would only invite editing it by hand. The platform message
    /// does name the path, because that is what an operator debugging a deployment needs.
    /// </summary>
    /// <param name="secrets">The channel the credentials are provisioned through.</param>
    /// <param name="runtimeEnvironment">The platform the app is running on.</param>
    internal static string MissingCredentialsMessage(
        ProvisionedSecrets secrets,
        RuntimeEnvironment runtimeEnvironment
    ) =>
        runtimeEnvironment.IsLocaltestPlatform()
            ? "No Maskinporten client is stored for this local run. Store one with "
                + "'studioctl app maskinporten set', then start the app again."
            : $"No Maskinporten credentials were read from '{secrets.PathOf(ProvisionedSecretFiles.Maskinporten)}', "
                + "where the platform provisions them. Studio provisions the app's client when the app is deployed. "
                + "For a local run, start the app through studioctl and store a client with "
                + "'studioctl app maskinporten set'.";
}
