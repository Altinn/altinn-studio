using System.Globalization;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.Authorization.Implementation;

/// <summary>
/// Writes each authorization decision to its own file in <see cref="LocalPlatformSettings.AuthorizationAuditFolder"/>,
/// where developers browse them newest first in the Storage Explorer, and keeps only the newest
/// <see cref="LocalPlatformSettings.AuthorizationAuditMaxFiles"/> of them.
/// </summary>
public sealed class AuthorizationAuditLog(
    IOptions<LocalPlatformSettings> localPlatformSettings,
    TimeProvider timeProvider,
    ILogger<AuthorizationAuditLog> logger
)
{
    private const string TimestampFormat = "yyyy'-'MM'-'dd'T'HH':'mm':'ss.fff";

    // Matches only the names Write gives entries, so pruning never deletes anything else in the folder.
    private const string EntrySearchPattern = "????-??-??T??:??:??.???_*.json";

    private readonly LocalPlatformSettings _settings = localPlatformSettings.Value;
    private long _entriesWritten;
    private int _pruning;

    /// <summary>
    /// The most recently started prune, for tests to wait for.
    /// </summary>
    internal Task PruneTask { get; private set; } = Task.CompletedTask;

    public async Task Write(IEnumerable<string> actions, byte[] entry)
    {
        var maxFiles = _settings.AuthorizationAuditMaxFiles;
        if (maxFiles <= 0)
        {
            return;
        }

        var folder = Path.Join(_settings.LocalTestingStorageBasePath, _settings.AuthorizationAuditFolder);
        Directory.CreateDirectory(folder);

        var timestamp = timeProvider.GetLocalNow().ToString(TimestampFormat, CultureInfo.InvariantCulture);
        await using (var file = CreateEntryFile(folder, $"{timestamp}_{string.Join("+", actions)}"))
        {
            await file.WriteAsync(entry);
        }

        SchedulePrune(folder, maxFiles);
    }

    // Decisions for the same actions can land in the same millisecond, such as the parallel reads while signing.
    // The later one gets a numbered suffix instead of failing to open, or overwriting, the earlier one's file.
    private static FileStream CreateEntryFile(string folder, string name)
    {
        for (var attempt = 1; ; attempt++)
        {
            var path = Path.Join(folder, attempt == 1 ? $"{name}.json" : $"{name}_{attempt}.json");
            try
            {
                return new FileStream(
                    path,
                    FileMode.CreateNew,
                    FileAccess.Write,
                    FileShare.Read,
                    bufferSize: 4096,
                    useAsync: true
                );
            }
            catch (IOException) when (File.Exists(path)) { }
        }
    }

    private void SchedulePrune(string folder, int maxFiles)
    {
        // The first decision after startup prunes what earlier runs left behind, and every tenth of the limit after
        // that, so the folder grows to about 10% over the limit between prunes.
        var pruneInterval = Math.Max(1, maxFiles / 10);
        if ((Interlocked.Increment(ref _entriesWritten) - 1) % pruneInterval != 0)
        {
            return;
        }

        // Deleting a large backlog on a mounted volume takes a while, so prunes run one at a time, off the request.
        if (Interlocked.CompareExchange(ref _pruning, 1, 0) != 0)
        {
            return;
        }

        PruneTask = Task.Run(() =>
        {
            try
            {
                Prune(folder, maxFiles);
            }
            catch (Exception e)
            {
                logger.LogError(e, "Failed to prune the authorization audit folder {Folder}", folder);
            }
            finally
            {
                Interlocked.Exchange(ref _pruning, 0);
            }
        });
    }

    internal static void Prune(string folder, int maxFiles)
    {
        var files = Directory.GetFiles(folder, EntrySearchPattern);
        if (files.Length <= maxFiles)
        {
            return;
        }

        // Entry names start with their timestamp, so they sort oldest first.
        Array.Sort(files, StringComparer.Ordinal);
        foreach (var file in files.AsSpan(0, files.Length - maxFiles))
        {
            File.Delete(file);
        }
    }
}
