#nullable disable

using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using Newtonsoft.Json;

namespace LocalTest.Services.Storage.Implementation;

/// <summary>
/// Stores localtest-only instance/process versions outside the serialized instance document.
/// </summary>
internal static class InstanceVersionMetadataStore
{
    private const string VersionFolderName = ".instanceversions";
    private const string VersionFileName = "versions.json";
    private const int InitialVersion = 1;

    private static readonly PartitionedAsyncLock _versionLocks = new PartitionedAsyncLock();

    public static async Task<InstanceVersionResult> Initialize(
        LocalPlatformSettings settings,
        Guid instanceGuid,
        CancellationToken cancellationToken = default
    )
    {
        using IDisposable versionLock = await _versionLocks.Lock(instanceGuid.ToString());
        InstanceVersionResult versions = new(InitialVersion, InitialVersion);
        await WriteUnlocked(settings, instanceGuid, versions, cancellationToken);
        return versions;
    }

    public static async Task<InstanceVersionResult> Read(
        LocalPlatformSettings settings,
        Guid instanceGuid,
        CancellationToken cancellationToken = default
    )
    {
        using IDisposable versionLock = await _versionLocks.Lock(instanceGuid.ToString());
        return await ReadUnlocked(settings, instanceGuid, cancellationToken);
    }

    public static async Task<InstanceVersionResult> Check(
        LocalPlatformSettings settings,
        Guid instanceGuid,
        int? expectedInstanceVersion,
        int? expectedProcessStateVersion,
        CancellationToken cancellationToken = default
    )
    {
        using IDisposable versionLock = await _versionLocks.Lock(instanceGuid.ToString());
        InstanceVersionResult current = await ReadUnlocked(
            settings,
            instanceGuid,
            cancellationToken
        );
        EnsureExpectedVersions(current, expectedInstanceVersion, expectedProcessStateVersion);
        return current;
    }

    public static async Task<InstanceVersionResult> Mutate(
        LocalPlatformSettings settings,
        Guid instanceGuid,
        int? expectedInstanceVersion,
        int? expectedProcessStateVersion,
        bool bumpInstanceVersion,
        bool bumpProcessStateVersion,
        Func<Task> mutation,
        CancellationToken cancellationToken = default
    )
    {
        using IDisposable versionLock = await _versionLocks.Lock(instanceGuid.ToString());
        InstanceVersionResult current = await ReadUnlocked(
            settings,
            instanceGuid,
            cancellationToken
        );
        EnsureExpectedVersions(current, expectedInstanceVersion, expectedProcessStateVersion);

        await mutation();

        InstanceVersionResult updated = new(
            current.InstanceVersion + (bumpInstanceVersion ? 1 : 0),
            current.ProcessStateVersion + (bumpProcessStateVersion ? 1 : 0)
        );
        await WriteUnlocked(settings, instanceGuid, updated, cancellationToken);
        return updated;
    }

    private static void EnsureExpectedVersions(
        InstanceVersionResult current,
        int? expectedInstanceVersion,
        int? expectedProcessStateVersion
    )
    {
        if (
            expectedInstanceVersion is not null
            && expectedInstanceVersion.Value != current.InstanceVersion
        )
        {
            throw new InstanceVersionMismatchException(
                current.InstanceVersion,
                current.ProcessStateVersion
            );
        }

        if (
            expectedProcessStateVersion is not null
            && expectedProcessStateVersion.Value != current.ProcessStateVersion
        )
        {
            throw new ProcessStateVersionMismatchException(
                current.InstanceVersion,
                current.ProcessStateVersion
            );
        }
    }

    private static async Task<InstanceVersionResult> ReadUnlocked(
        LocalPlatformSettings settings,
        Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        string path = GetVersionPath(settings, instanceGuid);
        if (!File.Exists(path))
        {
            return new InstanceVersionResult(InitialVersion, InitialVersion);
        }

        string content = await File.ReadAllTextAsync(path, cancellationToken);
        InstanceVersionMetadata metadata = JsonConvert.DeserializeObject<InstanceVersionMetadata>(content)
            ?? new InstanceVersionMetadata();

        return new InstanceVersionResult(
            metadata.InstanceVersion > 0 ? metadata.InstanceVersion : InitialVersion,
            metadata.ProcessStateVersion > 0 ? metadata.ProcessStateVersion : InitialVersion
        );
    }

    private static async Task WriteUnlocked(
        LocalPlatformSettings settings,
        Guid instanceGuid,
        InstanceVersionResult versions,
        CancellationToken cancellationToken
    )
    {
        string path = GetVersionPath(settings, instanceGuid);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllTextAsync(
            path,
            JsonConvert.SerializeObject(
                new InstanceVersionMetadata
                {
                    InstanceVersion = versions.InstanceVersion,
                    ProcessStateVersion = versions.ProcessStateVersion,
                }
            ),
            cancellationToken
        );
    }

    private static string GetVersionPath(LocalPlatformSettings settings, Guid instanceGuid)
    {
        string dataForInstanceFolder = Path.Combine(
            GetDataCollectionFolder(settings) + instanceGuid.ToString().Replace("/", "_") + "/"
        );
        return Path.Combine(dataForInstanceFolder, VersionFolderName, VersionFileName);
    }

    private static string GetDataCollectionFolder(LocalPlatformSettings settings)
    {
        return settings.LocalTestingStorageBasePath
            + settings.DocumentDbFolder
            + settings.DataCollectionFolder;
    }

    private sealed class InstanceVersionMetadata
    {
        public int InstanceVersion { get; set; } = InitialVersion;

        public int ProcessStateVersion { get; set; } = InitialVersion;
    }
}
