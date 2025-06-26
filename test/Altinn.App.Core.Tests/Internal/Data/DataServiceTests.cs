using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Data;

public class DataServiceTests
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly Mock<IDataClient> _mockDataClient;
    private readonly Mock<IAppMetadata> _mockAppMetadata;
    private readonly DataService _dataService;

    public DataServiceTests()
    {
        _mockDataClient = new Mock<IDataClient>();
        _mockAppMetadata = new Mock<IAppMetadata>();
        _dataService = new DataService(_mockDataClient.Object, _mockAppMetadata.Object);
    }

    [Fact]
    public async Task GetByType_ReturnsCorrectDataElementAndModel_WhenDataElementExists()
    {
        // Arrange
        Instance instance = CreateInstance();
        InstanceIdentifier instanceIdentifier = new(instance);
        const string dataType = "dataType";
        instance.Data = [new DataElement { DataType = dataType, Id = Guid.NewGuid().ToString() }];

        ApplicationMetadata applicationMetadata = CreateAppMetadata(instance);

        TestModel expectedModel = new();
        using var referenceStream = new MemoryStream();
        await JsonSerializer.SerializeAsync(referenceStream, expectedModel, _jsonSerializerOptions);
        referenceStream.Position = 0;

        _mockDataClient
            .Setup(dc =>
                dc.GetBinaryData(
                    applicationMetadata.AppIdentifier.Org,
                    applicationMetadata.AppIdentifier.App,
                    instanceIdentifier.InstanceOwnerPartyId,
                    instanceIdentifier.InstanceGuid,
                    new Guid(instance.Data.First().Id)
                )
            )
            .ReturnsAsync(referenceStream);

        _mockAppMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        // Act
        (Guid dataElementId, TestModel? model) = await _dataService.GetByType<TestModel>(instance, dataType);

        // Assert
        Assert.Equal(instance.Data.First().Id, dataElementId.ToString());
        Assert.Equivalent(expectedModel, model);
    }

    [Fact]
    public async Task GetByType_ReturnsEmptyGuidAndNullModel_WhenDataElementDoesNotExist()
    {
        // Arrange
        Instance instance = CreateInstance();
        const string dataType = "dataType";
        const string otherType = "otherType";
        instance.Data = [new DataElement() { DataType = otherType, Id = Guid.NewGuid().ToString() }];

        // Act
        (Guid dataElementId, TestModel? model) = await _dataService.GetByType<TestModel>(instance, dataType);

        // Assert
        Assert.Equal(Guid.Empty, dataElementId);
        Assert.Null(model);
    }

    [Fact]
    public async Task GetById_ReturnsCorrectModel_WhenDataElementExists()
    {
        // Arrange
        var expectedDataId = Guid.NewGuid();
        Instance instance = CreateInstance();
        InstanceIdentifier instanceIdentifier = new(instance);
        instance.Data = [new DataElement { Id = expectedDataId.ToString() }];

        ApplicationMetadata applicationMetadata = CreateAppMetadata(instance);

        var expectedModel = new TestModel();
        using var referenceStream = new MemoryStream();
        await JsonSerializer.SerializeAsync(referenceStream, expectedModel, _jsonSerializerOptions);
        referenceStream.Position = 0;

        _mockDataClient
            .Setup(dc =>
                dc.GetBinaryData(
                    applicationMetadata.AppIdentifier.Org,
                    applicationMetadata.AppIdentifier.App,
                    instanceIdentifier.InstanceOwnerPartyId,
                    instanceIdentifier.InstanceGuid,
                    expectedDataId
                )
            )
            .ReturnsAsync(referenceStream);

        _mockAppMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        // Act
        var model = await _dataService.GetById<TestModel>(instance, expectedDataId);

        // Assert
        Assert.Equivalent(expectedModel, model);
    }

    [Fact]
    public async Task GetById_ThrowsArgumentException_WhenDataElementDoesNotExist()
    {
        // Arrange
        Instance instance = CreateInstance();
        instance.Data = [new DataElement { Id = Guid.NewGuid().ToString() }];

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            _dataService.GetById<TestModel>(instance, Guid.NewGuid())
        );
    }

    [Fact]
    public async Task InsertJsonObject_ReturnsExpectedResult()
    {
        // Arrange
        Instance instance = CreateInstance();
        InstanceIdentifier instanceIdentifier = new(instance);
        const string dataTypeId = "dataTypeId";
        object data = new();
        DataElement expectedDataElement = new();

        _mockDataClient
            .Setup(x =>
                x.InsertBinaryData(
                    instanceIdentifier.ToString(),
                    dataTypeId,
                    "application/json",
                    dataTypeId + ".json",
                    It.IsAny<Stream>(),
                    null
                )
            )
            .ReturnsAsync(expectedDataElement);

        // Act
        DataElement result = await _dataService.InsertJsonObject(instanceIdentifier, dataTypeId, data);

        // Assert
        Assert.Equivalent(expectedDataElement, result);
    }

    [Fact]
    public async Task UpdateJsonObject_ReturnsExpectedResult()
    {
        // Arrange
        Instance instance = CreateInstance();
        InstanceIdentifier instanceIdentifier = new(instance);
        const string dataTypeId = "dataTypeId";
        var dataElementId = Guid.NewGuid();
        object data = new();
        DataElement expectedDataElement = new();

        _mockDataClient
            .Setup(x =>
                x.UpdateBinaryData(
                    instanceIdentifier,
                    "application/json",
                    dataTypeId + ".json",
                    dataElementId,
                    It.IsAny<Stream>()
                )
            )
            .ReturnsAsync(expectedDataElement);

        // Act
        DataElement result = await _dataService.UpdateJsonObject(instanceIdentifier, dataTypeId, dataElementId, data);

        // Assert
        Assert.Equivalent(expectedDataElement, result);
    }

    private static Instance CreateInstance()
    {
        return new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            InstanceOwner = new InstanceOwner { PartyId = "123" },
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = "dataTask", ElementId = "Task_1" },
            },
        };
    }

    private static ApplicationMetadata CreateAppMetadata(Instance instance)
    {
        return new ApplicationMetadata(instance.AppId)
        {
            CopyInstanceSettings = new CopyInstanceSettings { Enabled = true },
        };
    }
}

public class TestModel { }
