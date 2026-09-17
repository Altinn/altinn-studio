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
/// <para>Maskinporten was the first tenant; the app's callback verification codes are the second. Both are
/// secrets the platform issues, provisions and rotates for the app, and neither is an app's to supply.</para>
/// </summary>
internal static class ProvisionedSecretFiles
{
    /// <summary>
    /// The credentials of the app's one Maskinporten identity.
    /// </summary>
    public static readonly ProvisionedSecretFile Maskinporten = new(
        "RUNTIME_APP_SECRETS_MASKINPORTEN_FILENAME",
        "MaskinportenSettings"
    );

    /// <summary>
    /// The app's callback verification codes: the shared secrets it signs and verifies the callbacks of the
    /// workflow engine, the notification service and the payment provider with.
    /// </summary>
    public static readonly ProvisionedSecretFile AppCodes = new("RUNTIME_APP_SECRETS_APPCODES_FILENAME", "AppCodes");

    /// <summary>
    /// Every hosted file.
    /// </summary>
    public static IReadOnlyList<ProvisionedSecretFile> All { get; } = [Maskinporten, AppCodes];
}
