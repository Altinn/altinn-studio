using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Services.Storage.Implementation;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class DataRepositoryBlobVersionTests
{
    private static readonly TimeSpan _cleanupTimeout = TimeSpan.FromSeconds(5);

    [Fact]
    public async Task ReadPaths_StampAuthoritativeSidecarAndNeverPersistBlobVersionId()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        Guid dataElementId = Guid.NewGuid();
        string blobVersionId = await storage.DataRepository.CreateBlobVersionId(
            instanceGuid,
            dataElementId,
            instance.AppId,
            instance.Org,
            storageAccountNumber: null
        );
        var dataElement = new DataElement
        {
            Id = dataElementId.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = "attachment",
            ContentType = "text/plain",
            BlobStoragePath = BlobRepository.GetVersionedBlobPath(
                instance.AppId,
                instanceGuid.ToString(),
                blobVersionId
            ),
            BlobVersionId = "stale-incoming-value",
            Created = DateTime.UtcNow,
            LastChanged = DateTime.UtcNow,
        };

        DataElement created = (
            await storage.DataRepository.Create(dataElement, cancellationToken: default)
        ).DataElement;

        Assert.Equal(blobVersionId, created.BlobVersionId);
        string persistedPath = storage.GetPersistedDataElementPath(instanceGuid, dataElementId);
        Assert.Null(JObject.Parse(await File.ReadAllTextAsync(persistedPath))["blobVersionId"]);

        JObject stalePersistedElement = JObject.Parse(await File.ReadAllTextAsync(persistedPath));
        stalePersistedElement["BlobVersionId"] = "stale-pascal-case-on-disk-value";
        await File.WriteAllTextAsync(persistedPath, stalePersistedElement.ToString());

        DataElement single = await storage.DataRepository.Read(instanceGuid, dataElementId);
        DataElement listed = Assert.Single(await storage.DataRepository.ReadAll(instanceGuid));
        (Instance instanceResponse, _) = await storage.InstanceRepository.GetOne(
            instanceGuid,
            includeElements: true,
            CancellationToken.None
        );
        DataElement embedded = Assert.Single(instanceResponse.Data);

        Assert.Equal(blobVersionId, single.BlobVersionId);
        Assert.Equal(blobVersionId, listed.BlobVersionId);
        Assert.Equal(blobVersionId, embedded.BlobVersionId);

        DataElement updated = (
            await storage.DataRepository.Update(
                instanceGuid,
                dataElementId,
                new Dictionary<string, object> { ["/filename"] = "updated.txt" }
            )
        ).DataElement;

        Assert.Equal(blobVersionId, updated.BlobVersionId);
        JObject persistedAfterUpdate = JObject.Parse(await File.ReadAllTextAsync(persistedPath));
        Assert.Null(persistedAfterUpdate["blobVersionId"]);
        Assert.Null(persistedAfterUpdate["BlobVersionId"]);
        Assert.Equal("updated.txt", persistedAfterUpdate["filename"]?.Value<string>());
    }

    [Fact]
    public async Task ReadAll_OrdersByCreatedAndStampsEveryBlobVersionId()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        DateTime created = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc);
        var expectedBlobVersionIds = new Dictionary<string, string>();

        foreach (int offset in new[] { 2, 0, 1 })
        {
            Guid dataElementId = Guid.NewGuid();
            string blobVersionId = await storage.DataRepository.CreateBlobVersionId(
                instanceGuid,
                dataElementId,
                instance.AppId,
                instance.Org,
                storageAccountNumber: null
            );
            await storage.DataRepository.Create(
                new DataElement
                {
                    Id = dataElementId.ToString(),
                    InstanceGuid = instanceGuid.ToString(),
                    DataType = "attachment",
                    BlobStoragePath = BlobRepository.GetVersionedBlobPath(
                        instance.AppId,
                        instanceGuid.ToString(),
                        blobVersionId
                    ),
                    Created = created.AddMinutes(offset),
                    LastChanged = created.AddMinutes(offset),
                }
            );
            expectedBlobVersionIds[dataElementId.ToString()] = blobVersionId;
        }

        List<DataElement> dataElements = await storage.DataRepository.ReadAll(
            instanceGuid,
            CancellationToken.None
        );

        Assert.Equal(
            new DateTime?[] { created, created.AddMinutes(1), created.AddMinutes(2) },
            dataElements.Select(dataElement => dataElement.Created).ToArray()
        );
        Assert.All(
            dataElements,
            dataElement => Assert.Equal(expectedBlobVersionIds[dataElement.Id], dataElement.BlobVersionId)
        );
    }

    [Fact]
    public async Task ReadAll_WhenCanceled_ThrowsInsteadOfReturningPartialResults()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        Guid dataElementId = Guid.NewGuid();
        string blobVersionId = await storage.DataRepository.CreateBlobVersionId(
            instanceGuid,
            dataElementId,
            instance.AppId,
            instance.Org,
            storageAccountNumber: null
        );
        await storage.DataRepository.Create(
            new DataElement
            {
                Id = dataElementId.ToString(),
                InstanceGuid = instanceGuid.ToString(),
                DataType = "attachment",
                BlobStoragePath = BlobRepository.GetVersionedBlobPath(
                    instance.AppId,
                    instanceGuid.ToString(),
                    blobVersionId
                ),
                Created = DateTime.UtcNow,
                LastChanged = DateTime.UtcNow,
            }
        );
        using var cancellation = new CancellationTokenSource();
        var readStarted = new TaskCompletionSource(
            TaskCreationOptions.RunContinuationsAsynchronously
        );
        storage.DataRepository.SnapshotMetadataReadHook = (readInstanceId, readDataId) =>
        {
            if (
                readInstanceId == instanceGuid.ToString()
                && readDataId == dataElementId.ToString()
            )
            {
                readStarted.TrySetResult();
                return Task.Delay(Timeout.InfiniteTimeSpan, cancellation.Token);
            }

            return Task.CompletedTask;
        };

        Task<List<DataElement>> readAll = storage.DataRepository.ReadAll(
            instanceGuid,
            cancellation.Token
        );
        try
        {
            await readStarted.Task.WaitAsync(_cleanupTimeout);
            cancellation.Cancel();

            await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
                readAll.WaitAsync(_cleanupTimeout)
            );
        }
        finally
        {
            cancellation.Cancel();
            storage.DataRepository.SnapshotMetadataReadHook = null;
            try
            {
                await readAll.WaitAsync(_cleanupTimeout);
            }
            catch
            {
                // Cancellation is asserted above or observed here during cleanup.
            }
        }
    }

    [Fact]
    public async Task UpdateReadStatus_IgnoresUnrelatedBlobVersionSidecars()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        instance.Status.ReadStatus = ReadStatus.Read;
        await storage.InstanceRepository.UpdateReadStatus(instance, CancellationToken.None);
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);

        (Guid targetId, string targetBlobVersion) = await CreateVersionedDataElement(
            storage,
            instance,
            instanceGuid,
            isRead: true
        );
        (Guid otherId, _) = await CreateVersionedDataElement(
            storage,
            instance,
            instanceGuid,
            isRead: false
        );
        await File.WriteAllTextAsync(
            storage.GetBlobVersionMetadataPath(instanceGuid, otherId),
            "not valid json"
        );

        DataElement updated = (
            await storage.DataRepository.UpdateReadStatus(
                instanceGuid,
                targetId,
                isRead: false,
                CancellationToken.None
            )
        ).DataElement;
        (Instance persistedInstance, _) = await storage.InstanceRepository.GetOne(
            instanceGuid,
            includeElements: false,
            CancellationToken.None
        );

        Assert.Equal(targetBlobVersion, updated.BlobVersionId);
        Assert.Equal(ReadStatus.Unread, persistedInstance.Status.ReadStatus);

        Exception? readAllException = await Record.ExceptionAsync(() =>
            storage.DataRepository.ReadAll(instanceGuid)
        );
        Assert.NotNull(readAllException);
        JsonReaderException sidecarException = Assert.IsType<JsonReaderException>(
            readAllException.GetBaseException()
        );
        Assert.Contains("Unexpected character", sidecarException.Message);
    }

    [Fact]
    public async Task Create_WhenSerializationThrows_RestoresBlobVersionId()
    {
        await using var storage = new LocalStorageFixture();
        var dataElement = new ThrowingDataElement
        {
            Id = Guid.NewGuid().ToString(),
            InstanceGuid = Guid.NewGuid().ToString(),
            BlobVersionId = "blob-version-to-restore",
        };

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => storage.DataRepository.CreateWithoutVersionBump(dataElement)
        );

        Assert.Equal("serialization failed", exception.Message);
        Assert.True(dataElement.SawNullBlobVersionId);
        Assert.Equal("blob-version-to-restore", dataElement.BlobVersionId);
    }

    [Fact]
    public async Task Read_ConcurrentContentUpdate_ReturnsMetadataAndVersionFromOneLockedSnapshot()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        Guid dataElementId = Guid.NewGuid();
        string firstBlobVersion = await storage.DataRepository.CreateBlobVersionId(
            instanceGuid,
            dataElementId,
            instance.AppId,
            instance.Org,
            storageAccountNumber: null
        );
        await storage.DataRepository.Create(
            new DataElement
            {
                Id = dataElementId.ToString(),
                InstanceGuid = instanceGuid.ToString(),
                DataType = "attachment",
                Filename = "version-one.txt",
                ContentType = "text/plain",
                BlobStoragePath = BlobRepository.GetVersionedBlobPath(
                    instance.AppId,
                    instanceGuid.ToString(),
                    firstBlobVersion
                ),
                Created = DateTime.UtcNow,
                LastChanged = DateTime.UtcNow,
            }
        );
        string secondBlobVersion = await storage.DataRepository.CreateBlobVersionId(
            instanceGuid,
            dataElementId,
            instance.AppId,
            instance.Org,
            storageAccountNumber: null
        );
        var metadataRead = new TaskCompletionSource(
            TaskCreationOptions.RunContinuationsAsynchronously
        );
        var releaseSnapshot = new TaskCompletionSource(
            TaskCreationOptions.RunContinuationsAsynchronously
        );
        var mutationLockWaitStarted = new TaskCompletionSource<bool>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );
        using var operationCancellation = new CancellationTokenSource();
        storage.DataRepository.SnapshotMetadataReadHook = (instanceId, dataId) =>
        {
            if (instanceId == instanceGuid.ToString() && dataId == dataElementId.ToString())
            {
                metadataRead.TrySetResult();
                return releaseSnapshot.Task.WaitAsync(operationCancellation.Token);
            }

            return Task.CompletedTask;
        };
        storage.DataRepository.MutationElementLockWaitStartedHook = (instanceId, dataId, blocked) =>
        {
            if (instanceId == instanceGuid.ToString() && dataId == dataElementId.ToString())
            {
                mutationLockWaitStarted.TrySetResult(blocked);
            }
        };

        Task<DataElement> readTask = storage.DataRepository.Read(
            instanceGuid,
            dataElementId,
            operationCancellation.Token
        );
        Task<DataElement>? updateTask = null;
        Exception? primaryException = null;
        try
        {
            await metadataRead.Task.WaitAsync(TimeSpan.FromSeconds(5));
            updateTask = storage.DataRepository.UpdateWithoutVersionBump(
                instanceGuid,
                dataElementId,
                new Dictionary<string, object>
                {
                    ["/filename"] = "version-two.txt",
                    ["/blobStoragePath"] = BlobRepository.GetVersionedBlobPath(
                        instance.AppId,
                        instanceGuid.ToString(),
                        secondBlobVersion
                    ),
                    ["/currentBlobVersion"] = secondBlobVersion,
                },
                context: null,
                cancellationToken: operationCancellation.Token
            );

            bool writerWasBlocked = await mutationLockWaitStarted.Task.WaitAsync(
                TimeSpan.FromSeconds(5)
            );
            Assert.True(writerWasBlocked);
            Assert.False(updateTask.IsCompleted);
            releaseSnapshot.TrySetResult();

            DataElement snapshot = await readTask.WaitAsync(TimeSpan.FromSeconds(5));
            DataElement updated = await updateTask.WaitAsync(TimeSpan.FromSeconds(5));

            Assert.True(readTask.IsCompletedSuccessfully);
            Assert.True(updateTask.IsCompletedSuccessfully);
            Assert.Equal("version-one.txt", snapshot.Filename);
            Assert.Equal(firstBlobVersion, snapshot.BlobVersionId);
            Assert.Equal("version-two.txt", updated.Filename);
            Assert.Equal(secondBlobVersion, updated.BlobVersionId);
        }
        catch (Exception exception)
        {
            primaryException = exception;
            throw;
        }
        finally
        {
            releaseSnapshot.TrySetResult();
            Exception? cancellationCleanupException = null;
            Exception? readCleanupException = null;
            Exception? updateCleanupException = null;
            try
            {
                try
                {
                    operationCancellation.Cancel();
                }
                catch (Exception exception)
                {
                    cancellationCleanupException = exception;
                }

                Task<Exception?> readObservation = ObserveTask(readTask, _cleanupTimeout);
                Task<Exception?> updateObservation = ObserveTask(updateTask, _cleanupTimeout);
                await Task.WhenAll(readObservation, updateObservation);
                readCleanupException = await readObservation;
                updateCleanupException = await updateObservation;
            }
            finally
            {
                if (!readTask.IsCompleted || updateTask is { IsCompleted: false })
                {
                    storage.PreserveRootOnDispose();
                }

                storage.DataRepository.SnapshotMetadataReadHook = null;
                storage.DataRepository.MutationElementLockWaitStartedHook = null;
            }

            List<Exception> cleanupExceptions =
            [
                .. new[]
                {
                    cancellationCleanupException,
                    readCleanupException,
                    updateCleanupException,
                }.OfType<Exception>(),
            ];
            if (cleanupExceptions.Count > 0)
            {
                var cleanupException = new AggregateException(cleanupExceptions);
                if (primaryException is null)
                {
                    throw cleanupException;
                }

                primaryException.Data["ConcurrencyCleanupException"] = cleanupException;
            }
        }
    }

    [Fact]
    public async Task NoCurrentBlobVersion_OverwritesPersistedValueWithNullAndOmitsItOnWrite()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        Guid dataElementId = Guid.NewGuid();
        var dataElement = new DataElement
        {
            Id = dataElementId.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = "attachment",
            ContentType = "text/plain",
            BlobStoragePath = $"{instance.AppId}/{instanceGuid}/data/{dataElementId}",
            BlobVersionId = "untrusted-value",
            Created = DateTime.UtcNow,
            LastChanged = DateTime.UtcNow,
        };

        DataElement created = (
            await storage.DataRepository.Create(dataElement, cancellationToken: default)
        ).DataElement;
        string persistedPath = storage.GetPersistedDataElementPath(instanceGuid, dataElementId);

        Assert.Null(created.BlobVersionId);
        Assert.Null(JObject.Parse(await File.ReadAllTextAsync(persistedPath))["blobVersionId"]);

        JObject stalePersistedElement = JObject.Parse(await File.ReadAllTextAsync(persistedPath));
        stalePersistedElement["blobVersionId"] = "stale-on-disk-value";
        await File.WriteAllTextAsync(persistedPath, stalePersistedElement.ToString());

        DataElement read = await storage.DataRepository.Read(instanceGuid, dataElementId);

        Assert.Null(read.BlobVersionId);
        Assert.Null(JObject.Parse(JsonConvert.SerializeObject(read))["blobVersionId"]);
    }

    private static async Task<Exception?> ObserveTask(Task? task, TimeSpan timeout)
    {
        if (task is null)
        {
            return null;
        }

        try
        {
            await task.WaitAsync(timeout);
            return null;
        }
        catch (Exception exception)
        {
            return exception;
        }
    }

    private static async Task<(Guid DataElementId, string BlobVersionId)> CreateVersionedDataElement(
        LocalStorageFixture storage,
        Instance instance,
        Guid instanceGuid,
        bool isRead
    )
    {
        Guid dataElementId = Guid.NewGuid();
        string blobVersionId = await storage.DataRepository.CreateBlobVersionId(
            instanceGuid,
            dataElementId,
            instance.AppId,
            instance.Org,
            storageAccountNumber: null
        );
        await storage.DataRepository.Create(
            new DataElement
            {
                Id = dataElementId.ToString(),
                InstanceGuid = instanceGuid.ToString(),
                DataType = "attachment",
                BlobStoragePath = BlobRepository.GetVersionedBlobPath(
                    instance.AppId,
                    instanceGuid.ToString(),
                    blobVersionId
                ),
                IsRead = isRead,
                Created = DateTime.UtcNow,
                LastChanged = DateTime.UtcNow,
            }
        );
        return (dataElementId, blobVersionId);
    }

    private sealed class ThrowingDataElement : DataElement
    {
        public bool SawNullBlobVersionId { get; private set; }

        public override string ToString()
        {
            SawNullBlobVersionId = BlobVersionId is null;
            throw new InvalidOperationException("serialization failed");
        }
    }
}
