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
/// <para>The file provider polls, because in a cluster this path is a Kubernetes projected volume: operator-driven
/// key rotation therefore reaches <see cref="IOptionsMonitor{TOptions}"/> consumers without a restart.</para>
/// <para>Despite the name, this is not an <see cref="IConfigurationSource"/>: it is not handed to a
/// <see cref="IConfigurationBuilder"/>, it is a DI singleton holding the built root open, and the container
/// disposes it. "Source" here means the place the settings come from.</para>
/// </summary>
internal sealed class MaskinportenSettingsSource : IDisposable
{
    /// <summary>
    /// Where the platform provisions the app's credentials. Deliberately not reachable from the app's
    /// configuration: an app able to move this could point the client at an identity of its own, which is
    /// the whole thing this type exists to prevent. It stays internal rather than becoming a constant so
    /// the library can source the file elsewhere should the need ever arise, and so tests can supply one.
    /// </summary>
    internal static string DefaultFilePath { get; } =
        Path.Join(AppSettings.DefaultRuntimeSecretsDirectory, "maskinporten-settings.json");

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

    internal MaskinportenSettingsSource(string filePath)
    {
        string absolutePath = Path.GetFullPath(filePath);
        FilePath = absolutePath;
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
