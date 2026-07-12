#nullable disable

using System.Text;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace LocalTest.Services.Storage.Implementation
{
    public class DataRepository : IDataRepository
    {
        private const int ReadAllMaxDegreeOfParallelism = 8;
        private static readonly PartitionedAsyncLock _dataElementLocks = new PartitionedAsyncLock();

        private readonly LocalPlatformSettings _localPlatformSettings;
        private Func<string, string, Task> _snapshotMetadataReadHook;
        private Action<string, string, bool> _mutationElementLockWaitStartedHook;

        internal Func<string, string, Task> SnapshotMetadataReadHook
        {
            get => Volatile.Read(ref _snapshotMetadataReadHook);
            set => Volatile.Write(ref _snapshotMetadataReadHook, value);
        }

        internal Action<string, string, bool> MutationElementLockWaitStartedHook
        {
            get => Volatile.Read(ref _mutationElementLockWaitStartedHook);
            set => Volatile.Write(ref _mutationElementLockWaitStartedHook, value);
        }

        public DataRepository(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        public async Task<DataElementWriteResult<DataElement>> Create(
            DataElement dataElement,
            long instanceInternalId = 0,
            CancellationToken cancellationToken = default,
            int? expectedInstanceVersion = null,
            int? expectedProcessStateVersion = null
        )
        {
            DataElement createdDataElement = null;
            Guid instanceGuid = Guid.Parse(dataElement.InstanceGuid);

            InstanceVersionResult versions = await InstanceVersionMetadataStore.Mutate(
                _localPlatformSettings,
                instanceGuid,
                expectedInstanceVersion,
                expectedProcessStateVersion,
                bumpInstanceVersion: true,
                bumpProcessStateVersion: false,
                async () =>
                {
                    createdDataElement = await CreateCore(dataElement);
                },
                cancellationToken
            );

            return new DataElementWriteResult<DataElement>(
                createdDataElement,
                versions.InstanceVersion,
                versions.ProcessStateVersion
            );
        }

        internal Task<DataElement> CreateWithoutVersionBump(
            DataElement dataElement,
            long instanceInternalId = 0,
            CancellationToken cancellationToken = default
        )
        {
            return CreateCore(dataElement);
        }

        public async Task<InstanceVersionResult> Delete(
            DataElement dataElement,
            CancellationToken cancellationToken = default,
            int? expectedInstanceVersion = null,
            int? expectedProcessStateVersion = null
        )
        {
            return await InstanceVersionMetadataStore.Mutate(
                _localPlatformSettings,
                Guid.Parse(dataElement.InstanceGuid),
                expectedInstanceVersion,
                expectedProcessStateVersion,
                bumpInstanceVersion: true,
                bumpProcessStateVersion: false,
                () => DeleteCore(dataElement),
                cancellationToken
            );
        }

        internal Task DeleteWithoutVersionBump(
            DataElement dataElement,
            CancellationToken cancellationToken = default
        )
        {
            return DeleteCore(dataElement);
        }

        public Task<bool> DeleteForInstance(
            string instanceId,
            CancellationToken cancellationToken = default
        )
        {
            string path = GetDataForInstanceFolder(instanceId);
            if (Directory.Exists(path))
            {
                Directory.Delete(path, true);
            }
            return Task.FromResult(true);
        }

        public async Task<DataElement> Read(
            Guid instanceGuid,
            Guid dataElementId,
            CancellationToken cancellationToken = default
        )
        {
            DataElementReadResult result = await ReadWithCurrentBlobVersion(
                instanceGuid,
                dataElementId,
                cancellationToken
            );
            return result.DataElement;
        }

        public Task<DataElementReadResult> ReadWithCurrentBlobVersion(
            Guid instanceGuid,
            Guid dataElementId,
            CancellationToken cancellationToken = default
        )
        {
            string instanceId = instanceGuid.ToString();
            string dataId = dataElementId.ToString();
            return ReadSnapshot(
                instanceId,
                dataId,
                GetDataPath(instanceId, dataId),
                stampContentEtag: true,
                cancellationToken
            );
        }

        public Task<List<DataElement>> ReadAll(
            Guid instanceGuid,
            CancellationToken cancellationToken = default
        )
        {
            return ReadAllCore(instanceGuid, stampContentEtags: true, cancellationToken);
        }

        private Task<List<DataElement>> ReadAllWithoutContentEtags(
            Guid instanceGuid,
            CancellationToken cancellationToken
        )
        {
            return ReadAllCore(instanceGuid, stampContentEtags: false, cancellationToken);
        }

        private async Task<List<DataElement>> ReadAllCore(
            Guid instanceGuid,
            bool stampContentEtags,
            CancellationToken cancellationToken
        )
        {
            cancellationToken.ThrowIfCancellationRequested();

            string instanceId = instanceGuid.ToString();
            string path = GetDataForInstanceFolder(instanceId);
            if (!Directory.Exists(path))
            {
                return [];
            }

            string[] files = Directory.GetFiles(path);
            var dataElements = new DataElement[files.Length];
            await Parallel.ForEachAsync(
                Enumerable.Range(0, files.Length),
                new ParallelOptions
                {
                    CancellationToken = cancellationToken,
                    MaxDegreeOfParallelism = ReadAllMaxDegreeOfParallelism,
                },
                async (index, operationCancellationToken) =>
                {
                    string filePath = files[index];
                    string dataId = Path.GetFileNameWithoutExtension(filePath);
                    DataElementReadResult result = await ReadSnapshot(
                        instanceId,
                        dataId,
                        filePath,
                        stampContentEtags,
                        operationCancellationToken
                    );
                    dataElements[index] = result.DataElement;
                }
            );

            return dataElements.OrderBy(x => x.Created).ToList();
        }

        public Task<DataElementWriteResult<DataElement>> Update(
            Guid instanceGuid,
            Guid dataElementId,
            Dictionary<string, object> propertylist,
            CancellationToken cancellationToken = default
        )
        {
            return Update(instanceGuid, dataElementId, propertylist, null, cancellationToken);
        }

        public async Task<DataElementWriteResult<DataElement>> Update(
            Guid instanceGuid,
            Guid dataElementId,
            Dictionary<string, object> propertylist,
            DataElementUpdateContext context,
            CancellationToken cancellationToken = default
        )
        {
            DataElement updatedDataElement = null;

            InstanceVersionResult versions = await InstanceVersionMetadataStore.Mutate(
                _localPlatformSettings,
                instanceGuid,
                context?.ExpectedInstanceVersion,
                context?.ExpectedProcessStateVersion,
                bumpInstanceVersion: true,
                bumpProcessStateVersion: false,
                async () =>
                {
                    updatedDataElement = await UpdateMetadata(
                        instanceGuid,
                        dataElementId,
                        propertylist,
                        context,
                        cancellationToken
                    );
                },
                cancellationToken
            );

            return new DataElementWriteResult<DataElement>(
                updatedDataElement,
                versions.InstanceVersion,
                versions.ProcessStateVersion
            );
        }

        internal Task<DataElement> UpdateWithoutVersionBump(
            Guid instanceGuid,
            Guid dataElementId,
            Dictionary<string, object> propertylist,
            DataElementUpdateContext context,
            CancellationToken cancellationToken = default
        )
        {
            return UpdateMetadata(
                instanceGuid,
                dataElementId,
                propertylist,
                context,
                cancellationToken
            );
        }

        public Task<DataElementWriteResult<DataElement>> UpdateReadStatus(
            Guid instanceGuid,
            Guid dataElementId,
            bool isRead,
            CancellationToken cancellationToken = default
        )
        {
            return UpdateNoBump(
                instanceGuid,
                dataElementId,
                new Dictionary<string, object>() { { "/isRead", isRead } },
                cancellationToken,
                isRead
                    ? null
                    : _ =>
                        UpdateInstanceReadStatusIfNoReadElementsRemain(
                            instanceGuid,
                            dataElementId,
                            cancellationToken
                        )
            );
        }

        public Task<DataElementWriteResult<DataElement>> UpdateLockStatus(
            Guid instanceGuid,
            Guid dataElementId,
            bool locked,
            CancellationToken cancellationToken = default
        )
        {
            return UpdateNoBump(
                instanceGuid,
                dataElementId,
                new Dictionary<string, object>() { { "/locked", locked } },
                cancellationToken
            );
        }

        public Task<DataElementWriteResult<DataElement>> UpdateFileScanStatus(
            Guid instanceGuid,
            Guid dataElementId,
            FileScanStatus fileScanStatus,
            CancellationToken cancellationToken = default
        )
        {
            return UpdateNoBump(
                instanceGuid,
                dataElementId,
                new Dictionary<string, object>()
                {
                    { "/fileScanResult", fileScanStatus.FileScanResult },
                },
                cancellationToken
            );
        }

        private async Task<DataElementWriteResult<DataElement>> UpdateNoBump(
            Guid instanceGuid,
            Guid dataElementId,
            Dictionary<string, object> propertylist,
            CancellationToken cancellationToken,
            Func<DataElement, Task> afterUpdate = null
        )
        {
            DataElement updatedDataElement = null;

            InstanceVersionResult versions = await InstanceVersionMetadataStore.Mutate(
                _localPlatformSettings,
                instanceGuid,
                expectedInstanceVersion: null,
                expectedProcessStateVersion: null,
                bumpInstanceVersion: false,
                bumpProcessStateVersion: false,
                async () =>
                {
                    updatedDataElement = await UpdateMetadata(
                        instanceGuid,
                        dataElementId,
                        propertylist,
                        null,
                        cancellationToken
                    );
                    if (afterUpdate is not null)
                    {
                        await afterUpdate(updatedDataElement);
                    }
                },
                cancellationToken
            );

            return new DataElementWriteResult<DataElement>(
                updatedDataElement,
                versions.InstanceVersion,
                versions.ProcessStateVersion
            );
        }

        private async Task<DataElement> CreateCore(DataElement dataElement)
        {
            string path = GetDataPath(dataElement.InstanceGuid, dataElement.Id);

            using IDisposable dataElementLock = await _dataElementLocks.Lock(
                GetDataElementLockKey(dataElement.InstanceGuid, dataElement.Id)
            );

            Directory.CreateDirectory(GetDataCollectionFolder());
            Directory.CreateDirectory(GetDataForInstanceFolder(dataElement.InstanceGuid));

            await WriteToFile(path, SerializeForPersistence(dataElement));
            string blobVersionId = TryGetBlobVersionFromPath(dataElement.BlobStoragePath);
            if (!string.IsNullOrEmpty(blobVersionId))
            {
                await CommitBlobVersion(dataElement.InstanceGuid, dataElement.Id, blobVersionId);
            }

            StampContentEtag(dataElement, blobVersionId);
            return dataElement;
        }

        private async Task DeleteCore(DataElement dataElement)
        {
            using IDisposable dataElementLock = await _dataElementLocks.Lock(
                GetDataElementLockKey(dataElement.InstanceGuid, dataElement.Id)
            );

            string path = GetDataPath(dataElement.InstanceGuid, dataElement.Id);
            File.Delete(path);

            DataElementBlobVersionMetadata metadata = await ReadBlobVersionMetadata(
                dataElement.InstanceGuid,
                dataElement.Id
            );
            metadata.CurrentBlobVersion = null;
            await WriteBlobVersionMetadata(dataElement.InstanceGuid, dataElement.Id, metadata);
        }

        private async Task UpdateInstanceReadStatusIfNoReadElementsRemain(
            Guid instanceGuid,
            Guid dataElementId,
            CancellationToken cancellationToken
        )
        {
            string instancePath = GetInstancePath(instanceGuid);
            if (instancePath is null)
            {
                return;
            }

            string content = await File.ReadAllTextAsync(instancePath, cancellationToken);
            Instance instance = JsonConvert.DeserializeObject<Instance>(content);
            if (instance?.Status?.ReadStatus != ReadStatus.Read)
            {
                return;
            }

            List<DataElement> dataElements = await ReadAllWithoutContentEtags(
                instanceGuid,
                cancellationToken
            );
            bool otherDataElementIsRead = dataElements.Any(d =>
                !string.Equals(d.Id, dataElementId.ToString(), StringComparison.OrdinalIgnoreCase)
                && d.IsRead
            );
            if (otherDataElementIsRead)
            {
                return;
            }

            instance.Status.ReadStatus = ReadStatus.Unread;
            await File.WriteAllTextAsync(instancePath, instance.ToString(), cancellationToken);
        }

        private async Task<DataElement> UpdateMetadata(
            Guid instanceGuid,
            Guid dataElementId,
            Dictionary<string, object> propertylist,
            DataElementUpdateContext context,
            CancellationToken cancellationToken
        )
        {
            string path = GetDataPath($"{instanceGuid}", $"{dataElementId}");

            if (!File.Exists(path))
            {
                throw new RepositoryException("Error occured");
            }

            string instanceId = instanceGuid.ToString();
            string dataId = dataElementId.ToString();
            Action<string, string, bool> lockWaitStartedHook = MutationElementLockWaitStartedHook;
            Action<bool> waitStarted = lockWaitStartedHook is null
                ? null
                : blocked => lockWaitStartedHook(instanceId, dataId, blocked);
            using IDisposable dataElementLock = await _dataElementLocks.Lock(
                GetDataElementLockKey(instanceId, dataId),
                waitStarted,
                cancellationToken
            );

            string content = await ReadFileAsString(path, cancellationToken);
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(content);
            string currentBlobVersion = await ReadCurrentBlobVersionWithoutLock(
                instanceGuid.ToString(),
                dataElementId.ToString(),
                cancellationToken
            );

            if (
                context?.EnforceLockCheck == true
                && (dataElement.Locked || dataElement.DeleteStatus?.IsHardDeleted == true)
            )
            {
                throw new RepositoryException(
                    "Data element cannot be updated",
                    System.Net.HttpStatusCode.Conflict
                );
            }

            if (
                !string.IsNullOrEmpty(context?.ExpectedCurrentBlobVersion)
                && !string.Equals(
                    currentBlobVersion,
                    context.ExpectedCurrentBlobVersion,
                    StringComparison.Ordinal
                )
            )
            {
                throw new DataElementBlobVersionMismatchException(
                    $"Current blob version for data element {dataElementId} did not match expected blob version."
                );
            }

            string newCurrentBlobVersion = null;

            foreach (KeyValuePair<string, object> property in propertylist)
            {
                string propName = property.Key.Trim('/');
                switch (propName)
                {
                    case "contentType":
                        {
                            dataElement.ContentType = (string)property.Value;
                            break;
                        }
                    case "deleteStatus":
                        {
                            dataElement.DeleteStatus = (DeleteStatus)property.Value;
                            break;
                        }
                    case "filename":
                        {
                            dataElement.Filename = (string)property.Value;
                            break;
                        }
                    case "fileScanResult":
                        {
                            dataElement.FileScanResult = (FileScanResult)property.Value;
                            break;
                        }
                    case "blobStoragePath":
                        {
                            dataElement.BlobStoragePath = (string)property.Value;
                            break;
                        }
                    case "currentBlobVersion":
                        {
                            newCurrentBlobVersion = (string)property.Value;
                            break;
                        }
                    case "isRead":
                        {
                            dataElement.IsRead = (bool)property.Value;
                            break;
                        }
                    case "lastChangedBy":
                        {
                            dataElement.LastChangedBy = (string)property.Value;
                            break;
                        }
                    case "lastChanged":
                        {
                            dataElement.LastChanged = (DateTime)property.Value;
                            break;
                        }
                    case "locked":
                        {
                            dataElement.Locked = (bool)property.Value;
                            break;
                        }
                    case "refs":
                        {
                            dataElement.Refs = (List<Guid>)property.Value;
                            break;
                        }
                    case "references":
                        {
                            dataElement.References = (List<Reference>)property.Value;
                            break;
                        }
                    case "size":
                        {
                            dataElement.Size = (long)property.Value;
                            break;
                        }
                    case "tags":
                        {
                            dataElement.Tags = (List<string>)property.Value;
                            break;
                        }
                    case "userDefinedMetadata":
                        {
                            dataElement.UserDefinedMetadata = (List<KeyValueEntry>)property.Value;
                            break;
                        }
                    case "metadata":
                        {
                            dataElement.Metadata = (List<KeyValueEntry>)property.Value;
                            break;
                        }
                }
            }
            Directory.CreateDirectory(GetDataCollectionFolder());
            Directory.CreateDirectory(GetDataForInstanceFolder(dataElement.InstanceGuid));
            await WriteToFile(path, SerializeForPersistence(dataElement));

            if (!string.IsNullOrEmpty(newCurrentBlobVersion))
            {
                await CommitBlobVersion(
                    instanceGuid.ToString(),
                    dataElementId.ToString(),
                    newCurrentBlobVersion
                );
            }

            StampContentEtag(dataElement, newCurrentBlobVersion ?? currentBlobVersion);
            return dataElement;
        }

        private async Task<DataElementReadResult> ReadSnapshot(
            string instanceId,
            string dataId,
            string dataPath,
            bool stampContentEtag,
            CancellationToken cancellationToken
        )
        {
            using IDisposable dataElementLock = await _dataElementLocks.Lock(
                GetDataElementLockKey(instanceId, dataId),
                cancellationToken: cancellationToken
            );

            string content = await ReadFileAsString(dataPath, cancellationToken);
            DataElement dataElement = (DataElement)
                JsonConvert.DeserializeObject(content, typeof(DataElement));

            if (!stampContentEtag)
            {
                return new DataElementReadResult(dataElement, null);
            }

            Func<string, string, Task> metadataReadHook = SnapshotMetadataReadHook;
            if (metadataReadHook is not null)
            {
                await metadataReadHook(instanceId, dataId);
            }

            cancellationToken.ThrowIfCancellationRequested();
            string currentBlobVersion = await ReadCurrentBlobVersionWithoutLock(
                instanceId,
                dataId,
                cancellationToken
            );
            StampContentEtag(dataElement, currentBlobVersion);
            return new DataElementReadResult(dataElement, currentBlobVersion);
        }

        private static void StampContentEtag(DataElement dataElement, string currentBlobVersion)
        {
            dataElement.ContentEtag = BlobVersionId.ToContentEtag(currentBlobVersion);
        }

        private static string SerializeForPersistence(DataElement dataElement)
        {
            lock (dataElement)
            {
                string contentEtag = dataElement.ContentEtag;
                try
                {
                    dataElement.ContentEtag = null;
                    return dataElement.ToString();
                }
                finally
                {
                    dataElement.ContentEtag = contentEtag;
                }
            }
        }

        private string GetDataPath(string instanceId, string dataId)
        {
            return Path.Combine(
                GetDataForInstanceFolder(instanceId) + dataId.Replace("/", "_") + ".json"
            );
        }

        private string GetDataForInstanceFolder(string instanceId)
        {
            return Path.Combine(GetDataCollectionFolder() + instanceId.Replace("/", "_") + "/");
        }

        private string GetDataCollectionFolder()
        {
            return this._localPlatformSettings.LocalTestingStorageBasePath
                + this._localPlatformSettings.DocumentDbFolder
                + this._localPlatformSettings.DataCollectionFolder;
        }

        private string GetInstancePath(Guid instanceGuid)
        {
            string instancesPath = GetInstanceCollectionFolder();
            if (!Directory.Exists(instancesPath))
            {
                return null;
            }

            return Directory.GetFiles(instancesPath, $"*_{instanceGuid}.json").FirstOrDefault();
        }

        private string GetInstanceCollectionFolder()
        {
            return this._localPlatformSettings.LocalTestingStorageBasePath
                + this._localPlatformSettings.DocumentDbFolder
                + this._localPlatformSettings.InstanceCollectionFolder;
        }

        private static async Task<string> ReadFileAsString(
            string path,
            CancellationToken cancellationToken = default
        )
        {
            using Stream stream = await ReadFileAsStream(path, cancellationToken);
            using StreamReader reader = new StreamReader(stream);
            return await reader.ReadToEndAsync(cancellationToken);
        }

        private static async Task<Stream> ReadFileAsStream(
            string path,
            CancellationToken cancellationToken
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                return ReadFileAsStreamInternal(path);
            }
            catch (IOException ioException)
            {
                if (ioException.Message.Contains("used by another process"))
                {
                    await Task.Delay(400, cancellationToken);
                    return ReadFileAsStreamInternal(path);
                }

                throw;
            }
        }

        private static Stream ReadFileAsStreamInternal(string path)
        {
            return new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        }

        private static async Task WriteToFile(string path, string content)
        {
            await using MemoryStream stream = new MemoryStream();
            await using StreamWriter writer = new StreamWriter(stream, Encoding.Default);
            writer.Write(content);
            writer.Flush();
            stream.Position = 0;
            await WriteToFile(path, stream);
        }

        private static async Task<(long ContentLength, DateTimeOffset LastModified)> WriteToFile(
            string path,
            Stream stream
        )
        {
            if (stream is not MemoryStream memStream)
            {
                memStream = new MemoryStream(); // lgtm [cs/local-not-disposed]
                await stream.CopyToAsync(memStream);
                memStream.Position = 0;
            }

            try
            {
                return await WriteToFileInternal(path, memStream);
            }
            catch (IOException ioException)
            {
                if (ioException.Message.Contains("used by another process"))
                {
                    await Task.Delay(400);
                    memStream.Position = 0;
                    return await WriteToFileInternal(path, memStream);
                }

                throw;
            }
            finally
            {
                await memStream.DisposeAsync();
            }
        }

        private static async Task<(
            long ContentLength,
            DateTimeOffset LastModified
        )> WriteToFileInternal(string path, MemoryStream stream)
        {
            long fileSize;
            await using (
                FileStream streamToWriteTo = File.Open(
                    path,
                    FileMode.Create,
                    FileAccess.ReadWrite,
                    FileShare.None
                )
            )
            {
                await stream.CopyToAsync(streamToWriteTo);
                streamToWriteTo.Flush();
                fileSize = streamToWriteTo.Length;
            }

            return (fileSize, DateTime.UtcNow);
        }

        public Task<Dictionary<string, List<DataElement>>> ReadAllForMultiple(
            List<string> instanceGuids
        )
        {
            throw new NotImplementedException();
        }

        public async Task<string> CreateBlobVersionId(
            Guid instanceGuid,
            Guid dataElementId,
            string appId,
            string blobStorageOrg,
            int? storageAccountNumber,
            CancellationToken cancellationToken = default
        )
        {
            string blobVersionId = BlobVersionId.Encode(Guid.NewGuid());
            using IDisposable dataElementLock = await _dataElementLocks.Lock(
                GetDataElementLockKey(instanceGuid.ToString(), dataElementId.ToString())
            );

            DataElementBlobVersionMetadata metadata = await ReadBlobVersionMetadata(
                instanceGuid.ToString(),
                dataElementId.ToString()
            );
            metadata.BlobVersions.Add(blobVersionId);
            await WriteBlobVersionMetadata(
                instanceGuid.ToString(),
                dataElementId.ToString(),
                metadata
            );

            return blobVersionId;
        }

        public async Task<bool> DeleteBlobVersion(
            Guid instanceGuid,
            Guid dataElementId,
            string blobVersionId,
            CancellationToken cancellationToken = default
        )
        {
            using IDisposable dataElementLock = await _dataElementLocks.Lock(
                GetDataElementLockKey(instanceGuid.ToString(), dataElementId.ToString())
            );

            DataElementBlobVersionMetadata metadata = await ReadBlobVersionMetadata(
                instanceGuid.ToString(),
                dataElementId.ToString()
            );

            if (string.Equals(metadata.CurrentBlobVersion, blobVersionId, StringComparison.Ordinal))
            {
                return false;
            }

            bool removed = metadata.BlobVersions.Remove(blobVersionId);
            if (removed)
            {
                await WriteBlobVersionMetadata(
                    instanceGuid.ToString(),
                    dataElementId.ToString(),
                    metadata
                );
            }

            return removed;
        }

        public async Task<IReadOnlyList<string>> ReadDetachedBlobVersions(
            Guid instanceGuid,
            Guid dataElementId,
            CancellationToken cancellationToken = default
        )
        {
            using IDisposable dataElementLock = await _dataElementLocks.Lock(
                GetDataElementLockKey(instanceGuid.ToString(), dataElementId.ToString())
            );

            DataElementBlobVersionMetadata metadata = await ReadBlobVersionMetadata(
                instanceGuid.ToString(),
                dataElementId.ToString()
            );

            if (!string.IsNullOrEmpty(metadata.CurrentBlobVersion))
            {
                return [];
            }

            return metadata.BlobVersions.ToList();
        }

        public async Task<string> ReadCurrentBlobVersion(
            Guid instanceGuid,
            Guid dataElementId,
            CancellationToken cancellationToken = default
        )
        {
            using IDisposable dataElementLock = await _dataElementLocks.Lock(
                GetDataElementLockKey(instanceGuid.ToString(), dataElementId.ToString())
            );

            cancellationToken.ThrowIfCancellationRequested();
            return await ReadCurrentBlobVersionWithoutLock(
                instanceGuid.ToString(),
                dataElementId.ToString(),
                cancellationToken
            );
        }

        private async Task<string> ReadCurrentBlobVersionWithoutLock(
            string instanceId,
            string dataId,
            CancellationToken cancellationToken = default
        )
        {
            DataElementBlobVersionMetadata metadata = await ReadBlobVersionMetadata(
                instanceId,
                dataId,
                cancellationToken
            );
            return metadata.CurrentBlobVersion;
        }

        private static string GetDataElementLockKey(string instanceId, string dataId)
        {
            return $"{instanceId}/{dataId}";
        }

        private string GetBlobVersionPath(string instanceId, string dataId)
        {
            return Path.Combine(
                GetBlobVersionForInstanceFolder(instanceId),
                dataId.Replace("/", "_") + ".json"
            );
        }

        private string GetBlobVersionForInstanceFolder(string instanceId)
        {
            return Path.Combine(GetDataForInstanceFolder(instanceId), ".blobversions/");
        }

        private async Task<DataElementBlobVersionMetadata> ReadBlobVersionMetadata(
            string instanceId,
            string dataId,
            CancellationToken cancellationToken = default
        )
        {
            string path = GetBlobVersionPath(instanceId, dataId);
            if (!File.Exists(path))
            {
                return new DataElementBlobVersionMetadata();
            }

            string content = await ReadFileAsString(path, cancellationToken);
            return JsonConvert.DeserializeObject<DataElementBlobVersionMetadata>(content)
                ?? new DataElementBlobVersionMetadata();
        }

        private async Task WriteBlobVersionMetadata(
            string instanceId,
            string dataId,
            DataElementBlobVersionMetadata metadata
        )
        {
            Directory.CreateDirectory(GetBlobVersionForInstanceFolder(instanceId));

            if (
                string.IsNullOrEmpty(metadata.CurrentBlobVersion)
                && metadata.BlobVersions.Count == 0
            )
            {
                string path = GetBlobVersionPath(instanceId, dataId);
                if (File.Exists(path))
                {
                    File.Delete(path);
                }

                return;
            }

            await WriteToFile(
                GetBlobVersionPath(instanceId, dataId),
                JsonConvert.SerializeObject(metadata)
            );
        }

        private async Task CommitBlobVersion(string instanceId, string dataId, string blobVersionId)
        {
            DataElementBlobVersionMetadata metadata = await ReadBlobVersionMetadata(
                instanceId,
                dataId
            );
            if (!metadata.BlobVersions.Contains(blobVersionId, StringComparer.Ordinal))
            {
                metadata.BlobVersions.Add(blobVersionId);
            }

            metadata.CurrentBlobVersion = blobVersionId;
            await WriteBlobVersionMetadata(instanceId, dataId, metadata);
        }

        private static string TryGetBlobVersionFromPath(string blobStoragePath)
        {
            if (string.IsNullOrEmpty(blobStoragePath))
            {
                return null;
            }

            string marker = "/data-elements/";
            int markerIndex = blobStoragePath.LastIndexOf(marker, StringComparison.Ordinal);
            if (markerIndex < 0)
            {
                return null;
            }

            string blobVersionId = blobStoragePath[(markerIndex + marker.Length)..];
            try
            {
                BlobVersionId.Decode(blobVersionId);
                return blobVersionId;
            }
            catch (Exception exception) when (exception is ArgumentException or FormatException)
            {
                return null;
            }
        }

        private sealed class DataElementBlobVersionMetadata
        {
            public string CurrentBlobVersion { get; set; }

            public List<string> BlobVersions { get; set; } = new List<string>();
        }
    }
}
