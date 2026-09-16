using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal.ProvisionedSecrets;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Maskinporten;

/// <summary>
/// Says where the credentials were expected, and how to supply them, when nothing at all was read. The data
/// annotations on <see cref="MaskinportenSettings"/> report a missing field by name, and the options factory
/// aggregates every validator's failures, so for the empty file - the case a developer meets first - this adds
/// the fix to those field names.
/// </summary>
/// <param name="secrets">The channel the credentials are provisioned through.</param>
internal sealed class ValidateMaskinportenSettingsProvisioned(ProvisionedSecrets secrets)
    : IValidateOptions<MaskinportenSettings>
{
    public ValidateOptionsResult Validate(string? name, MaskinportenSettings options)
    {
        if (!string.IsNullOrWhiteSpace(options.Authority) || !string.IsNullOrWhiteSpace(options.ClientId))
        {
            return ValidateOptionsResult.Skip;
        }

        return ValidateOptionsResult.Fail(MissingCredentialsMessage(secrets));
    }

    /// <summary>
    /// The local-run message names the command and not the file: where studioctl keeps the client is
    /// studioctl's business, and naming the file would only invite editing it by hand. The platform message
    /// does name the mount, because that is what an operator debugging a deployment needs.
    /// </summary>
    /// <param name="secrets">The channel the credentials are provisioned through.</param>
    internal static string MissingCredentialsMessage(ProvisionedSecrets secrets) =>
        secrets.ProvisionedByStudioctl
            ? "No Maskinporten client is stored for this local run. Store one with "
                + "'studioctl app maskinporten set'; a running app picks it up without a restart."
            : $"No Maskinporten credentials were read from '{secrets.PathOf(ProvisionedSecretFiles.Maskinporten)}', "
                + "where the platform provisions them. Studio provisions the app's client when the app is deployed. "
                + "For a local run, start the app through studioctl and store a client with "
                + "'studioctl app maskinporten set'.";
}
