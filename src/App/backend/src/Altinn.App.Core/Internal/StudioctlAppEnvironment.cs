using Microsoft.Extensions.Configuration;

namespace Altinn.App.Core.Internal;

/// <summary>
/// <para>The environment studioctl, the local development CLI, hands an app it runs, and the one place the app
/// libraries know its shape. Every local run of a v9 app is configured by studioctl: <c>studioctl app run</c>
/// starts the app with these values in its process environment, and an app started any other way in
/// Development - <c>dotnet run</c>, an IDE - is given the same values by <c>StudioctlLocalConfiguration</c> in
/// Altinn.App.Api, which runs <c>studioctl app env --json</c> and imports the flat map it prints into the
/// app's configuration. Either way the values end up in the app's <see cref="IConfiguration"/>, which is
/// therefore where the libraries read them; the process environment alone would miss the imported case.</para>
/// <para>Most of what studioctl hands over is ordinary app configuration - platform endpoints, the hostname,
/// the Kestrel URL - that the app binds exactly as it would in a cluster. The keys here are the ones addressed
/// to the libraries themselves. studioctl's side of the contract is <c>src/cli/internal/cmd/app/env.go</c>.</para>
/// </summary>
internal static class StudioctlAppEnvironment
{
    /// <summary>
    /// Set to <c>1</c> by <c>studioctl app run</c>. Its presence in the process environment tells
    /// <c>StudioctlLocalConfiguration</c> that studioctl started the app and its environment is complete, so
    /// there is nothing to import.
    /// </summary>
    internal const string AppRunKey = "STUDIOCTL_APP_RUN";

    /// <summary>
    /// <para>The directory studioctl provisions a local run's secrets into, the way the operator provisions the
    /// secrets mount in a cluster. It holds every file the platform provisions for the app libraries, among
    /// them the Maskinporten client stored with <c>studioctl app maskinporten set</c>;
    /// <c>ProvisionedSecrets.ForPlatform</c> reads it, on the localtest platform only.</para>
    /// <para>Deliberately not shaped like a configuration section an app would think to write: the directory
    /// belongs to studioctl, the way the secrets mount belongs to the operator.</para>
    /// </summary>
    internal const string AppSecretsDirectoryKey = "STUDIOCTL_APP_SECRETS_DIR";
}
