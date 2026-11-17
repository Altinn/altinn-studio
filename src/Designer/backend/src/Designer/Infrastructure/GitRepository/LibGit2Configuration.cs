using System;
using System.IO;
using System.Threading;
using LibGit2Sharp;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository;

/// <summary>
/// Process-wide configuration of libgit2, which every repository that Designer opens through LibGit2Sharp reads.
/// </summary>
public static class LibGit2Configuration
{
    /// <summary>
    /// Folder in the application directory that holds the system-level git configuration file, <c>gitconfig</c>.
    /// </summary>
    public const string SystemConfigurationFolder = "GitConfiguration";

    private static readonly Lock s_searchPathLock = new();
    private static bool s_searchPathSet;

    /// <summary>
    /// Makes libgit2 read Designer's system-level git configuration instead of /etc/gitconfig, and verifies that it
    /// disables symbolic links. A checkout then writes a link committed to a repository as a plain file holding the
    /// link target.
    /// Call it at startup, before anything uses libgit2: libgit2 does not support changing its search paths while
    /// another thread reads them, so only the first call changes them and later calls only verify.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Symbolic links are still enabled, for example because the configuration file is missing or a global git
    /// configuration enables them.
    /// </exception>
    public static void DisableSymbolicLinks()
    {
        lock (s_searchPathLock)
        {
            if (!s_searchPathSet)
            {
                GlobalSettings.SetConfigSearchPaths(
                    ConfigurationLevel.System,
                    Path.Combine(AppContext.BaseDirectory, SystemConfigurationFolder)
                );
                s_searchPathSet = true;
            }
        }

        using LibGit2Sharp.Configuration configuration = LibGit2Sharp.Configuration.BuildFrom(null);
        AssertSymbolicLinksDisabled(configuration);
    }

    internal static void AssertSymbolicLinksDisabled(LibGit2Sharp.Configuration configuration)
    {
        if (configuration.Get<bool>("core.symlinks") is not { Value: false })
        {
            throw new InvalidOperationException(
                "The git configuration must set core.symlinks to false, so that checkouts never create symbolic links."
            );
        }
    }
}
