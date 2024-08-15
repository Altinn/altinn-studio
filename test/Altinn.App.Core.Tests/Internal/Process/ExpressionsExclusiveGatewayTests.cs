using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Tests.Internal.Process.TestData;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ExpressionsExclusiveGatewayTests
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions =
        new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true, };

    private readonly Mock<IAppResources> _resources = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModel = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadata = new(MockBehavior.Strict);
    private readonly Mock<IDataClient> _dataClient = new(MockBehavior.Strict);
    private readonly Mock<IHttpContextAccessor> _httpContextAccessor = new(MockBehavior.Strict);

    private const string Org = "ttd";
    private const string App = "test";
    private const string AppId = $"{Org}/{App}";
    private const string TaskId = "Task_1";
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
                Id = "test",
                AppLogic = new() { ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.DummyModel", }
            }
        };

        var data = new DummyModel();

        var gateway = SetupExpressionsGateway(dataTypes: dataTypes, formData: data);
        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow { Id = "1", ConditionExpression = null, },
            new SequenceFlow { Id = "2", ConditionExpression = null, },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new() { PartyId = "500000" },
            AppId = "ttd/test",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
            Data = new()
            {
                new() { Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf", DataType = "test" }
            }
        };
        var processGatewayInformation = new ProcessGatewayInformation { Action = "confirm", };

        // Act
        var result = await gateway.FilterAsync(outgoingFlows, instance, processGatewayInformation);

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
                Id = "test",
                AppLogic = new() { ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.DummyModel", }
            }
        };

        var data = new DummyModel();
        var gateway = SetupExpressionsGateway(dataTypes: dataTypes, formData: data);
        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow { Id = "1", ConditionExpression = "[\"equals\", [\"gatewayAction\"], \"confirm\"]", },
            new SequenceFlow { Id = "2", ConditionExpression = "[\"equals\", [\"gatewayAction\"], \"reject\"]", },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new() { PartyId = "500000" },
            AppId = "ttd/test",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
            Data = new()
            {
                new() { Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf", DataType = "test" }
            }
        };
        var processGatewayInformation = new ProcessGatewayInformation { Action = "confirm", };

        // Act
        var result = await gateway.FilterAsync(outgoingFlows, instance, processGatewayInformation);

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
                Id = "aa",
                AppLogic = new() { ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.NotFound", }
            },
            new()
            {
                Id = "test",
                AppLogic = new() { ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.DummyModel", }
            }
        };
        object formData = new DummyModel() { Amount = 1000, Submitter = "test" };
        LayoutSets layoutSets = new LayoutSets()
        {
            Sets = new()
            {
                new()
                {
                    Id = "test",
                    Tasks = new() { "Task_1" },
                    DataType = "test"
                }
            }
        };
        var gateway = SetupExpressionsGateway(
            dataTypes: dataTypes,
            formData: formData,
            layoutSets: LayoutSetsToString(layoutSets)
        );
        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow { Id = "1", ConditionExpression = "[\"notEquals\", [\"dataModel\", \"Amount\"], 1000]", },
            new SequenceFlow { Id = "2", ConditionExpression = "[\"equals\", [\"dataModel\", \"Amount\"], 1000]", },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new() { PartyId = "500000" },
            AppId = "ttd/test",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
            Data = new()
            {
                new() { Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf", DataType = "test" }
            }
        };
        var processGatewayInformation = new ProcessGatewayInformation { Action = "confirm", };

        // Act
        var result = await gateway.FilterAsync(outgoingFlows, instance, processGatewayInformation);

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
                AppLogic = new() { ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.DummyModel", }
            },
            new()
            {
                Id = "test",
                AppLogic = new() { ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.DummyModel", }
            }
        };

        object formData = new DummyModel() { Amount = 1000, Submitter = "test" };
        LayoutSets layoutSets = new LayoutSets()
        {
            Sets = new()
            {
                new()
                {
                    Id = "test",
                    Tasks = new() { "Task_1" },
                    DataType = "test"
                }
            }
        };
        var gateway = SetupExpressionsGateway(
            dataTypes: dataTypes,
            formData: formData,
            layoutSets: LayoutSetsToString(layoutSets)
        );
        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow { Id = "1", ConditionExpression = "[\"notEquals\", [\"dataModel\", \"Amount\"], 1000]", },
            new SequenceFlow { Id = "2", ConditionExpression = "[\"equals\", [\"dataModel\", \"Amount\"], 1000]", },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new() { PartyId = "500000" },
            AppId = "ttd/test",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
            Data = new()
            {
                new() { Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf", DataType = "test" }
            }
        };
        var processGatewayInformation = new ProcessGatewayInformation { Action = "confirm", DataTypeId = "aa" };

        // Act
        var result = await gateway.FilterAsync(outgoingFlows, instance, processGatewayInformation);

        // Assert
        Assert.Single(result);
        Assert.Equal("2", result[0].Id);
    }

    private ExpressionsExclusiveGateway SetupExpressionsGateway(
        List<DataType> dataTypes,
        string? layoutSets = null,
        object? formData = null
    )
    {
        _resources.Setup(r => r.GetLayoutSets()).Returns(layoutSets ?? string.Empty);
        _appMetadata
            .Setup(m => m.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/test-app") { DataTypes = dataTypes });
        _resources
            .Setup(r => r.GetLayoutModelForTask(It.IsAny<string>()))
            .Returns(
                new LayoutModel()
                {
                    DefaultDataType = new() { Id = "test", },
                    Pages = new Dictionary<string, PageComponent>()
                    {
                        {
                            "Page1",
                            new(
                                "Page1",
                                new List<BaseComponent>(),
                                new Dictionary<string, BaseComponent>(),
                                Expression.False,
                                Expression.False,
                                Expression.False,
                                null
                            )
                        }
                    }
                }
            );
        if (formData != null)
        {
            _dataClient
                .Setup(d =>
                    d.GetFormData(
                        It.IsAny<Guid>(),
                        It.IsAny<Type>(),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<int>(),
                        It.IsAny<Guid>()
                    )
                )
                .ReturnsAsync(formData);
        }

        var frontendSettings = Options.Create(new FrontEndSettings());

        _httpContextAccessor.SetupGet(hca => hca.HttpContext!.TraceIdentifier).Returns(Guid.NewGuid().ToString());

        var layoutStateInit = new LayoutEvaluatorStateInitializer(
            _resources.Object,
            frontendSettings,
            new CachedFormDataAccessor(
                _dataClient.Object,
                _appMetadata.Object,
                _appModel.Object,
                _httpContextAccessor.Object
            )
        );
        return new ExpressionsExclusiveGateway(layoutStateInit);
    }

    private static string LayoutSetsToString(LayoutSets layoutSets) =>
        JsonSerializer.Serialize(layoutSets, _jsonSerializerOptions);
}
