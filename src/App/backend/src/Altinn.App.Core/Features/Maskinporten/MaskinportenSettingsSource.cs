using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Core.Features.Maskinporten;

/// <summary>
/// <para>The credentials of the app's one Maskinporten identity, read from the <c>maskinporten-settings.json</c>
/// file the platform provisions.</para>
/// <para>The file is loaded into a configuration root that belongs to the Maskinporten client alone, and is
/// never added to the app's own configuration root. Nothing an app supplies — a configuration section, an
/// environment variable, a <c>Configure&lt;T&gt;</c> call — can reach these options, so the identity an app
/// authenticates as is the provisioned one and cannot be renegotiated.</para>
/// <para>Where the file lives is the platform's to say, never the app's. In a cluster that is the fixed
/// secrets mount. On the localtest platform studioctl provisions the file the way the operator does in a
/// cluster, and names the directory it provisions into through
/// <see cref="StudioctlSecretsDirectoryKey"/>; see <see cref="ForPlatform"/>.</para>
/// <para>The file provider polls, because in a cluster this path is a Kubernetes projected volume: operator-driven
/// key rotation therefore reaches <see cref="IOptionsMonitor{TOptions}"/> consumers without a restart. The same
/// polling is what lets a developer store a client for a local run that is already up.</para>
/// <para>Despite the name, this is not an <see cref="IConfigurationSource"/>: it is not handed to a
/// <see cref="IConfigurationBuilder"/>, it is a DI singleton holding the built root open, and the container
/// disposes it. "Source" here means the place the settings come from.</para>
/// </summary>
internal sealed class MaskinportenSettingsSource : IDisposable
{
    /// <summary>
    /// The file the platform provisions the app's credentials in, wherever it provisions it.
    /// </summary>
    internal const string FileName = "maskinporten-settings.json";

    /// <summary>
    /// What every Maskinporten credentials file is named after; the app's configuration root keeps anything
    /// with this prefix out of the secrets mount sweep.
    /// </summary>
    internal const string FileNamePrefix = "maskinporten-settings";

    /// <summary>
    /// Where the platform provisions the app's credentials in a cluster. Deliberately not reachable from the
    /// app's configuration: an app able to move this could point the client at an identity of its own, which
    /// is the whole thing this type exists to prevent. It stays internal rather than becoming a constant so
    /// the library can source the file elsewhere should the need ever arise, and so tests can supply one.
    /// </summary>
    internal static string DefaultFilePath { get; } = Path.Join(AppSettings.DefaultRuntimeSecretsDirectory, FileName);

    /// <summary>
    /// <para>The configuration key through which studioctl names the directory it provisions a local run's
    /// secrets into. studioctl sets it as an environment variable for <c>studioctl app run</c> and
    /// includes it in <c>studioctl app env</c>, which is how an app started with <c>dotnet run</c> learns it.</para>
    /// <para>Honored on the localtest platform only, and deliberately not shaped like a configuration section
    /// an app would think to write: the directory belongs to studioctl, the way the secrets mount belongs to the
    /// operator.</para>
    /// </summary>
    internal const string StudioctlSecretsDirectoryKey = "STUDIOCTL_APP_SECRETS_DIR";

    /// <summary>
    /// The object the provisioned file wraps its credentials in.
    /// </summary>
    private const string SectionName = "MaskinportenSettings";

    private readonly PhysicalFileProvider _fileProvider;
    private readonly IConfigurationRoot _root;

    /// <summary>
    /// The provisioned credentials, as a configuration section to bind options against.
    /// </summary>
    public IConfiguration Section { get; }

    /// <summary>
    /// The absolute path this source reads the credentials from.
    /// </summary>
    public string FilePath { get; }

    /// <summary>
    /// Whether the file is provisioned by studioctl for a local run rather than by the platform's operator.
    /// Decides what a developer is told when the file is missing, nothing else.
    /// </summary>
    public bool ProvisionedByStudioctl { get; }

    internal MaskinportenSettingsSource(string filePath, bool provisionedByStudioctl = false)
    {
        string absolutePath = Path.GetFullPath(filePath);
        FilePath = absolutePath;
        ProvisionedByStudioctl = provisionedByStudioctl;
        string providerRoot = GetExistingProviderRoot(Path.GetDirectoryName(absolutePath) ?? string.Empty);

        _fileProvider = new PhysicalFileProvider(providerRoot)
        {
            // This path is normally a Kubernetes Secret/projected volume. Kubernetes updates it by swapping
            // the ..data symlink target, so polling is required to detect credential changes reliably.
            UsePollingFileWatcher = true,
            UseActivePolling = true,
        };

        _root = new ConfigurationBuilder()
            .AddJsonFile(
                provider: _fileProvider,
                path: Path.GetRelativePath(providerRoot, absolutePath),
                optional: true,
                reloadOnChange: true
            )
            .Build();

        Section = _root.GetSection(SectionName);
    }

    /// <summary>
    /// <para>The source for the platform the app runs on. In a cluster the file is at the fixed mount. On the
    /// localtest platform, and only there, studioctl may name the directory it provisions into
    /// through <see cref="StudioctlSecretsDirectoryKey"/>.</para>
    /// <para>The key is read from the app's configuration because that is the one channel that reaches an app
    /// however it was started — an environment variable from <c>studioctl app run</c>, or the
    /// <c>studioctl app env</c> callback for <c>dotnet run</c>. It is the only thing read from there, and it is
    /// ignored everywhere but localtest: the same gate every other local-only behavior in the app libraries
    /// sits behind (<c>AuthenticationTokenResolver</c>, <c>MaskinportenWellKnownRefreshService</c>), and one an
    /// app cannot pass without breaking its own platform calls.</para>
    /// </summary>
    internal static MaskinportenSettingsSource ForPlatform(
        RuntimeEnvironment runtimeEnvironment,
        IConfiguration configuration
    )
    {
        string? studioctlSecretsDirectory = runtimeEnvironment.IsLocaltestPlatform()
            ? configuration[StudioctlSecretsDirectoryKey]
            : null;

        return string.IsNullOrWhiteSpace(studioctlSecretsDirectory)
            ? new MaskinportenSettingsSource(DefaultFilePath)
            : new MaskinportenSettingsSource(
                Path.Join(studioctlSecretsDirectory, FileName),
                provisionedByStudioctl: true
            );
    }

    /// <summary>
    /// The nearest existing ancestor of <paramref name="path"/>. A <see cref="PhysicalFileProvider"/> must be
    /// rooted at a directory that exists, while the secrets directory is mounted by the platform and may well
    /// appear after the app has started.
    /// </summary>
    internal static string GetExistingProviderRoot(string path)
    {
        string? currentPath = path;
        while (!string.IsNullOrWhiteSpace(currentPath) && !Directory.Exists(currentPath))
        {
            currentPath = Path.GetDirectoryName(currentPath);
        }

        return currentPath ?? Path.GetPathRoot(path) ?? Directory.GetCurrentDirectory();
    }

    public void Dispose()
    {
        (_root as IDisposable)?.Dispose();
        _fileProvider.Dispose();
    }
}

/// <summary>
/// Binds <see cref="MaskinportenSettings"/> to the provisioned credentials, and reloads them when the platform
/// rotates the key.
/// </summary>
internal sealed class ConfigureMaskinportenSettings(MaskinportenSettingsSource source)
    : IConfigureOptions<MaskinportenSettings>,
        IOptionsChangeTokenSource<MaskinportenSettings>
{
    public string Name => Microsoft.Extensions.Options.Options.DefaultName;

    public void Configure(MaskinportenSettings options) => source.Section.Bind(options);

    public IChangeToken GetChangeToken() => source.Section.GetReloadToken();
}

/// <summary>
/// Says where the credentials were expected, and how to supply them, when nothing at all was read. The data
/// annotations on <see cref="MaskinportenSettings"/> report a missing field by name, and the options factory
/// aggregates every validator's failures, so for the empty file - the case a developer meets first - this adds
/// the fix to those field names.
/// </summary>
internal sealed class ValidateMaskinportenSettingsProvisioned(MaskinportenSettingsSource source)
    : IValidateOptions<MaskinportenSettings>
{
    public ValidateOptionsResult Validate(string? name, MaskinportenSettings options)
    {
        if (!string.IsNullOrWhiteSpace(options.Authority) || !string.IsNullOrWhiteSpace(options.ClientId))
        {
            return ValidateOptionsResult.Skip;
        }

        return ValidateOptionsResult.Fail(MissingCredentialsMessage(source));
    }

    /// <summary>
    /// The local-run message names the command and not the file: where studioctl keeps the client is
    /// studioctl's business, and naming the file would only invite editing it by hand. The platform message
    /// does name the mount, because that is what an operator debugging a deployment needs.
    /// </summary>
    internal static string MissingCredentialsMessage(MaskinportenSettingsSource source) =>
        source.ProvisionedByStudioctl
            ? "No Maskinporten client is stored for this local run. Store one with "
                + "'studioctl app maskinporten set'; a running app picks it up without a restart."
            : $"No Maskinporten credentials were read from '{source.FilePath}', where the platform provisions "
                + "them. Studio provisions the app's client when the app is deployed. For a local run, start the "
                + "app through studioctl and store a client with 'studioctl app maskinporten set'.";
}
