using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.ProvisionedSecrets;

/// <summary>
/// <para>The secrets the platform provisions for the app libraries, read from the directory it provisions them
/// into through a configuration root of their own.</para>
/// <para>That root is never added to the app's own configuration root, and the app's is never added to this
/// one. Nothing an app supplies — a configuration section, an environment variable, a
/// <c>Configure&lt;T&gt;</c> call — can reach a provisioned secret, so what the platform provisioned is what
/// the app gets, and an app cannot renegotiate it.</para>
/// <para>Where the secrets are provisioned is the platform's to say, never the app's. In a cluster that is the
/// fixed <see cref="ClusterDirectory"/> mount. On the localtest platform studioctl provisions the same
/// directory the way the operator does in a cluster, and names the one it provisions into through
/// <see cref="StudioctlAppEnvironment.AppSecretsDirectoryKey"/>; see <see cref="ForPlatform"/>.</para>
/// <para>The file provider polls, because in a cluster this directory is a Kubernetes projected volume:
/// operator-driven rotation therefore reaches <see cref="IOptionsMonitor{TOptions}"/> consumers without a
/// restart. The same polling is what lets a developer store a secret for a local run that is already up.</para>
/// <para>This is a DI singleton holding the built root open, and the container disposes it.</para>
/// </summary>
internal sealed class ProvisionedSecrets : IDisposable
{
    /// <summary>
    /// Where the platform provisions the app's secrets in a cluster. Deliberately not reachable from the app's
    /// configuration: an app able to move this could point the libraries at secrets of its own, which is the
    /// whole thing this type exists to prevent.
    /// </summary>
    internal const string ClusterDirectory = "/mnt/app-secrets";

    private readonly PhysicalFileProvider _fileProvider;
    private readonly IConfigurationRoot _root;

    /// <summary>
    /// The absolute path of the directory the secrets are read from.
    /// </summary>
    public string Directory { get; }

    /// <summary>
    /// Whether the directory is provisioned by studioctl for a local run rather than by the platform's
    /// operator. Decides what a developer is told when a file is missing, nothing else.
    /// </summary>
    public bool ProvisionedByStudioctl { get; }

    internal ProvisionedSecrets(
        string directory,
        IReadOnlyCollection<ProvisionedSecretFile> files,
        bool provisionedByStudioctl = false
    )
    {
        Directory = Path.GetFullPath(directory);
        ProvisionedByStudioctl = provisionedByStudioctl;
        string providerRoot = GetExistingProviderRoot(Directory);

        _fileProvider = new PhysicalFileProvider(providerRoot)
        {
            // This path is normally a Kubernetes Secret/projected volume. Kubernetes updates it by swapping
            // the ..data symlink target, so polling is required to detect changes reliably.
            UsePollingFileWatcher = true,
            UseActivePolling = true,
        };

        var builder = new ConfigurationBuilder();
        foreach (ProvisionedSecretFile file in files)
        {
            // Every file is optional: one the operator writes after the app started - a Maskinporten client
            // provisioned later, say - appears without a restart, because the provider is polling.
            builder.AddJsonFile(
                provider: _fileProvider,
                path: Path.GetRelativePath(providerRoot, PathOf(file)),
                optional: true,
                reloadOnChange: true
            );
        }

        _root = builder.Build();
    }

    /// <summary>
    /// The contents of <paramref name="file"/>, as a configuration section to bind options against.
    /// </summary>
    /// <param name="file">One of the files this channel was built for.</param>
    public IConfiguration Section(ProvisionedSecretFile file) => _root.GetSection(file.SectionName);

    /// <summary>
    /// Where <paramref name="file"/> is provisioned, as an absolute path.
    /// </summary>
    /// <param name="file">One of the files this channel was built for.</param>
    public string PathOf(ProvisionedSecretFile file) => Path.Join(Directory, file.FileName);

    /// <summary>
    /// <para>The channel for the platform the app runs on. In a cluster the secrets are at the fixed mount. On
    /// the localtest platform they are in the directory studioctl names through
    /// <see cref="StudioctlAppEnvironment.AppSecretsDirectoryKey"/>: every local run is configured by
    /// studioctl, whether <c>studioctl app run</c> started the app or <c>StudioctlLocalConfiguration</c>
    /// imported the environment for a <c>dotnet run</c>, and both carry the directory. The key is read from the
    /// app's configuration because that is where both deliver it (see <see cref="StudioctlAppEnvironment"/>),
    /// and it is the only thing this type reads from there.</para>
    /// <para>The key is honored on localtest only: the same gate every other local-only behavior in the app
    /// libraries sits behind (<c>AuthenticationTokenResolver</c>, <c>MaskinportenWellKnownRefreshService</c>),
    /// and one an app cannot pass without breaking its own platform calls. A localtest run with no directory
    /// named was started outside studioctl altogether - not installed, or its environment not imported - and
    /// gets the cluster path, so that a missing-secret failure can send the developer to studioctl.</para>
    /// </summary>
    /// <param name="runtimeEnvironment">The platform the app is running on.</param>
    /// <param name="configuration">The app's own configuration, read for studioctl's key alone.</param>
    internal static ProvisionedSecrets ForPlatform(RuntimeEnvironment runtimeEnvironment, IConfiguration configuration)
    {
        string? studioctlSecretsDirectory = runtimeEnvironment.IsLocaltestPlatform()
            ? configuration[StudioctlAppEnvironment.AppSecretsDirectoryKey]
            : null;

        return string.IsNullOrWhiteSpace(studioctlSecretsDirectory)
            ? new ProvisionedSecrets(ClusterDirectory, ProvisionedSecretFiles.All)
            : new ProvisionedSecrets(
                studioctlSecretsDirectory,
                ProvisionedSecretFiles.All,
                provisionedByStudioctl: true
            );
    }

    /// <summary>
    /// The nearest existing ancestor of <paramref name="path"/>. A <see cref="PhysicalFileProvider"/> must be
    /// rooted at a directory that exists, while the secrets directory is mounted by the platform and may well
    /// appear after the app has started.
    /// </summary>
    /// <param name="path">The directory the secrets are read from.</param>
    internal static string GetExistingProviderRoot(string path)
    {
        string? currentPath = path;
        while (!string.IsNullOrWhiteSpace(currentPath) && !System.IO.Directory.Exists(currentPath))
        {
            currentPath = Path.GetDirectoryName(currentPath);
        }

        return currentPath ?? Path.GetPathRoot(path) ?? System.IO.Directory.GetCurrentDirectory();
    }

    public void Dispose()
    {
        (_root as IDisposable)?.Dispose();
        _fileProvider.Dispose();
    }
}
