using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Maskinporten.Models;
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
/// secrets mount. On the localtest platform the launcher of the run — studioctl — provisions the file the
/// way the operator does in a cluster, and names the directory it provisions into through
/// <see cref="LauncherSecretsDirectoryKey"/>; see <see cref="Create"/>.</para>
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
    /// Where the platform provisions the app's credentials in a cluster. Deliberately not reachable from the
    /// app's configuration: an app able to move this could point the client at an identity of its own, which
    /// is the whole thing this type exists to prevent. It stays internal rather than becoming a constant so
    /// the library can source the file elsewhere should the need ever arise, and so tests can supply one.
    /// </summary>
    internal static string DefaultFilePath { get; } = Path.Join(AppSettings.DefaultRuntimeSecretsDirectory, FileName);

    /// <summary>
    /// <para>The configuration key through which the launcher of a local run names the directory it provisions
    /// the app's secrets into. studioctl sets it as an environment variable for <c>studioctl app run</c> and
    /// includes it in <c>studioctl app env</c>, which is how an app started with <c>dotnet run</c> learns it.</para>
    /// <para>Honored on the localtest platform only, and deliberately not shaped like a configuration section
    /// an app would think to write: the directory belongs to the launcher, the way the secrets mount belongs to
    /// the operator.</para>
    /// </summary>
    internal const string LauncherSecretsDirectoryKey = "STUDIOCTL_APP_SECRETS_DIR";

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
    /// Whether the file is provisioned by the launcher of a local run rather than by the platform's operator.
    /// Decides what a developer is told when the file is missing, nothing else.
    /// </summary>
    public bool ProvisionedByLauncher { get; }

    internal MaskinportenSettingsSource(string filePath, bool provisionedByLauncher = false)
    {
        string absolutePath = Path.GetFullPath(filePath);
        FilePath = absolutePath;
        ProvisionedByLauncher = provisionedByLauncher;
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
    /// The source for the platform the app runs on: the launcher's directory when one was named, the cluster's
    /// fixed mount otherwise. The caller decides whether a launcher may name one at all — only on localtest.
    /// </summary>
    /// <param name="launcherSecretsDirectory">
    /// The value of <see cref="LauncherSecretsDirectoryKey"/>, or <c>null</c> where none was supplied or where
    /// the platform does not honor it.
    /// </param>
    internal static MaskinportenSettingsSource Create(string? launcherSecretsDirectory) =>
        string.IsNullOrWhiteSpace(launcherSecretsDirectory)
            ? new MaskinportenSettingsSource(DefaultFilePath)
            : new MaskinportenSettingsSource(
                Path.Join(launcherSecretsDirectory, FileName),
                provisionedByLauncher: true
            );

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
/// annotations on <see cref="MaskinportenSettings"/> already report a partial file field by field; this covers
/// the empty file, which is the case a developer meets first, with the fix rather than a field name.
/// </summary>
internal sealed class ValidateMaskinportenSettingsPresent(MaskinportenSettingsSource source)
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

    internal static string MissingCredentialsMessage(MaskinportenSettingsSource source) =>
        source.ProvisionedByLauncher
            ? $"No Maskinporten client is stored for this local run: nothing was read from '{source.FilePath}'. "
                + "Store one with 'studioctl app maskinporten set'; a running app picks it up without a restart."
            : $"No Maskinporten credentials were read from '{source.FilePath}', where the platform provisions "
                + "them. Studio provisions the app's client when the app is deployed. For a local run, start the "
                + "app through studioctl and store a client with 'studioctl app maskinporten set'.";
}
