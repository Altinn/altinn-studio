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
    /// failure message, because the fix is different in each and neither is the app's own configuration.
    /// </summary>
    private const string WhereTheValueComesFrom =
        "The platform sets it for a deployed app. A local run gets it from studioctl, so start the app with "
        + "'studioctl app run', or have studioctl on PATH so 'dotnet run' can import the same environment.";

    private static readonly char[] _directorySeparators = ['/', '\\'];

    private readonly PhysicalFileProvider _fileProvider;
    private readonly IConfigurationRoot _root;
    private readonly IReadOnlyDictionary<ProvisionedSecretFile, string> _fileNames;

    /// <summary>
    /// The absolute path of the directory the secrets are read from.
    /// </summary>
    public string Directory { get; }

    /// <summary>
    /// The channel over <paramref name="directory"/>, for the files named in <paramref name="fileNames"/>.
    /// </summary>
    /// <param name="directory">The directory the platform provisions the app's secrets into.</param>
    /// <param name="fileNames">The name the platform gave each hosted file.</param>
    internal ProvisionedSecrets(string directory, IReadOnlyDictionary<ProvisionedSecretFile, string> fileNames)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(directory);
        ArgumentNullException.ThrowIfNull(fileNames);

        Directory = Path.GetFullPath(directory);
        _fileNames = fileNames;
        string providerRoot = GetExistingProviderRoot(Directory);

        _fileProvider = new PhysicalFileProvider(providerRoot)
        {
            // This path is normally a Kubernetes Secret/projected volume. Kubernetes updates it by swapping
            // the ..data symlink target, so polling is required to detect changes reliably.
            UsePollingFileWatcher = true,
            UseActivePolling = true,
        };

        var builder = new ConfigurationBuilder();
        foreach (ProvisionedSecretFile file in fileNames.Keys)
        {
            // Every file is optional: one the platform writes after the app started appears without a
            // restart, because the provider is polling.
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
    public string PathOf(ProvisionedSecretFile file) => Path.Join(Directory, _fileNames[file]);

    /// <summary>
    /// <para>The channel as the platform describes it: the directory named by <see cref="DirectoryKey"/>, and
    /// every hosted file under the name its own <see cref="ProvisionedSecretFile.FileNameKey"/> gives it.
    /// These are read from the app's configuration because that is where both ways of delivering them land —
    /// the process environment of a deployed app or of <c>studioctl app run</c>, and the environment
    /// <c>StudioctlLocalConfiguration</c> imports for a <c>dotnet run</c> (see
    /// <see cref="StudioctlAppEnvironment"/>) — and they are the only things this type reads from there.</para>
    /// <para>A value that is missing, or that is not a bare file name, fails startup. There is no location to
    /// fall back to that would not be a guess.</para>
    /// </summary>
    /// <param name="configuration">The app's own configuration.</param>
    /// <exception cref="ApplicationConfigException">A required value is missing or is not a bare file name.</exception>
    internal static ProvisionedSecrets FromConfiguration(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        string directory = RequireValue(configuration, DirectoryKey);

        Dictionary<ProvisionedSecretFile, string> fileNames = [];
        foreach (ProvisionedSecretFile file in ProvisionedSecretFiles.All)
        {
            fileNames[file] = RequireFileName(configuration, file);
        }

        return new ProvisionedSecrets(directory, fileNames);
    }

    /// <summary>
    /// The name <paramref name="file"/> is provisioned under. It has to be a bare name inside the secrets
    /// directory: a path would let whoever set it read a file somewhere else entirely, which is the same hole
    /// as letting the app choose.
    /// </summary>
    /// <param name="configuration">The app's own configuration.</param>
    /// <param name="file">One of the hosted files.</param>
    /// <exception cref="ApplicationConfigException">The value is missing or is not a bare file name.</exception>
    internal static string RequireFileName(IConfiguration configuration, ProvisionedSecretFile file)
    {
        string fileName = RequireValue(configuration, file.FileNameKey);
        if (fileName.IndexOfAny(_directorySeparators) >= 0 || fileName is "." or "..")
        {
            throw new ApplicationConfigException(
                $"'{file.FileNameKey}' must name a file inside the directory named by '{DirectoryKey}', but it "
                    + $"is set to '{fileName}'. {WhereTheValueComesFrom}"
            );
        }

        return fileName;
    }

    /// <summary>
    /// The value of <paramref name="key"/>, which every environment is required to set.
    /// </summary>
    /// <param name="configuration">The app's own configuration.</param>
    /// <param name="key">The configuration key to read.</param>
    /// <exception cref="ApplicationConfigException">The value is missing or blank.</exception>
    private static string RequireValue(IConfiguration configuration, string key)
    {
        string? value = configuration[key];
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ApplicationConfigException(
                $"'{key}' is not set, and the app libraries need it to read the secrets the platform "
                    + $"provisions. {WhereTheValueComesFrom}"
            );
        }

        return value;
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
