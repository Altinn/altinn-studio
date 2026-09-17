using Altinn.App.Core.Internal.App;
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
/// <para>Where the secrets are and what each file is called is the platform's to say, and the libraries
/// hardcode neither. Whoever writes the files names the directory in <see cref="DirectoryKey"/> and each file
/// in its own <see cref="ProvisionedSecretFile.FileNameKey"/>: the operator for a deployed app, studioctl for
/// a local run. Both are required in every environment and there is no fallback, deliberately — a location the
/// libraries had guessed would read nothing at all the day the writer moved it, and say nothing about why. The
/// one contract the libraries do hold is the content: the section a file wraps its contents in.</para>
/// <para><see cref="FromConfiguration"/> is where all of that is read, once: it resolves the directory and
/// every descriptor in <see cref="ProvisionedSecretFiles.All"/>, and <see cref="Files"/> holds the resolved
/// copies. Consumers hold the static descriptors and ask this channel — nothing else is given the app's
/// configuration to read these variables out of.</para>
/// <para>The file provider polls, because in a cluster this directory is a Kubernetes projected volume:
/// operator-driven rotation therefore reaches <see cref="IOptionsMonitor{TOptions}"/> consumers without a
/// restart.</para>
/// <para>This is a DI singleton holding the built root open, and the container disposes it.</para>
/// </summary>
internal sealed class ProvisionedSecrets : IDisposable
{
    /// <summary>
    /// The configuration key naming the directory the platform provisions the app's secrets into.
    /// </summary>
    internal const string DirectoryKey = "RUNTIME_APP_SECRETS_DIR";

    /// <summary>
    /// How a value that is not set is supplied, in the two kinds of environment an app runs in. Part of every
    /// failure message, because the fix is different in each and neither is the app's own configuration. A
    /// file resolves its own name (see <see cref="ProvisionedSecretFile.Resolve"/>) and says the same thing
    /// when it cannot, so this is shared rather than written twice.
    /// </summary>
    internal const string WhereTheValueComesFrom =
        "The platform sets it for a deployed app. A local run gets it from studioctl, so start the app with "
        + "'studioctl app run', or have studioctl on PATH so 'dotnet run' can import the same environment.";

    private readonly PhysicalFileProvider _fileProvider;
    private readonly IConfigurationRoot _root;

    /// <summary>
    /// The absolute path of the directory the secrets are read from.
    /// </summary>
    public string Directory { get; }

    /// <summary>
    /// Every hosted file, resolved: each one carries the name the platform gave it.
    /// </summary>
    public IReadOnlyList<ProvisionedSecretFile> Files { get; }

    /// <summary>
    /// The channel over <paramref name="directory"/>, for the resolved <paramref name="files"/>. Private
    /// because resolution belongs to <see cref="FromConfiguration"/>, which is the only caller.
    /// </summary>
    /// <param name="directory">The directory the platform provisions the app's secrets into.</param>
    /// <param name="files">Every hosted file, each carrying the name the platform gave it.</param>
    private ProvisionedSecrets(string directory, IReadOnlyList<ProvisionedSecretFile> files)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(directory);
        ArgumentNullException.ThrowIfNull(files);

        foreach (ProvisionedSecretFile file in files)
        {
            if (!file.IsResolved)
            {
                throw new ArgumentException(
                    $"'{file.FileNameKey}' carries no resolved file name. The channel holds resolved files "
                        + $"only; build it through {nameof(FromConfiguration)}.",
                    nameof(files)
                );
            }
        }

        Directory = Path.GetFullPath(directory);
        Files = files;
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
            // optional: true is a provider-level setting and nothing more. Every tenant validates its file at
            // startup, so a missing one is reported there, with a message that says what to do about it -
            // rather than as the JSON provider's bare FileNotFoundException while the container is still
            // building this root. Carrying a rotated file to consumers without a restart is the polling
            // provider's doing, together with reloadOnChange.
            builder.AddJsonFile(
                provider: _fileProvider,
                path: Path.GetRelativePath(providerRoot, Path.Join(Directory, file.FileName)),
                optional: true,
                reloadOnChange: true
            );
        }

        _root = builder.Build();
    }

    /// <summary>
    /// The contents of <paramref name="file"/>, as a configuration section to bind options against.
    /// </summary>
    /// <param name="file">One of the files this channel was built for, resolved or not.</param>
    public IConfiguration Section(ProvisionedSecretFile file) => _root.GetSection(file.SectionName);

    /// <summary>
    /// Where <paramref name="file"/> is provisioned, as an absolute path: the channel's directory and the name
    /// this channel resolved for that file. Callers pass the static descriptor and never hold the name.
    /// </summary>
    /// <param name="file">One of the files this channel was built for.</param>
    /// <exception cref="ArgumentException"><paramref name="file"/> is not one of them.</exception>
    public string PathOf(ProvisionedSecretFile file)
    {
        ArgumentNullException.ThrowIfNull(file);

        foreach (ProvisionedSecretFile resolved in Files)
        {
            if (string.Equals(resolved.FileNameKey, file.FileNameKey, StringComparison.Ordinal))
            {
                return Path.Join(Directory, resolved.FileName);
            }
        }

        throw new ArgumentException(
            $"'{file.FileNameKey}' is not one of the files this channel hosts. Every hosted file is declared "
                + $"in {nameof(ProvisionedSecretFiles)}.",
            nameof(file)
        );
    }

    /// <summary>
    /// <para>The channel as the platform describes it: the directory named by <see cref="DirectoryKey"/>, and
    /// every hosted file resolved against its own <see cref="ProvisionedSecretFile.FileNameKey"/>. These are
    /// read from the app's configuration because that is where both ways of delivering them land — the process
    /// environment of a deployed app or of <c>studioctl app run</c>, and the environment
    /// <c>StudioctlLocalConfiguration</c> imports for a <c>dotnet run</c> (see
    /// <see cref="StudioctlAppEnvironment"/>) — and they are the only things this type reads from there.</para>
    /// <para>A value that is missing, or a file name that is not a bare file name, fails startup. There is no
    /// location to fall back to that would not be a guess.</para>
    /// </summary>
    /// <param name="configuration">The app's own configuration.</param>
    /// <exception cref="ApplicationConfigException">A required value is missing or is not a bare file name.</exception>
    internal static ProvisionedSecrets FromConfiguration(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        string directory = RequireDirectory(configuration);
        ProvisionedSecretFile[] files = [.. ProvisionedSecretFiles.All.Select(file => file.Resolve(configuration))];

        return new ProvisionedSecrets(directory, files);
    }

    /// <summary>
    /// The message for a value nobody set. Shared with <see cref="ProvisionedSecretFile"/>, which resolves the
    /// file names and reports a missing one the same way.
    /// </summary>
    /// <param name="key">The configuration key that was not set.</param>
    internal static string MissingValueMessage(string key) =>
        $"'{key}' is not set, and the app libraries need it to read the secrets the platform provisions. "
        + WhereTheValueComesFrom;

    /// <summary>
    /// The directory the secrets are read from, which every environment is required to name.
    /// </summary>
    /// <param name="configuration">The app's own configuration.</param>
    /// <exception cref="ApplicationConfigException">The value is missing or blank.</exception>
    private static string RequireDirectory(IConfiguration configuration)
    {
        string? directory = configuration[DirectoryKey];
        if (string.IsNullOrWhiteSpace(directory))
        {
            throw new ApplicationConfigException(MissingValueMessage(DirectoryKey));
        }

        return directory;
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
