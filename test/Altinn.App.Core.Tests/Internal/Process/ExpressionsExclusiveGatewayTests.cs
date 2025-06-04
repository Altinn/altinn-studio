using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Tests.Internal.Process.TestData;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ExpressionsExclusiveGatewayTests
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    private readonly Mock<IAppResources> _resources = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModel = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadata = new(MockBehavior.Strict);
    private readonly Mock<IDataClient> _dataClient = new(MockBehavior.Strict);
    private readonly Mock<IInstanceClient> _instanceClient = new(MockBehavior.Strict);

    private const string Org = "ttd";
    private const string App = "test";
    private const string AppId = $"{Org}/{App}";
    private const string TaskId = "Task_1";
    private const string DefaultDataTypeName = "testDefaultModel";
    private static readonly string _classRef = typeof(DummyModel).FullName!;

    public ExpressionsExclusiveGatewayTests()
    {
        _appModel.Setup(am => am.GetModelType(_classRef)).Returns(typeof(DummyModel));
    }

    [Fact]
    public async Task FilterAsync_NoExpressions_ReturnsAllFlows()
    {
        // Arrange
        List<DataType> dataTypes = new List<DataType>()
        {
            new()
            {
                Id = DefaultDataTypeName,
                AppLogic = new() { ClassRef = _classRef },
            },
        };

        var data = new DummyModel();

        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow { Id = "1", ConditionExpression = null },
            new SequenceFlow { Id = "2", ConditionExpression = null },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new() { PartyId = "500000" },
            AppId = AppId,
            Process = new() { CurrentTask = new() { ElementId = TaskId } },
            Data = new()
            {
                new() { Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf", DataType = DefaultDataTypeName },
            },
        };
        var processGatewayInformation = new ProcessGatewayInformation { Action = "confirm" };

        var (gateway, dataAccessor) = SetupExpressionsGateway(instance, dataTypes: dataTypes, formData: data);

        // Act
        var result = await gateway.FilterAsync(outgoingFlows, instance, dataAccessor, processGatewayInformation);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal("1", result[0].Id);
        Assert.Equal("2", result[1].Id);
    }

    [Fact]
    public async Task FilterAsync_Expression_filters_based_on_action()
    {
        // Arrange
        List<DataType> dataTypes = new List<DataType>()
        {
            new()
            {
                Id = DefaultDataTypeName,
                AppLogic = new() { ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.DummyModel" },
            },
        };

        var data = new DummyModel();
        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow { Id = "1", ConditionExpression = """["equals", ["gatewayAction"], "confirm"]""" },
            new SequenceFlow { Id = "2", ConditionExpression = """["equals", ["gatewayAction"], "reject"]""" },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new() { PartyId = "500000" },
            AppId = AppId,
            Process = new() { CurrentTask = new() { ElementId = TaskId } },
            Data = new()
            {
                new() { Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf", DataType = DefaultDataTypeName },
            },
        };
        var processGatewayInformation = new ProcessGatewayInformation { Action = "confirm" };

        var (gateway, dataAccessor) = SetupExpressionsGateway(instance, dataTypes, formData: data);

        // Act
        var result = await gateway.FilterAsync(outgoingFlows, instance, dataAccessor, processGatewayInformation);

        // Assert
        Assert.Single(result);
        Assert.Equal("1", result[0].Id);
    }

    [Fact]
    public async Task FilterAsync_Expression_filters_based_on_datamodel_set_by_layoutset()
    {
        // Arrange
        List<DataType> dataTypes = new List<DataType>()
        {
            new()
            {
                Id = "not-found",
                TaskId = TaskId,
                AppLogic = new() { ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.NotFound" },
            },
            new()
            {
                Id = DefaultDataTypeName,
                TaskId = TaskId,
                AppLogic = new() { ClassRef = _classRef },
            },
        };
        object formData = new DummyModel() { Amount = 1000, Submitter = "test" };
        LayoutSet layoutSet = new()
        {
            Id = "test",
            Tasks = new() { "Task_1" },
            DataType = DefaultDataTypeName,
        };
        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow { Id = "1", ConditionExpression = "[\"notEquals\", [\"dataModel\", \"Amount\"], 1000]" },
            new SequenceFlow { Id = "2", ConditionExpression = "[\"equals\", [\"dataModel\", \"Amount\"], 1000]" },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new() { PartyId = "500000" },
            AppId = AppId,
            Process = new() { CurrentTask = new() { ElementId = TaskId } },
            Data = new()
            {
                new() { Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf", DataType = DefaultDataTypeName },
            },
        };
        var processGatewayInformation = new ProcessGatewayInformation { Action = "confirm" };

        var (gateway, dataAccessor) = SetupExpressionsGateway(
            instance,
            dataTypes: dataTypes,
            layoutSet: layoutSet,
            formData: formData
        );

        // Act
        var result = await gateway.FilterAsync(outgoingFlows, instance, dataAccessor, processGatewayInformation);

        // Assert
        Assert.Single(result);
        Assert.Equal("2", result[0].Id);
    }

    [Fact]
    public async Task FilterAsync_Expression_filters_based_on_datamodel_set_by_gateway()
    {
        // Arrange
        List<DataType> dataTypes = new List<DataType>()
        {
            new()
            {
                Id = "aa",
                AppLogic = new() { ClassRef = _classRef },
            },
            new()
            {
                Id = DefaultDataTypeName,
                AppLogic = new() { ClassRef = _classRef },
            },
        };

        object formData = new DummyModel() { Amount = 1000, Submitter = "test" };
        LayoutSet layoutSet = new()
        {
            Id = "test",
            Tasks = new() { "Task_1" },
            DataType = DefaultDataTypeName,
        };
        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow { Id = "1", ConditionExpression = "[\"notEquals\", [\"dataModel\", \"Amount\"], 1000]" },
            new SequenceFlow { Id = "2", ConditionExpression = "[\"equals\", [\"dataModel\", \"Amount\"], 1000]" },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new() { PartyId = "500000" },
            AppId = "ttd/test",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
            Data = new()
            {
                new() { Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf", DataType = "aa" },
            },
        };
        var processGatewayInformation = new ProcessGatewayInformation { Action = "confirm", DataTypeId = "aa" };

        var (gateway, dataAccessor) = SetupExpressionsGateway(instance, dataTypes, layoutSet, formData);

        // Act
        var result = await gateway.FilterAsync(outgoingFlows, instance, dataAccessor, processGatewayInformation);

        // Assert
        Assert.Single(result);
        Assert.Equal("2", result[0].Id);
    }

    private (ExpressionsExclusiveGateway gateway, IInstanceDataAccessor dataAccessor) SetupExpressionsGateway(
        Instance instance,
        List<DataType> dataTypes,
        LayoutSet? layoutSet = null,
        object? formData = null
    )
    {
        _resources.Setup(r => r.GetLayoutSetForTask("Task_1")).Returns(layoutSet);
        var appMetadata = new ApplicationMetadata("ttd/test-app") { DataTypes = dataTypes };
        var modelSerializationService = new ModelSerializationService(_appModel.Object);
        _appMetadata.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(appMetadata).Verifiable(Times.AtLeastOnce);
        if (formData != null)
        {
            _dataClient
                .Setup(d =>
                    d.GetDataBytes(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<Guid>()
                    )
                )
                .ReturnsAsync(modelSerializationService.SerializeToXml(formData).ToArray());

            _appModel.Setup(am => am.GetModelType(_classRef)).Returns(formData.GetType());
        }

        var frontendSettings = Options.Create(new FrontEndSettings());

        var dataAccessor = new InstanceDataUnitOfWork(
            instance,
            _dataClient.Object,
            _instanceClient.Object,
            appMetadata,
            modelSerializationService,
            null!,
            null!,
            TaskId,
            null
        );

        var layoutStateInit = new LayoutEvaluatorStateInitializer(
            _resources.Object,
            null!,
            _appMetadata.Object,
            frontendSettings
        );
        return (new ExpressionsExclusiveGateway(layoutStateInit, _resources.Object), dataAccessor);
    }

    private static string LayoutSetsToString(LayoutSets layoutSets) =>
        JsonSerializer.Serialize(layoutSets, _jsonSerializerOptions);
}
