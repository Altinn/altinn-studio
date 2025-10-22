using System.Diagnostics;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using DataElement = Altinn.Platform.Storage.Interface.Models.DataElement;

namespace App.IntegrationTests.Mocks.Services;

public class DataClientMock : IDataClient
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IAppMetadata _appMetadata;
    private readonly ModelSerializationService _modelSerialization;

    public DataClientMock(
        IAppMetadata appMetadata,
        ModelSerializationService modelSerialization,
        IHttpContextAccessor httpContextAccessor
    )
    {
        _httpContextAccessor = httpContextAccessor;
        _appMetadata = appMetadata;
        _modelSerialization = modelSerialization;
    }

    public async Task<bool> DeleteBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid
    )
    {
        return await DeleteData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid, false);
    }

    public async Task<bool> DeleteData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        bool delay,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        string dataElementPath = TestData.GetDataElementPath(org, app, instanceOwnerPartyId, instanceGuid, dataGuid);

        if (delay)
        {
            DataElement dataElement = await InstanceClientMockSi.ReadJsonFile<DataElement>(
                dataElementPath,
                cancellationToken
            );

            dataElement.DeleteStatus = new() { IsHardDeleted = true, HardDeleted = DateTime.UtcNow };

            await WriteDataElementToFile(dataElement, org, app, instanceOwnerPartyId, cancellationToken);

            return true;
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

            return true;
        }
    }

    public async Task<Stream> GetBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        return new MemoryStream(
            await GetDataBytes(
                org,
                app,
                instanceOwnerPartyId,
                instanceGuid,
                dataId,
                authenticationMethod,
                cancellationToken
            )
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
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        string dataPath = TestData.GetDataBlobPath(org, app, instanceOwnerPartyId, instanceGuid, dataId);

        return await File.ReadAllBytesAsync(dataPath, cancellationToken);
    }

    public async Task<List<AttachmentList>> GetBinaryDataList(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
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

    public async Task<object> GetFormData(
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
        var dataElementPath = TestData.GetDataElementPath(org, app, instanceOwnerPartyId, instanceGuid, dataId);
        DataElement dataElement = await InstanceClientMockSi.ReadJsonFile<DataElement>(
            dataElementPath,
            cancellationToken
        );
        var application = await _appMetadata.GetApplicationMetadata();
        var dataType =
            application.DataTypes.Find(d => d.Id == dataElement?.DataType)
            ?? throw new InvalidOperationException(
                $"Data type {dataElement?.DataType} not found in applicationmetadata.json"
            );

        string dataPath = TestData.GetDataBlobPath(org, app, instanceOwnerPartyId, instanceGuid, dataId);
        var dataBytes = await File.ReadAllBytesAsync(dataPath, cancellationToken);

        var formData = _modelSerialization.DeserializeFromStorage(dataBytes, dataType);

        return formData ?? throw new Exception("Unable to deserialize form data");
    }

    public async Task<DataElement> InsertFormData<T>(
        Instance instance,
        string dataTypeString,
        T dataToSerialize,
        Type type,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
        where T : notnull
    {
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        string app = instance.AppId.Split("/")[1];
        string org = instance.Org;
        int instanceOwnerId = int.Parse(instance.InstanceOwner.PartyId);

        return await InsertFormData(
            dataToSerialize,
            instanceGuid,
            type,
            org,
            app,
            instanceOwnerId,
            dataTypeString,
            authenticationMethod,
            cancellationToken
        );
    }

    public async Task<DataElement> InsertFormData<T>(
        T dataToSerialize,
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        string dataTypeString,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
        where T : notnull
    {
        var application = await _appMetadata.GetApplicationMetadata();
        var dataType =
            application.DataTypes.Find(d => d.Id == dataTypeString)
            ?? throw new InvalidOperationException($"Data type {dataTypeString} not found in applicationmetadata.json");
        Guid dataGuid = Guid.NewGuid();
        string dataPath = TestData.GetDataDirectory(org, app, instanceOwnerPartyId, instanceGuid);
        var (serializedBytes, contentType) = _modelSerialization.SerializeToStorage(dataToSerialize, dataType);

        DataElement dataElement = new()
        {
            Id = dataGuid.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = dataTypeString,
            ContentType = contentType,
        };

        Directory.CreateDirectory(Path.Join(dataPath, "blob"));

        await File.WriteAllBytesAsync(
            Path.Join(dataPath, "blob", dataGuid.ToString()),
            serializedBytes.ToArray(),
            cancellationToken
        );

        await WriteDataElementToFile(dataElement, org, app, instanceOwnerPartyId, cancellationToken);

        return dataElement;
    }

    public async Task<DataElement> UpdateData<T>(
        T dataToSerialize,
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid dataGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
        where T : notnull
    {
        ArgumentNullException.ThrowIfNull(dataToSerialize);
        string dataPath = TestData.GetDataDirectory(org, app, instanceOwnerPartyId, instanceGuid);

        DataElement dataElement =
            await GetDataElement(org, app, instanceOwnerPartyId, instanceGuid, dataGuid.ToString(), cancellationToken)
            ?? throw new Exception(
                $"Unable to find data element for org: {org}/{app} party: {instanceOwnerPartyId} instance: {instanceGuid} data: {dataGuid}"
            );

        var application = await _appMetadata.GetApplicationMetadata();
        var dataType =
            application.DataTypes.Find(d => d.Id == dataElement.DataType)
            ?? throw new InvalidOperationException(
                $"Data type {dataElement.DataType} not found in applicationmetadata.json"
            );

        Directory.CreateDirectory(dataPath + @"blob");

        var (serializedBytes, contentType) = _modelSerialization.SerializeToStorage(dataToSerialize, dataType);

        Debug.Assert(contentType == dataElement.ContentType, "Content type should not change when updating data");
        await File.WriteAllBytesAsync(
            Path.Join(dataPath, "blob", dataGuid.ToString()),
            serializedBytes.ToArray(),
            cancellationToken
        );

        dataElement.LastChanged = DateTime.UtcNow;
        dataElement.Size = serializedBytes.Length;
        await WriteDataElementToFile(dataElement, org, app, instanceOwnerPartyId, cancellationToken);

        return dataElement;
    }

    public async Task<DataElement> InsertBinaryData(
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
        Guid dataGuid = Guid.NewGuid();
        string dataPath = TestData.GetDataDirectory(org, app, instanceOwnerPartyId, instanceGuid);
        DataElement dataElement = new()
        {
            Id = dataGuid.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = dataType,
            ContentType = request.ContentType,
        };

        if (!Directory.Exists(Path.GetDirectoryName(dataPath)))
        {
            var directory =
                Path.GetDirectoryName(dataPath)
                ?? throw new Exception($"Unable to get directory name from path {dataPath}");

            Directory.CreateDirectory(directory);
        }

        Directory.CreateDirectory(Path.Join(dataPath, "blob"));

        using var stream = new MemoryStream();
        await request.Body.CopyToAsync(stream, cancellationToken);

        var fileData = stream.ToArray();
        await File.WriteAllBytesAsync(Path.Join(dataPath, "blob", dataGuid.ToString()), fileData, cancellationToken);

        dataElement.Size = fileData.Length;

        await WriteDataElementToFile(dataElement, org, app, instanceOwnerPartyId, cancellationToken);

        return dataElement;
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

        Directory.CreateDirectory(dataPath + @"blob");

        using var memoryStream = new MemoryStream();
        stream.Seek(0, SeekOrigin.Begin);
        await stream.CopyToAsync(memoryStream, cancellationToken);

        var fileData = memoryStream.ToArray();
        await File.WriteAllBytesAsync(Path.Join(dataPath, "blob", dataGuid.ToString()), fileData, cancellationToken);

        dataElement.Size = fileData.Length;

        await WriteDataElementToFile(dataElement, org, app, instanceOwnerId, cancellationToken);

        return dataElement;
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

        return dataElement;
    }

    public async Task<DataElement> LockDataElement(
        InstanceIdentifier instanceIdentifier,
        Guid dataGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        // 🤬The signature does not take org/app,
        // but our test data is organized by org/app.
        (string org, string app) = TestData.GetInstanceOrgApp(instanceIdentifier);
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
        // 🤬The signature does not take org/app,
        // but our test data is organized by org/app.
        (string org, string app) = TestData.GetInstanceOrgApp(instanceIdentifier);
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
            DataElement dataElement = await InstanceClientMockSi.ReadJsonFile<DataElement>(
                Path.Join(path, file),
                cancellationToken
            );

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
