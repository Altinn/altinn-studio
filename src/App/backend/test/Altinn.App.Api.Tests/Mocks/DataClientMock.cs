using System.Diagnostics;
using System.Net;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using DataElement = Altinn.Platform.Storage.Interface.Models.DataElement;

namespace App.IntegrationTests.Mocks.Services;

internal sealed class DataClientMock : IStorageDataClient
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IAppMetadata _appMetadata;
    private readonly ModelSerializationService _modelSerialization;
    private readonly ApiTestStorageMetadata _storageMetadata;

    public DataClientMock(
        IAppMetadata appMetadata,
        ModelSerializationService modelSerialization,
        IHttpContextAccessor httpContextAccessor,
        ApiTestStorageMetadata storageMetadata
    )
    {
        _httpContextAccessor = httpContextAccessor;
        _appMetadata = appMetadata;
        _modelSerialization = modelSerialization;
        _storageMetadata = storageMetadata;
    }

    public async Task<bool> DeleteData(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        bool delay,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    ) =>
        (
            await ((IDataClientWithStorageMetadata)this).DeleteDataWithStorageMetadata(
                instanceOwnerPartyId,
                instanceGuid,
                dataGuid,
                delay,
                authenticationMethod,
                cancellationToken: cancellationToken
            )
        ).Deleted;

    async Task<DeleteDataWithStorageMetadata> IDataClientWithStorageMetadata.DeleteDataWithStorageMetadata(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        bool delay,
        StorageAuthenticationMethod? authenticationMethod,
        StorageWritePreconditions? preconditions,
        CancellationToken cancellationToken
    )
    {
        (string org, string app) = TestData.GetInstanceOrgApp(
            new InstanceIdentifier(instanceOwnerPartyId, instanceGuid)
        );
        string dataElementPath = TestData.GetDataElementPath(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);
        bool deleted;

        if (delay)
        {
            DataElement dataElement = await InstanceClientMockSi.ReadJsonFile<DataElement>(
                dataElementPath,
                cancellationToken
            );

            dataElement.DeleteStatus = new() { IsHardDeleted = true, HardDeleted = DateTime.UtcNow };

            await WriteDataElementToFile(dataElement, org, app, instanceOwnerPartyId, cancellationToken);

            deleted = true;
        }
        else
        {
            string dataBlobPath = TestData.GetDataBlobPath(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);

            if (File.Exists(dataElementPath))
            {
                File.Delete(dataElementPath);
            }

            if (File.Exists(dataBlobPath))
            {
                File.Delete(dataBlobPath);
            }

            _storageMetadata.RemoveDataElement(new InstanceIdentifier(instanceOwnerPartyId, instanceGuid), dataGuid);
            deleted = true;
        }

        StorageVersionMetadata metadata = _storageMetadata.BumpInstance(
            $"{instanceOwnerPartyId}/{instanceGuid}",
            processStateChanged: false
        );

        return new DeleteDataWithStorageMetadata(deleted, metadata);
    }

    public async Task<Stream> GetBinaryData(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        return new MemoryStream(
            await GetDataBytes(instanceOwnerPartyId, instanceGuid, dataId, authenticationMethod, cancellationToken)
        );
    }

    public Task<Stream> GetBinaryDataStream(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(timeout ?? TimeSpan.FromSeconds(100));

        if (cts.Token.IsCancellationRequested)
            return Task.FromCanceled<Stream>(cts.Token);

        (string org, string app) = TestData.GetInstanceOrgApp(
            new InstanceIdentifier(instanceOwnerPartyId, instanceGuid)
        );

        string path = TestData.GetDataBlobPath(org, app, instanceOwnerPartyId, instanceGuid, dataId);

        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Data element not found at path: {path}");
        }

        var fs = new FileStream(
            path,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 64 * 1024,
            options: FileOptions.Asynchronous | FileOptions.SequentialScan
        );

        return Task.FromResult<Stream>(fs);
    }

    public async Task<byte[]> GetDataBytes(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        (string org, string app) = TestData.GetInstanceOrgApp(
            new InstanceIdentifier(instanceOwnerPartyId, instanceGuid)
        );
        string dataPath = TestData.GetDataBlobPath(org, app, instanceOwnerPartyId, instanceGuid, dataId);

        return await File.ReadAllBytesAsync(dataPath, cancellationToken);
    }

    async Task<DataBytesWithStorageMetadata> IDataClientWithStorageMetadata.GetDataBytesWithStorageMetadata(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod,
        string? expectedContentETag,
        CancellationToken cancellationToken
    )
    {
        byte[] bytes = await GetDataBytes(
            instanceOwnerPartyId,
            instanceGuid,
            dataId,
            authenticationMethod,
            cancellationToken
        );
        StorageDataElementMetadata metadata = _storageMetadata.GetDataElementMetadataForContentRead(
            new InstanceIdentifier(instanceOwnerPartyId, instanceGuid),
            dataId
        );
        if (!string.IsNullOrEmpty(expectedContentETag) && metadata.ETag != expectedContentETag)
        {
            throw new PlatformHttpException(
                new HttpResponseMessage(HttpStatusCode.PreconditionFailed),
                "Content ETag mismatch"
            );
        }
        return new DataBytesWithStorageMetadata(bytes, metadata);
    }

    public async Task<List<AttachmentList>> GetBinaryDataList(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        (string org, string app) = TestData.GetInstanceOrgApp(
            new InstanceIdentifier(instanceOwnerPartyId, instanceGuid)
        );
        var dataElements = await GetDataElements(org, app, instanceOwnerPartyId, instanceGuid, cancellationToken);
        List<AttachmentList> list = new();
        foreach (DataElement dataElement in dataElements)
        {
            AttachmentList al = new()
            {
                Type = dataElement.DataType,
                Attachments =
                [
                    new Attachment()
                    {
                        Id = dataElement.Id,
                        Name = dataElement.Filename,
                        Size = dataElement.Size,
                    },
                ],
            };
            list.Add(al);
        }

        return list;
    }

    [Obsolete("Use the GetFormData method with Instance parameter instead")]
    public Task<object> GetFormData(
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        return Task.FromException<object>(new NotImplementedException());
    }

    public async Task<object> GetFormData(
        Instance instance,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        var instanceIdentifier = new InstanceIdentifier(instance);
        var (org, app) = TestData.GetInstanceOrgApp(instanceIdentifier);

        var application = await _appMetadata.GetApplicationMetadata();
        var dataType =
            application.DataTypes.Find(d => d.Id == dataElement?.DataType)
            ?? throw new InvalidOperationException(
                $"Data type {dataElement?.DataType} not found in applicationmetadata.json"
            );

        string dataPath = TestData.GetDataBlobPath(
            org,
            app,
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            Guid.Parse(dataElement.Id)
        );
        var dataBytes = await File.ReadAllBytesAsync(dataPath, cancellationToken);

        var formData = _modelSerialization.DeserializeFromStorage(dataBytes, dataType, dataElement);

        return formData ?? throw new Exception("Unable to deserialize form data");
    }

    [Obsolete("Use the InsertFormData method with Instance parameter instead")]
    public Task<DataElement> InsertFormData<T>(
        T dataToSerialize,
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        string dataType,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
        where T : notnull
    {
        return Task.FromException<DataElement>(new NotImplementedException());
    }

    public async Task<DataElement> InsertFormData(
        Instance instance,
        string dataTypeId,
        object dataToSerialize,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        var application = await _appMetadata.GetApplicationMetadata();
        var dataType =
            application.DataTypes.Find(d => d.Id == dataTypeId)
            ?? throw new InvalidOperationException($"Data type {dataTypeId} not found in applicationmetadata.json");
        var instanceIdentifier = new InstanceIdentifier(instance);
        Guid dataGuid = Guid.NewGuid();

        string org = instance.Org;
        string app = instance.AppId.Split("/")[1];

        string dataPath = TestData.GetDataDirectory(
            org,
            app,
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid
        );
        var (serializedBytes, contentType) = _modelSerialization.SerializeToStorage(dataToSerialize, dataType, null);

        DataElement dataElement = new()
        {
            Id = dataGuid.ToString(),
            InstanceGuid = instanceIdentifier.InstanceGuid.ToString(),
            DataType = dataTypeId,
            ContentType = contentType,
        };

        Directory.CreateDirectory(Path.Join(dataPath, "blob"));

        await File.WriteAllBytesAsync(
            Path.Join(dataPath, "blob", dataGuid.ToString()),
            serializedBytes.ToArray(),
            cancellationToken
        );

        await WriteDataElementToFile(dataElement, org, app, instanceIdentifier.InstanceOwnerPartyId, cancellationToken);
        _storageMetadata.BumpDataElement(instanceIdentifier, dataGuid);

        return dataElement;
    }

    [Obsolete("Use the UpdateFormData method with Instance parameter instead")]
    public Task<DataElement> UpdateData<T>(
        T dataToSerialize,
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
        where T : notnull
    {
        throw new NotImplementedException();
    }

    public async Task<DataElement> UpdateFormData(
        Instance instance,
        object dataToSerialize,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(dataToSerialize);
        InstanceIdentifier instanceIdentifier = new(instance);
        var (org, app) = TestData.GetInstanceOrgApp(instanceIdentifier);
        string dataPath = TestData.GetDataDirectory(
            org,
            app,
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid
        );

        var application = await _appMetadata.GetApplicationMetadata();
        var dataType =
            application.DataTypes.Find(d => d.Id == dataElement.DataType)
            ?? throw new InvalidOperationException(
                $"Data type {dataElement.DataType} not found in applicationmetadata.json"
            );

        Directory.CreateDirectory(Path.Join(dataPath, "blob"));

        var (serializedBytes, contentType) = _modelSerialization.SerializeToStorage(
            dataToSerialize,
            dataType,
            dataElement
        );

        Debug.Assert(contentType == dataElement.ContentType, "Content type should not change when updating data");
        await File.WriteAllBytesAsync(
            Path.Join(dataPath, "blob", dataElement.Id),
            serializedBytes.ToArray(),
            cancellationToken
        );

        dataElement.LastChanged = DateTime.UtcNow;
        dataElement.Size = serializedBytes.Length;
        await WriteDataElementToFile(dataElement, org, app, instanceIdentifier.InstanceOwnerPartyId, cancellationToken);
        _storageMetadata.BumpDataElement(instanceIdentifier, Guid.Parse(dataElement.Id));

        return dataElement;
    }

    [Obsolete("The overload that takes a HttpRequest is deprecated, use the overload that takes a Stream instead")]
    public Task<DataElement> InsertBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string dataType,
        HttpRequest request,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        return Task.FromException<DataElement>(new NotImplementedException());
    }

    public async Task<DataElement> UpdateBinaryData(
        InstanceIdentifier instanceIdentifier,
        string? contentType,
        string? filename,
        Guid dataGuid,
        Stream stream,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        Application application = await _appMetadata.GetApplicationMetadata();

        string org = application.Org;
        string app = application.Id.Split("/")[1];

        string dataPath = TestData.GetDataDirectory(
            org,
            app,
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid
        );

        if (!Directory.Exists(Path.GetDirectoryName(dataPath)))
        {
            var directory = Path.GetDirectoryName(dataPath);
            if (directory != null)
                Directory.CreateDirectory(directory);
        }

        Directory.CreateDirectory(Path.Join(dataPath, "blob"));

        using var memoryStream = new MemoryStream();
        stream.Seek(0, SeekOrigin.Begin);
        await stream.CopyToAsync(memoryStream, cancellationToken);

        var fileData = memoryStream.ToArray();
        await File.WriteAllBytesAsync(Path.Join(dataPath, "blob", dataGuid.ToString()), fileData, cancellationToken);

        var dataElement = await GetDataElement(
            org,
            app,
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            dataGuid.ToString(),
            cancellationToken
        );

        dataElement.Size = fileData.Length;
        await WriteDataElementToFile(dataElement, org, app, instanceIdentifier.InstanceOwnerPartyId, cancellationToken);
        _storageMetadata.BumpDataElement(instanceIdentifier, dataGuid);

        return dataElement;
    }

    public async Task<DataElement> InsertBinaryData(
        string instanceId,
        string dataType,
        string contentType,
        string? filename,
        Stream stream,
        string? generatedFromTask = null,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        Application application = await _appMetadata.GetApplicationMetadata();
        var instanceIdParts = instanceId.Split("/");

        Guid dataGuid = Guid.NewGuid();

        string org = application.Org;
        string app = application.Id.Split("/")[1];
        int instanceOwnerId = int.Parse(instanceIdParts[0]);
        Guid instanceGuid = Guid.Parse(instanceIdParts[1]);

        string dataPath = TestData.GetDataDirectory(org, app, instanceOwnerId, instanceGuid);

        DataElement dataElement = new()
        {
            Id = dataGuid.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = dataType,
            ContentType = contentType,
        };

        if (!Directory.Exists(Path.GetDirectoryName(dataPath)))
        {
            var directory = Path.GetDirectoryName(dataPath);
            if (directory != null)
                Directory.CreateDirectory(directory);
        }

        Directory.CreateDirectory(Path.Join(dataPath, "blob"));

        using var memoryStream = new MemoryStream();
        stream.Seek(0, SeekOrigin.Begin);
        await stream.CopyToAsync(memoryStream, cancellationToken);

        var fileData = memoryStream.ToArray();
        await File.WriteAllBytesAsync(Path.Join(dataPath, "blob", dataGuid.ToString()), fileData, cancellationToken);

        dataElement.Size = fileData.Length;

        await WriteDataElementToFile(dataElement, org, app, instanceOwnerId, cancellationToken);
        _storageMetadata.BumpDataElement(new InstanceIdentifier(instanceOwnerId, instanceGuid), dataGuid);

        return dataElement;
    }

    async Task<DataElementWithStorageMetadata> IDataClientWithStorageMetadata.InsertBinaryDataWithStorageMetadata(
        string instanceId,
        string dataType,
        string contentType,
        string? filename,
        Stream stream,
        string? generatedFromTask,
        StorageAuthenticationMethod? authenticationMethod,
        StorageWritePreconditions? preconditions,
        CancellationToken cancellationToken
    )
    {
        DataElement dataElement = await InsertBinaryData(
            instanceId,
            dataType,
            contentType,
            filename,
            stream,
            generatedFromTask,
            authenticationMethod,
            cancellationToken
        );
        var instanceIdentifier = new InstanceIdentifier(instanceId);
        StorageDataElementMetadata dataElementMetadata = _storageMetadata.GetDataElementMetadata(
            instanceIdentifier,
            Guid.Parse(dataElement.Id)
        );
        return new DataElementWithStorageMetadata(
            dataElement,
            dataElementMetadata,
            _storageMetadata.GetVersions(instanceIdentifier)
        );
    }

    public Task<DataElement> UpdateBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        HttpRequest request,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        throw new NotImplementedException();
    }

    async Task<DataElementWithStorageMetadata> IDataClientWithStorageMetadata.UpdateBinaryDataWithStorageMetadata(
        InstanceIdentifier instanceIdentifier,
        string? contentType,
        string? filename,
        Guid dataGuid,
        Stream stream,
        StorageAuthenticationMethod? authenticationMethod,
        StorageWritePreconditions? preconditions,
        CancellationToken cancellationToken
    )
    {
        DataElement dataElement = await UpdateBinaryData(
            instanceIdentifier,
            contentType,
            filename,
            dataGuid,
            stream,
            authenticationMethod,
            cancellationToken
        );
        StorageDataElementMetadata dataElementMetadata = _storageMetadata.GetDataElementMetadata(
            instanceIdentifier,
            dataGuid
        );
        return new DataElementWithStorageMetadata(
            dataElement,
            dataElementMetadata,
            _storageMetadata.GetVersions(instanceIdentifier)
        );
    }

    public async Task<DataElement> Update(
        Instance instance,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        string org = instance.Org;
        string app = instance.AppId.Split("/")[1];
        int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);

        await WriteDataElementToFile(dataElement, org, app, instanceOwnerId, cancellationToken);
        _storageMetadata.BumpInstance(instance);

        return dataElement;
    }

    async Task<DataElementWithStorageMetadata> IDataClientWithStorageMetadata.UpdateDataElementWithStorageMetadata(
        Instance instance,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod,
        StorageWritePreconditions? preconditions,
        CancellationToken cancellationToken
    )
    {
        DataElement result = await Update(instance, dataElement, authenticationMethod, cancellationToken);
        var instanceIdentifier = new InstanceIdentifier(instance);
        StorageDataElementMetadata dataElementMetadata = _storageMetadata.GetDataElementMetadata(
            instanceIdentifier,
            Guid.Parse(result.Id)
        );
        return new DataElementWithStorageMetadata(
            result,
            dataElementMetadata,
            _storageMetadata.GetVersions(instanceIdentifier)
        );
    }

    public async Task<DataElement> LockDataElement(
        InstanceIdentifier instanceIdentifier,
        Guid dataGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        // The signature does not carry org/app, but the file-backed test data is organized by org/app.
        (string org, string app) = GetInstanceOrgApp(instanceIdentifier);
        DataElement element = await GetDataElement(
            org,
            app,
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            dataGuid.ToString(),
            cancellationToken
        );
        element.Locked = true;
        await WriteDataElementToFile(element, org, app, instanceIdentifier.InstanceOwnerPartyId, cancellationToken);
        return element;
    }

    public async Task<DataElement> UnlockDataElement(
        InstanceIdentifier instanceIdentifier,
        Guid dataGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        // The signature does not carry org/app, but the file-backed test data is organized by org/app.
        (string org, string app) = GetInstanceOrgApp(instanceIdentifier);
        DataElement element = await GetDataElement(
            org,
            app,
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            dataGuid.ToString(),
            cancellationToken
        );

        element.Locked = false;
        await WriteDataElementToFile(element, org, app, instanceIdentifier.InstanceOwnerPartyId, cancellationToken);
        return element;
    }

    async Task<InstanceMutationWithStorageMetadata> IInstanceMutationClient.CommitInstanceMutationWithStorageMetadata(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        StorageInstanceMutationRequest mutation,
        IReadOnlyDictionary<string, StorageInstanceMutationContent> contentParts,
        StorageAuthenticationMethod? authenticationMethod,
        StorageWritePreconditions? preconditions,
        CancellationToken cancellationToken
    )
    {
        var instanceIdentifier = new InstanceIdentifier(instanceOwnerPartyId, instanceGuid);
        _storageMetadata.ValidateAggregatePreconditions(instanceIdentifier, mutation, preconditions);
        (string org, string app) = GetInstanceOrgApp(instanceIdentifier);
        string instancePath = TestData.GetInstancePath(org, app, instanceOwnerPartyId, instanceGuid);

        Instance instance = await InstanceClientMockSi.ReadJsonFile<Instance>(instancePath, cancellationToken);
        instance.Data =
        [
            .. (await GetDataElements(org, app, instanceOwnerPartyId, instanceGuid, cancellationToken)).DistinctBy(
                dataElement => dataElement.Id
            ),
        ];

        HashSet<Guid> changedDataElementIds = [];
        HashSet<Guid> deletedDataElementIds = [];
        List<Guid> createdDataElementIds = [];

        foreach (StorageInstanceMutationCreateDataElement create in mutation.CreateDataElements)
        {
            Guid dataGuid = Guid.NewGuid();
            createdDataElementIds.Add(dataGuid);
            StorageInstanceMutationContent content = contentParts[create.ContentPartName];
            await WriteDataBlob(
                org,
                app,
                instanceOwnerPartyId,
                instanceGuid,
                dataGuid,
                content.Bytes,
                cancellationToken
            );

            DataElement dataElement = new()
            {
                Id = dataGuid.ToString(),
                InstanceGuid = instanceGuid.ToString(),
                DataType = create.DataType,
                ContentType = create.ContentType ?? content.ContentType,
                Filename = create.Filename ?? content.Filename,
                Size = content.Bytes.Length,
                Locked = create.Locked ?? false,
                LastChanged = DateTime.UtcNow,
            };

            await WriteDataElementToFile(dataElement, org, app, instanceOwnerPartyId, cancellationToken);
            instance.Data.RemoveAll(element => element.Id == dataElement.Id);
            instance.Data.Add(dataElement);
            changedDataElementIds.Add(dataGuid);
        }

        foreach (StorageInstanceMutationUpdateDataElement update in mutation.UpdateDataElements)
        {
            DataElement dataElement = await GetDataElement(
                org,
                app,
                instanceOwnerPartyId,
                instanceGuid,
                update.DataElementId.ToString(),
                cancellationToken
            );

            if (update.ContentPartName is { } contentPartName)
            {
                StorageInstanceMutationContent content = contentParts[contentPartName];
                await WriteDataBlob(
                    org,
                    app,
                    instanceOwnerPartyId,
                    instanceGuid,
                    update.DataElementId,
                    content.Bytes,
                    cancellationToken
                );
                dataElement.ContentType = update.ContentType ?? content.ContentType;
                dataElement.Filename = update.Filename ?? content.Filename;
                dataElement.Size = content.Bytes.Length;
                changedDataElementIds.Add(update.DataElementId);
            }

            if (update.DeleteStatus is not null)
            {
                dataElement.DeleteStatus = update.DeleteStatus;
            }

            if (update.Locked is not null)
            {
                dataElement.Locked = update.Locked.Value;
            }

            dataElement.LastChanged = DateTime.UtcNow;
            await WriteDataElementToFile(dataElement, org, app, instanceOwnerPartyId, cancellationToken);
            instance.Data.RemoveAll(element => element.Id == dataElement.Id);
            instance.Data.Add(dataElement);
        }

        foreach (StorageInstanceMutationDeleteDataElement delete in mutation.DeleteDataElements)
        {
            string dataElementPath = TestData.GetDataElementPath(
                org,
                app,
                instanceOwnerPartyId,
                instanceGuid,
                delete.DataElementId
            );
            string dataBlobPath = TestData.GetDataBlobPath(
                org,
                app,
                instanceOwnerPartyId,
                instanceGuid,
                delete.DataElementId
            );

            if (File.Exists(dataElementPath))
            {
                File.Delete(dataElementPath);
            }

            if (File.Exists(dataBlobPath))
            {
                File.Delete(dataBlobPath);
            }

            instance.Data.RemoveAll(element => element.Id == delete.DataElementId.ToString());
            deletedDataElementIds.Add(delete.DataElementId);
        }

        ApplyStringDictionaryUpdates(instance.DataValues, mutation.DataValues, values => instance.DataValues = values);
        ApplyStringDictionaryUpdates(
            instance.PresentationTexts,
            mutation.PresentationTexts,
            values => instance.PresentationTexts = values
        );

        bool processStateChanged = mutation.ProcessState?.State is not null;
        if (mutation.ProcessState?.State is { } processState)
        {
            if (instance.Process?.Ended is null && processState.Ended is not null)
            {
                instance.Status ??= new InstanceStatus();
                instance.Status.IsArchived = true;
                instance.Status.Archived = processState.Ended;
            }

            instance.Process = processState;
        }

        instance.LastChanged = DateTime.UtcNow;
        await InstanceClientMockSi.WriteJsonFile(instancePath, instance, cancellationToken);

        var (versions, _) = _storageMetadata.BumpAggregate(
            instanceIdentifier,
            changedDataElementIds,
            deletedDataElementIds,
            processStateChanged
        );
        InstanceStorageMetadataRegistry.Set(instance, versions);

        var dataElementMetadata = instance.Data.ToDictionary(
            dataElement => dataElement.Id,
            dataElement =>
            {
                StorageDataElementMetadata metadata = _storageMetadata.GetDataElementMetadata(
                    instanceIdentifier,
                    Guid.Parse(dataElement.Id)
                );
                dataElement.ContentEtag = metadata.ETag;
                return metadata;
            }
        );

        return new InstanceMutationWithStorageMetadata(instance, dataElementMetadata, versions, createdDataElementIds);
    }

    private static async Task WriteDataBlob(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        ReadOnlyMemory<byte> bytes,
        CancellationToken cancellationToken
    )
    {
        string dataDirectory = TestData.GetDataDirectory(org, app, instanceOwnerPartyId, instanceGuid);
        string blobDirectory = Path.Join(dataDirectory, "blob");
        Directory.CreateDirectory(blobDirectory);
        await File.WriteAllBytesAsync(Path.Join(blobDirectory, dataGuid.ToString()), bytes, cancellationToken);
    }

    private static (string Org, string App) GetInstanceOrgApp(InstanceIdentifier identifier)
    {
        try
        {
            return TestData.GetInstanceOrgApp(identifier);
        }
        catch (DirectoryNotFoundException)
        {
            string instanceFileName = identifier.InstanceGuid + ".json";
            string[] paths = Directory
                .GetFiles(TestData.GetInstancesDirectory(), instanceFileName, SearchOption.AllDirectories)
                .Where(path =>
                    path.Split(Path.DirectorySeparatorChar).Contains(identifier.InstanceOwnerPartyId.ToString())
                )
                .ToArray();

            if (paths.Length == 1)
            {
                DirectoryInfo partyDirectory =
                    Directory.GetParent(paths[0])
                    ?? throw new DirectoryNotFoundException($"No party directory found for {identifier}");
                DirectoryInfo appDirectory =
                    partyDirectory.Parent
                    ?? throw new DirectoryNotFoundException($"No app directory found for {identifier}");
                DirectoryInfo orgDirectory =
                    appDirectory.Parent
                    ?? throw new DirectoryNotFoundException($"No org directory found for {identifier}");

                return (orgDirectory.Name, appDirectory.Name);
            }

            throw;
        }
    }

    private static void ApplyStringDictionaryUpdates(
        Dictionary<string, string>? current,
        IReadOnlyDictionary<string, string?> updates,
        Action<Dictionary<string, string>?> assign
    )
    {
        if (updates.Count == 0)
        {
            return;
        }

        Dictionary<string, string>? values = current is null
            ? new Dictionary<string, string>(StringComparer.Ordinal)
            : new Dictionary<string, string>(current, StringComparer.Ordinal);

        foreach ((string key, string? value) in updates)
        {
            if (string.IsNullOrEmpty(value))
            {
                values.Remove(key);
            }
            else
            {
                values[key] = value;
            }
        }

        assign(values.Count == 0 ? null : values);
    }

    private static async Task WriteDataElementToFile(
        DataElement dataElement,
        string org,
        string app,
        int instanceOwnerPartyId,
        CancellationToken cancellationToken = default
    )
    {
        string dataElementPath = TestData.GetDataElementPath(
            org,
            app,
            instanceOwnerPartyId,
            Guid.Parse(dataElement.InstanceGuid),
            Guid.Parse(dataElement.Id)
        );
        await InstanceClientMockSi.WriteJsonFile(dataElementPath, dataElement, cancellationToken);
    }

    private async Task<List<DataElement>> GetDataElements(
        string org,
        string app,
        int instanceOwnerId,
        Guid instanceId,
        CancellationToken cancellationToken = default
    )
    {
        string path = TestData.GetDataDirectory(org, app, instanceOwnerId, instanceId);
        List<DataElement> dataElements = new();

        if (!Directory.Exists(path))
        {
            return new List<DataElement>();
        }

        string[] files = Directory.GetFiles(path);

        foreach (string file in files)
        {
            DataElement dataElement = await InstanceClientMockSi.ReadJsonFile<DataElement>(file, cancellationToken);

            if (
                dataElement.DeleteStatus?.IsHardDeleted == true
                && string.IsNullOrEmpty(_httpContextAccessor.HttpContext?.User.GetOrg())
            )
            {
                continue;
            }

            dataElements.Add(dataElement);
        }

        return dataElements;
    }

    private async Task<DataElement> GetDataElement(
        string org,
        string app,
        int instanceOwnerId,
        Guid instanceId,
        string dataElementGuid,
        CancellationToken cancellationToken = default
    )
    {
        string path = TestData.GetDataDirectory(org, app, instanceOwnerId, instanceId);
        return await InstanceClientMockSi.ReadJsonFile<DataElement>(
            Path.Join(path, dataElementGuid + ".json"),
            cancellationToken
        );
    }
}
