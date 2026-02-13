using System.Net;
using System.Xml.Serialization;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.Storage;

public class DataClientTestsXmlJson
{
    private const string Org = "org";
    private const string App = "app";
    private const int InstanceOwnerPartyId = 123456;
    private static readonly Guid _instanceId = Guid.Parse("a467c267-2122-41a4-b78a-ae6f94aa7ff7");

    private readonly MockedServiceCollection _mockedServiceCollection = new();
    private readonly Instance _instance;

    public DataClientTestsXmlJson(ITestOutputHelper outputHelper)
    {
        _mockedServiceCollection.OutputHelper = outputHelper;
        _mockedServiceCollection.TryAddCommonServices();

        _mockedServiceCollection.AddDataType<TestDataJson>(
            dataTypeId: "jsonDataType",
            allowedContentTypes: ["application/json"]
        );
        _mockedServiceCollection.AddDataType<TestDataXml>(
            dataTypeId: "xmlDataType",
            allowedContentTypes: ["application/xml"]
        );
        _mockedServiceCollection.AddDataType<TestDataXmlJson>(
            dataTypeId: "xmlDefaultDataType",
            allowedContentTypes: ["application/xml", "application/json"]
        );
        _mockedServiceCollection.AddDataType<TestDataJsonXml>(
            dataTypeId: "jsonDefaultDataType",
            allowedContentTypes: ["application/json", "application/xml"]
        );
        _instance = new Instance
        {
            Id = $"{InstanceOwnerPartyId}/{_instanceId}",
            Org = Org,
            AppId = $"{Org}/{App}",
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
            Data = [],
        };
        _mockedServiceCollection.Storage.AddInstance(_instance);
    }

    public static TheoryData<string, string> DataTypes =>
        new()
        {
            { "jsonDataType", "application/json" },
            { "xmlDataType", "application/xml" },
            { "xmlDefaultDataType", "application/xml" },
            { "jsonDefaultDataType", "application/json" },
        };

    [Theory]
    [MemberData(nameof(DataTypes))]
    public async Task TestInsertDataAlternatives(string dataType, string requestContentType)
    {
        TestData data = GetDataForType(dataType);
        await using var serviceProvider = _mockedServiceCollection.BuildServiceProvider();
        var dataClient = serviceProvider.GetRequiredService<IDataClient>();

        // New endpoint with instance
        var elementNew = await dataClient.InsertFormData(_instance, dataType, data);

        Assert.Equal(dataType, elementNew.DataType);
        Assert.Equal(requestContentType, elementNew.ContentType);

        // Obsolete endpoint with instance and type
        var elementInstanceObsolete = await dataClient.InsertFormData(_instance, dataType, data, data.GetType());

        Assert.Equal(dataType, elementInstanceObsolete.DataType);
        Assert.Equal(requestContentType, elementInstanceObsolete.ContentType);

        // Obsolete endpoint with instance and type
        var elementObsoleteType = await dataClient.InsertFormData(_instance, dataType, data, data.GetType());

        Assert.Equal(dataType, elementObsoleteType.DataType);
        Assert.Equal(requestContentType, elementObsoleteType.ContentType);

        // Obsolete endpoint without instance
        var elementObsolete = await dataClient.InsertFormData(
            data,
            _instanceId,
            data.GetType(),
            Org,
            App,
            InstanceOwnerPartyId,
            dataType
        );
        Assert.Equal(dataType, elementObsolete.DataType);
        Assert.Equal(requestContentType, elementObsolete.ContentType);

        // Verify that both requests were made correctly
        Assert.Equal(4, _mockedServiceCollection.Storage.RequestsResponses.Count);

        // Verify content of requests
        Assert.All(
            _mockedServiceCollection.Storage.RequestsResponses,
            requestResponse =>
            {
                Assert.Equal(HttpMethod.Post, requestResponse.RequestMethod);
                Assert.Equal(
                    $"/storage/api/v1/instances/{InstanceOwnerPartyId}/{_instanceId}/data?dataType={dataType}",
                    requestResponse.RequestUrl?.PathAndQuery
                );
                Assert.Equal(
                    requestContentType,
                    requestResponse.RequestContentHeaders?.GetValues("Content-Type").Single()
                );
                if (requestContentType == "application/json")
                {
                    Assert.Equal("""{"name":"ivar","age":36}""", requestResponse.RequestBody);
                }
                else if (requestContentType == "application/xml")
                {
                    Assert.Equal(
                        """
                        <?xml version="1.0" encoding="utf-8"?>
                        <TestData xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                            <Name>ivar</Name>
                            <Age>36</Age>
                        </TestData>
                        """.Replace("\r\n", "", StringComparison.Ordinal).Replace("  ", "", StringComparison.Ordinal),
                        requestResponse.RequestBody
                    );
                }
            }
        );

        _mockedServiceCollection.VerifyMocks();
    }

    [Fact]
    public async Task TestObsoleteInsertFormData_TestTypeMismatch()
    {
        await using var serviceProvider = _mockedServiceCollection.BuildServiceProvider();
        var dataClient = serviceProvider.GetRequiredService<IDataClient>();
        var act = async () =>
            await dataClient.InsertFormData(
                _instance,
                "jsonDataType",
                new TestDataXml { Name = "ivar", Age = 36 },
                typeof(TestDataJson)
            );
        var exception = await Assert.ThrowsAsync<ArgumentException>(act);
        Assert.Equal(
            $"The provided type {typeof(TestDataJson).FullName} does not match the type of dataToSerialize {typeof(TestDataXml).FullName}",
            exception.Message
        );

        var act2 = async () =>
            await dataClient.InsertFormData(
                new TestDataXml { Name = "ivar", Age = 36 },
                _instanceId,
                typeof(TestDataJson),
                Org,
                App,
                InstanceOwnerPartyId,
                "jsonDataType"
            );
        var exception2 = await Assert.ThrowsAsync<ArgumentException>(act2);
        Assert.Equal(
            $"The provided type {typeof(TestDataJson).FullName} does not match the type of dataToSerialize {typeof(TestDataXml).FullName}",
            exception2.Message
        );

        Assert.Empty(_mockedServiceCollection.Storage.RequestsResponses);
    }

    [Theory]
    [MemberData(nameof(DataTypes))]
    public async Task TestUpdateDataAlternatives(string dataType, string requestContentType)
    {
        TestData data = GetDataForType(dataType);
        var oldElement = _mockedServiceCollection.Storage.AddData(_instance, dataType, requestContentType, []);

        await using var serviceProvider = _mockedServiceCollection.BuildServiceProvider();
        var dataClient = serviceProvider.GetRequiredService<IDataClient>();

        var actObsolete = async () =>
            await dataClient.UpdateData(
                data,
                _instanceId,
                data.GetType(),
                Org,
                App,
                InstanceOwnerPartyId,
                Guid.Parse(oldElement.Id)
            );

        var actObsoleteGeneric = async () =>
            await dataClient.UpdateData<TestData>(
                data,
                _instanceId,
                data.GetType(),
                Org,
                App,
                InstanceOwnerPartyId,
                Guid.Parse(oldElement.Id)
            );

        var actNew = async () => await dataClient.UpdateFormData(_instance, data, oldElement);

        if (dataType == "xmlDataType")
        {
            var newElement = await actObsolete();
            Assert.Equal(dataType, newElement.DataType);
            Assert.Equal(requestContentType, newElement.ContentType);
            Assert.Equal(oldElement.Id, newElement.Id);
            var obsoleteGenericElement = await actObsoleteGeneric();
            Assert.Equal(dataType, obsoleteGenericElement.DataType);
            Assert.Equal(requestContentType, obsoleteGenericElement.ContentType);
            Assert.Equal(oldElement.Id, obsoleteGenericElement.Id);
            var updatedElement = await actNew();
            Assert.Equal(dataType, updatedElement.DataType);
            Assert.Equal(requestContentType, updatedElement.ContentType);
            Assert.Equal(oldElement.Id, updatedElement.Id);

            Assert.All(
                _mockedServiceCollection.Storage.RequestsResponses,
                requestResponse =>
                {
                    Assert.Equal(HttpMethod.Put, requestResponse.RequestMethod);
                    Assert.Equal(
                        $"/storage/api/v1/instances/{InstanceOwnerPartyId}/{_instanceId}/data/{oldElement.Id}",
                        requestResponse.RequestUrl?.PathAndQuery
                    );
                    Assert.Equal(
                        requestContentType,
                        requestResponse.RequestContentHeaders?.GetValues("Content-Type").Single()
                    );

                    Assert.Equal(
                        """
                        <?xml version="1.0" encoding="utf-8"?>
                        <TestData xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                            <Name>ivar</Name>
                            <Age>36</Age>
                        </TestData>
                        """.Replace("\r\n", "", StringComparison.Ordinal).Replace("  ", "", StringComparison.Ordinal),
                        requestResponse.RequestBody
                    );
                }
            );
            _mockedServiceCollection.VerifyMocks();
        }
        else
        {
            var obsoleteException = await Assert.ThrowsAsync<InvalidOperationException>(actObsolete);
            Assert.Equal(
                $"The data type {data.GetType().FullName} is configured to use JSON serialization and must use UpdateFormData method instead",
                obsoleteException.Message
            );
            Assert.Empty(_mockedServiceCollection.Storage.RequestsResponses);

            var obsoleteGenericException = await Assert.ThrowsAsync<InvalidOperationException>(actObsoleteGeneric);
            Assert.Equal(
                $"The data type {data.GetType().FullName} is configured to use JSON serialization and must use UpdateFormData method instead",
                obsoleteGenericException.Message
            );
            Assert.Empty(_mockedServiceCollection.Storage.RequestsResponses);

            var updatedElement = await actNew();
            Assert.Equal(dataType, updatedElement.DataType);
            Assert.Equal(requestContentType, updatedElement.ContentType);
            Assert.Equal(oldElement.Id, updatedElement.Id);
            var request = Assert.Single(_mockedServiceCollection.Storage.RequestsResponses);
            Assert.Equal(HttpMethod.Put, request.RequestMethod);
            Assert.Equal(
                $"/storage/api/v1/instances/{InstanceOwnerPartyId}/{_instanceId}/data/{oldElement.Id}",
                request.RequestUrl?.PathAndQuery
            );
            Assert.Equal(requestContentType, request.RequestContentHeaders?.GetValues("Content-Type").Single());
            if (requestContentType == "application/json")
            {
                Assert.Equal("""{"name":"ivar","age":36}""", request.RequestBody);
            }
            else if (requestContentType == "application/xml")
            {
                Assert.Equal(
                    """
                    <?xml version="1.0" encoding="utf-8"?>
                    <TestData xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                        <Name>ivar</Name>
                        <Age>36</Age>
                    </TestData>
                    """.Replace("\r\n", "", StringComparison.Ordinal).Replace("  ", "", StringComparison.Ordinal),
                    request.RequestBody
                );
            }
        }
    }

    [Fact]
    public async Task TestObsoleteUpdateData_TestTypeMismatch()
    {
        var oldElement = _mockedServiceCollection.Storage.AddData(_instance, "jsonDataType", "application/json", []);

        await using var serviceProvider = _mockedServiceCollection.BuildServiceProvider();
        var dataClient = serviceProvider.GetRequiredService<IDataClient>();
        var act = async () =>
            await dataClient.UpdateData(
                new TestDataXml { Name = "ivar", Age = 36 },
                _instanceId,
                typeof(TestDataJson),
                Org,
                App,
                InstanceOwnerPartyId,
                Guid.Parse(oldElement.Id)
            );
        var exception = await Assert.ThrowsAsync<ArgumentException>(act);
        Assert.Equal(
            $"The provided type {typeof(TestDataJson).FullName} does not match the type of dataToSerialize {typeof(TestDataXml).FullName}",
            exception.Message
        );

        Assert.Empty(_mockedServiceCollection.Storage.RequestsResponses);
    }

    [Theory]
    [MemberData(nameof(DataTypes))]
    public async Task TestGetFormData(string dataType, string storedContentType)
    {
        TestData data = GetDataForType(dataType);
        await using var serviceProvider = _mockedServiceCollection.BuildServiceProvider();
        var serializationService = serviceProvider.GetRequiredService<ModelSerializationService>();
        _mockedServiceCollection.Storage.AddData(
            _instance,
            dataType,
            storedContentType,
            storedContentType switch
            {
                "application/json" => serializationService.SerializeToJson(data).ToArray(),
                "application/xml" => serializationService.SerializeToXml(data).ToArray(),
                _ => throw new NotSupportedException($"Content type {storedContentType} not supported"),
            }
        );
        var element = _instance.Data.First(d => d.DataType == dataType);
        Assert.NotNull(element);

        var dataClient = serviceProvider.GetRequiredService<IDataClient>();

        // Verify Most up-to-date method
        var retrievedData = await dataClient.GetFormData(_instance, element);
        Assert.Equivalent(data, retrievedData);

        // Verify Obsolete method
        async Task<object> RetrievedDataObsolete() =>
            await dataClient.GetFormData(
                _instanceId,
                data.GetType(),
                Org,
                App,
                InstanceOwnerPartyId,
                Guid.Parse(element.Id)
            );
        if (dataType == "xmlDataType")
        {
            var result = await RetrievedDataObsolete();
            Assert.Equivalent(data, result);
        }
        else
        {
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(RetrievedDataObsolete);
            Assert.Equal(
                $"The data type {data.GetType().FullName} is configured to use JSON serialization and must use GetFormData with dataElement argument instead",
                exception.Message
            );
        }

        _mockedServiceCollection.VerifyMocks();
    }

    [Fact]
    public async Task IDataClientGet_ThrowsPlatformException()
    {
        var wrongElementId = Guid.NewGuid();
        var wrongInstanceId = Guid.NewGuid();
        var wrongDataElement = new DataElement()
        {
            Id = wrongElementId.ToString(),
            InstanceGuid = wrongInstanceId.ToString(),
            DataType = "jsonDataType",
            ContentType = "application/json",
        };
        await using var serviceProvider = _mockedServiceCollection.BuildServiceProvider();
        var dataClient = serviceProvider.GetRequiredService<IDataClient>();

        // Test GetFromData method with non existing data id
        await Assert.ThrowsAsync<PlatformHttpException>(() =>
            dataClient.GetFormData(_instanceId, typeof(TestDataXml), Org, App, InstanceOwnerPartyId, wrongElementId)
        );
        await Assert.ThrowsAsync<PlatformHttpException>(() => dataClient.GetFormData(_instance, wrongDataElement));

        await Assert.ThrowsAsync<PlatformHttpException>(() =>
            dataClient.GetFormData<TestData>(_instance, wrongDataElement)
        );

        Assert.All(
            _mockedServiceCollection.Storage.RequestsResponses,
            requestResponse =>
            {
                Assert.Equal(HttpStatusCode.NotFound, requestResponse.ResponseStatusCode);
            }
        );
    }

    [Fact]
    public async Task IDataClientUpdate_ThrowsPlatformException()
    {
        var wrongElementId = Guid.NewGuid();
        var wrongInstanceId = Guid.NewGuid();
        await using var serviceProvider = _mockedServiceCollection.BuildServiceProvider();
        var dataClient = serviceProvider.GetRequiredService<IDataClient>();
        await Assert.ThrowsAsync<PlatformHttpException>(() =>
            dataClient.UpdateData(
                new TestDataXml { Name = "ivar", Age = 36 },
                _instanceId,
                typeof(TestDataXml),
                Org,
                App,
                InstanceOwnerPartyId,
                wrongElementId
            )
        );
        await Assert.ThrowsAsync<PlatformHttpException>(() =>
            dataClient.InsertFormData(
                new TestDataJson { Name = "ivar", Age = 36 },
                wrongInstanceId,
                typeof(TestDataJson),
                Org,
                App,
                InstanceOwnerPartyId,
                "jsonDataType"
            )
        );

        await Assert.ThrowsAsync<PlatformHttpException>(() =>
            dataClient.GetDataBytes(Org, App, InstanceOwnerPartyId, _instanceId, wrongElementId)
        );

        _mockedServiceCollection.VerifyMocks();
    }

    // [Theory]
    // [MemberData(nameof(DataTypes))]
    // public async Task TestUpdateFormData(string dataType, string requestContentType)
    // {
    //     var dataElement = new DataElement
    //     {
    //         Id = _dataGuid.ToString(),
    //         InstanceGuid = _instanceId.ToString(),
    //         ContentType = requestContentType,
    //         DataType = dataType,
    //     };
    //     var instance = new Instance
    //     {
    //         Id = $"{InstanceOwnerPartyId}/{_instanceId}",
    //         InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
    //         Data = [dataElement],
    //     };

    //     _fakeResponses.Add(
    //         new FakeResponse(
    //             HttpMethod.Put,
    //             $"{ApiStorageEndpoint}instances/{InstanceOwnerPartyId}/{_instanceId}/data/{_dataGuid}",
    //             requestContentType,
    //             HttpStatusCode.OK,
    //             "application/json",
    //             JsonSerializer.Serialize(dataElement)
    //         )
    //     );
    //     // The tests share the same ClassRef, and the compatibility check will fail if any type supports json
    //     _appMetadata.DataTypes.RemoveAll(d => d.Id != dataType);

    //     await using var serviceProvider = _services.BuildServiceProvider();
    //     var dataClient = serviceProvider.GetRequiredService<IDataClient>();
    //     var element = await dataClient.UpdateFormData(instance, new TestData { Name = "ivar", Age = 36 }, dataElement);

    //     await VerifyMocks(element, dataType);
    // }

    // [Theory]
    // [MemberData(nameof(DataTypes))]
    // public async Task TestObsoleteGetFormData(string dataType, string storedContentType)
    // {
    //     var storedContent = storedContentType switch
    //     {
    //         "application/json" => """{"Name":"ivar","Age":36}""",
    //         "application/xml" => """
    //             <?xml version="1.0" encoding="utf-8" standalone="no"?>
    //             <TestData xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    //                 <Name>ivar</Name>
    //                 <Age>36</Age>
    //             </TestData>
    //             """,
    //         _ => throw new NotSupportedException($"Content type {storedContentType} not supported"),
    //     };
    //     _fakeResponses.Add(
    //         new FakeResponse(
    //             HttpMethod.Get,
    //             $"{ApiStorageEndpoint}instances/{InstanceOwnerPartyId}/{_instanceId}/data/{_dataGuid}",
    //             null,
    //             HttpStatusCode.OK,
    //             storedContentType,
    //             storedContent
    //         )
    //     );
    //     // The tests share the same ClassRef, and the compatibility check will fail if any type supports json
    //     _appMetadata.DataTypes.RemoveAll(d => d.Id != dataType);

    //     await using var serviceProvider = _services.BuildServiceProvider();
    //     var dataClient = serviceProvider.GetRequiredService<IDataClient>();
    //     var act = async () =>
    //         await dataClient.GetFormData(_instanceId, typeof(TestData), Org, App, InstanceOwnerPartyId, _dataGuid);
    //     if (dataType == "xmlDataType")
    //     {
    //         var data = await act();
    //         var typedData = Assert.IsType<TestData>(data);
    //         Assert.Equal("ivar", typedData.Name);
    //         Assert.Equal(36, typedData.Age);
    //         await VerifyMocks(data, dataType);
    //     }
    //     else
    //     {
    //         await Assert.ThrowsAsync<InvalidOperationException>(act);
    //     }
    // }

    // [Theory]
    // [MemberData(nameof(DataTypes))]
    // public async Task TestGetFormData(string dataType, string storedContentType)
    // {
    //     var dataElement = new DataElement()
    //     {
    //         Id = _dataGuid.ToString(),
    //         InstanceGuid = _instanceId.ToString(),
    //         ContentType = storedContentType,
    //         DataType = dataType,
    //     };
    //     var instance = new Instance()
    //     {
    //         Id = $"{InstanceOwnerPartyId}/{_instanceId}",
    //         InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
    //         Data = [dataElement],
    //     };
    //     var storedContent = storedContentType switch
    //     {
    //         "application/json" => """{"Name":"ivar","Age":36}""",
    //         "application/xml" => """
    //             <?xml version="1.0" encoding="utf-8" standalone="no"?>
    //             <TestData xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    //                 <Name>ivar</Name>
    //                 <Age>36</Age>
    //             </TestData>
    //             """,
    //         _ => throw new NotSupportedException($"Content type {storedContentType} not supported"),
    //     };
    //     _fakeResponses.Add(
    //         new FakeResponse(
    //             HttpMethod.Get,
    //             $"{ApiStorageEndpoint}instances/{InstanceOwnerPartyId}/{_instanceId}/data/{_dataGuid}",
    //             null,
    //             HttpStatusCode.OK,
    //             storedContentType,
    //             storedContent
    //         )
    //     );
    //     // The tests share the same ClassRef, and the compatibility check will fail if any type supports json
    //     _appMetadata.DataTypes.RemoveAll(d => d.Id != dataType);

    //     await using var serviceProvider = _services.BuildServiceProvider();
    //     var dataClient = serviceProvider.GetRequiredService<IDataClient>();
    //     var data = await dataClient.GetFormData(instance, dataElement);
    //     var typedData = Assert.IsType<TestData>(data);
    //     Assert.Equal("ivar", typedData.Name);
    //     Assert.Equal(36, typedData.Age);
    //     await VerifyMocks(data, dataType);
    // }

    // [Theory]
    // [MemberData(nameof(DataTypes))]
    // public async Task TestGetFormDataExtension(string dataType, string storedContentType)
    // {
    //     var dataElement = new DataElement()
    //     {
    //         Id = _dataGuid.ToString(),
    //         InstanceGuid = _instanceId.ToString(),
    //         ContentType = storedContentType,
    //         DataType = dataType,
    //     };
    //     var instance = new Instance()
    //     {
    //         Id = $"{InstanceOwnerPartyId}/{_instanceId}",
    //         InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
    //         Data = [dataElement],
    //     };
    //     var storedContent = storedContentType switch
    //     {
    //         "application/json" => """{"Name":"ivar","Age":36}""",
    //         "application/xml" => """
    //             <?xml version="1.0" encoding="utf-8" standalone="no"?>
    //             <TestData xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    //                 <Name>ivar</Name>
    //                 <Age>36</Age>
    //             </TestData>
    //             """,
    //         _ => throw new NotSupportedException($"Content type {storedContentType} not supported"),
    //     };
    //     _fakeResponses.Add(
    //         new FakeResponse(
    //             HttpMethod.Get,
    //             $"{ApiStorageEndpoint}instances/{InstanceOwnerPartyId}/{_instanceId}/data/{_dataGuid}",
    //             null,
    //             HttpStatusCode.OK,
    //             storedContentType,
    //             storedContent
    //         )
    //     );
    //     // The tests share the same ClassRef, and the compatibility check will fail if any type supports json
    //     _appMetadata.DataTypes.RemoveAll(d => d.Id != dataType);

    //     await using var serviceProvider = _services.BuildServiceProvider();
    //     var dataClient = serviceProvider.GetRequiredService<IDataClient>();
    //     TestData typedData = await dataClient.GetFormData<TestData>(instance, dataElement);
    //     Assert.Equal("ivar", typedData.Name);
    //     Assert.Equal(36, typedData.Age);

    //     // Get code coverage on invalid cast
    //     await Assert.ThrowsAsync<InvalidCastException>(async () =>
    //         await dataClient.GetFormData<DataClientTestsDataTypes>(instance, dataElement)
    //     );
    //     await VerifyMocks(typedData, dataType);
    // }

    // [Fact]
    // public async Task TestGetBinaryData_AllVariants()
    // {
    //     var content = "binary-content";
    //     _fakeResponses.Add(
    //         new(
    //             HttpMethod.Get,
    //             $"{ApiStorageEndpoint}instances/{InstanceOwnerPartyId}/{_instanceId}/data/{_dataGuid}",
    //             null,
    //             HttpStatusCode.OK,
    //             "application/octet-stream",
    //             content
    //         )
    //     );
    //     await using var serviceProvider = _services.BuildServiceProvider();
    //     var dataClient = serviceProvider.GetRequiredService<IDataClient>();

    //     // Test Obsolete byte[] method signature
    //     var obsoleteByteArray = await dataClient.GetDataBytes(Org, App, InstanceOwnerPartyId, _instanceId, _dataGuid);
    //     var obsoleteByteArrayContent = Encoding.UTF8.GetString(obsoleteByteArray);
    //     Assert.Equal(content, obsoleteByteArrayContent);
    //     // Test current byte[] method signature
    //     var byteArray = await dataClient.GetDataBytes(InstanceOwnerPartyId, _instanceId, _dataGuid);
    //     var byteArrayContent = Encoding.UTF8.GetString(byteArray);
    //     Assert.Equal(content, byteArrayContent);
    //     // Test obsolete method signature
    //     using (var stream = await dataClient.GetBinaryData(Org, App, InstanceOwnerPartyId, _instanceId, _dataGuid))
    //     {
    //         var bytes = new byte[stream.Length];
    //         await stream.ReadExactlyAsync(bytes, 0, bytes.Length);
    //         var resultContent = Encoding.UTF8.GetString(bytes);
    //         Assert.Equal(content, resultContent);
    //     }
    //     // Test current method signature
    //     using (var stream = await dataClient.GetBinaryData(InstanceOwnerPartyId, _instanceId, _dataGuid))
    //     {
    //         var bytes = new byte[stream.Length];
    //         await stream.ReadExactlyAsync(bytes, 0, bytes.Length);
    //         var resultContent = Encoding.UTF8.GetString(bytes);
    //         Assert.Equal(content, resultContent);
    //         await VerifyMocks(resultContent, "binary");
    //     }
    // }

    // [Fact]
    // public async Task TestGetBinaryData_TeaPotResult()
    // {
    //     var content = "binary-content";
    //     _fakeResponses.Add(
    //         new(
    //             HttpMethod.Get,
    //             $"{ApiStorageEndpoint}instances/{InstanceOwnerPartyId}/{_instanceId}/data/{_dataGuid}",
    //             null,
    //             HttpStatusCode.Unused,
    //             "application/octet-stream",
    //             content
    //         )
    //     );
    //     await using var serviceProvider = _services.BuildServiceProvider();
    //     var dataClient = serviceProvider.GetRequiredService<IDataClient>();

    //     // Test obsolete method signature
    //     var exception = await Assert.ThrowsAsync<PlatformHttpException>(() =>
    //         dataClient.GetBinaryData(Org, App, InstanceOwnerPartyId, _instanceId, _dataGuid)
    //     );
    //     Assert.Equal(HttpStatusCode.Unused, exception.Response.StatusCode);

    //     // Test current method signature
    //     exception = await Assert.ThrowsAsync<PlatformHttpException>(() =>
    //         dataClient.GetBinaryData(InstanceOwnerPartyId, _instanceId, _dataGuid)
    //     );
    //     Assert.Equal(HttpStatusCode.Unused, exception.Response.StatusCode);

    //     // Test Obsolete byte[] method signature
    //     exception = await Assert.ThrowsAsync<PlatformHttpException>(() =>
    //         dataClient.GetDataBytes(Org, App, InstanceOwnerPartyId, _instanceId, _dataGuid)
    //     );
    //     Assert.Equal(HttpStatusCode.Unused, exception.Response.StatusCode);

    //     // Test current byte[] method signature
    //     exception = await Assert.ThrowsAsync<PlatformHttpException>(() =>
    //         dataClient.GetDataBytes(InstanceOwnerPartyId, _instanceId, _dataGuid)
    //     );
    //     Assert.Equal(HttpStatusCode.Unused, exception.Response.StatusCode);

    //     await VerifyMocks(content, "binary-teapot");
    // }

    // [Fact]
    // public async Task UpdateBinaryData()
    // {
    //     var instanceIdentifier = new InstanceIdentifier(InstanceOwnerPartyId, _instanceId);

    //     var dataElement = new DataElement
    //     {
    //         Id = _dataGuid.ToString(),
    //         InstanceGuid = _instanceId.ToString(),
    //         ContentType = "application/pdf",
    //         DataType = "binaryDataType",
    //     };
    //     _fakeResponses.Add(
    //         new(
    //             HttpMethod.Put,
    //             $"{ApiStorageEndpoint}instances/{InstanceOwnerPartyId}/{_instanceId}/data/{_dataGuid}",
    //             "application/pdf",
    //             HttpStatusCode.OK,
    //             "application/json",
    //             JsonSerializer.Serialize(dataElement)
    //         )
    //     );

    //     await using var serviceProvider = _services.BuildServiceProvider();
    //     var dataClient = serviceProvider.GetRequiredService<IDataClient>();
    //     var result = await dataClient.UpdateBinaryData(
    //         instanceIdentifier,
    //         "application/pdf",
    //         "filename",
    //         _dataGuid,
    //         new MemoryStream(Encoding.UTF8.GetBytes("binary-content"))
    //     );

    //     await VerifyMocks(result, "binary-teapot");
    // }

    public class TestData
    {
        public string? Name { get; set; }
        public int? Age { get; set; }
    };

    public class TestDataJson : TestData { }

    [XmlRoot("TestData")]
    public class TestDataXml : TestData { }

    public class TestDataJsonXml : TestData { }

    [XmlRoot("TestData")]
    public class TestDataXmlJson : TestData { }

    private static TestData GetDataForType(string dataType)
    {
        return dataType switch
        {
            "jsonDataType" => new TestDataJson { Name = "ivar", Age = 36 },
            "xmlDataType" => new TestDataXml { Name = "ivar", Age = 36 },
            "xmlDefaultDataType" => new TestDataXmlJson { Name = "ivar", Age = 36 },
            "jsonDefaultDataType" => new TestDataJsonXml { Name = "ivar", Age = 36 },
            _ => throw new NotSupportedException($"Data type {dataType} not supported"),
        };
    }
}
