namespace Altinn.App.Core.Internal.ProvisionedSecrets;

/// <summary>
/// <para>Every file in the app's secrets directory that the libraries host themselves. This is the single
/// list, and the two halves of hosting a file read it: the private configuration root loads exactly these
/// files, and the sweep of the secrets directory into the app's own configuration root excludes exactly these
/// files. A file listed here is therefore reachable through <see cref="ProvisionedSecrets"/> and nowhere
/// else.</para>
/// <para>These are the configured descriptors: what the libraries know about a file before an app runs. What
/// the platform called it is not here — <see cref="ProvisionedSecrets.FromConfiguration"/> resolves every
/// descriptor once, and the channel holds the resolved copies.</para>
/// <para>Maskinporten is the first tenant. The app codes file is the next one.</para>
/// </summary>
internal static class ProvisionedSecretFiles
{
    /// <summary>
    /// The credentials of the app's one Maskinporten identity.
    /// </summary>
    public static readonly ProvisionedSecretFile Maskinporten = new(
        "RUNTIME_APP_MASKINPORTEN_SECRETS_FILENAME",
        "MaskinportenSettings"
    );

    /// <summary>
    /// Every hosted file.
    /// </summary>
    public static IReadOnlyList<ProvisionedSecretFile> All { get; } = [Maskinporten];
}
