#nullable enable
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
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Tests.Internal.Process.TestData;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ExpressionsExclusiveGatewayTests
{
    [Fact]
    public async Task FilterAsync_NoExpressions_ReturnsAllFlows()
    {
        // Arrange
        List<DataType> dataTypes = new List<DataType>()
        {
            new()
            {
                Id = "test",
                AppLogic = new()
                {
                    ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.DummyModel",
                }
            }
        };
        IProcessExclusiveGateway gateway = SetupExpressionsGateway(dataTypes: dataTypes);
        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow
            {
                Id = "1",
                ConditionExpression = null,
            },
            new SequenceFlow
            {
                Id = "2",
                ConditionExpression = null,
            },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new()
            {
                PartyId = "500000"
            },
            AppId = "ttd/test",
            Process = new()
            {
                CurrentTask = new()
                {
                    ElementId = "Task_1"
                }
            },
            Data = new()
            {
                new()
                {
                    Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf",
                    DataType = "test"
                }
            }
        };
        var processGatewayInformation = new ProcessGatewayInformation
        {
            Action = "confirm",
        };

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
                AppLogic = new()
                {
                    ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.DummyModel",
                }
            }
        };
        IProcessExclusiveGateway gateway = SetupExpressionsGateway(dataTypes: dataTypes);
        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow
            {
                Id = "1",
                ConditionExpression = "[\"equals\", [\"gatewayAction\"], \"confirm\"]",
            },
            new SequenceFlow
            {
                Id = "2",
                ConditionExpression = "[\"equals\", [\"gatewayAction\"], \"reject\"]",
            },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new()
            {
                PartyId = "500000"
            },
            AppId = "ttd/test",
            Process = new()
            {
                CurrentTask = new()
                {
                    ElementId = "Task_1"
                }
            },
            Data = new()
            {
                new()
                {
                    Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf",
                    DataType = "test"
                }
            }
        };
        var processGatewayInformation = new ProcessGatewayInformation
        {
            Action = "confirm",
        };

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
                AppLogic = new()
                {
                    ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.NotFound",
                }
            },
            new()
            {
                Id = "test",
                AppLogic = new()
                {
                    ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.DummyModel",
                }
            }
        };
        object formData = new DummyModel()
        {
            Amount = 1000,
            Submitter = "test"
        };
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
        IProcessExclusiveGateway gateway = SetupExpressionsGateway(dataTypes: dataTypes, formData: formData, layoutSets: LayoutSetsToString(layoutSets), dataType: formData.GetType());
        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow
            {
                Id = "1",
                ConditionExpression = "[\"notEquals\", [\"dataModel\", \"Amount\"], 1000]",
            },
            new SequenceFlow
            {
                Id = "2",
                ConditionExpression = "[\"equals\", [\"dataModel\", \"Amount\"], 1000]",
            },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new()
            {
                PartyId = "500000"
            },
            AppId = "ttd/test",
            Process = new()
            {
                CurrentTask = new()
                {
                    ElementId = "Task_1"
                }
            },
            Data = new()
            {
                new()
                {
                    Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf",
                    DataType = "test"
                }
            }
        };
        var processGatewayInformation = new ProcessGatewayInformation
        {
            Action = "confirm",
        };

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
                AppLogic = new()
                {
                    ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.DummyModel",
                }
            },
            new()
            {
                Id = "test",
                AppLogic = new()
                {
                    ClassRef = "Altinn.App.Core.Tests.Internal.Process.TestData.NotFound",
                }
            }
        };
        object formData = new DummyModel()
        {
            Amount = 1000,
            Submitter = "test"
        };
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
        IProcessExclusiveGateway gateway = SetupExpressionsGateway(dataTypes: dataTypes, formData: formData, layoutSets: LayoutSetsToString(layoutSets), dataType: formData.GetType());
        var outgoingFlows = new List<SequenceFlow>
        {
            new SequenceFlow
            {
                Id = "1",
                ConditionExpression = "[\"notEquals\", [\"dataModel\", \"Amount\"], 1000]",
            },
            new SequenceFlow
            {
                Id = "2",
                ConditionExpression = "[\"equals\", [\"dataModel\", \"Amount\"], 1000]",
            },
        };
        var instance = new Instance()
        {
            Id = "500000/60226acd-b821-4aae-82cd-97a342071bd3",
            InstanceOwner = new()
            {
                PartyId = "500000"
            },
            AppId = "ttd/test",
            Process = new()
            {
                CurrentTask = new()
                {
                    ElementId = "Task_1"
                }
            },
            Data = new()
            {
                new()
                {
                    Id = "cd9204e7-9b83-41b4-b2f2-9b196b4fafcf",
                    DataType = "aa"
                }
            }
        };
        var processGatewayInformation = new ProcessGatewayInformation
        {
            Action = "confirm",
            DataTypeId = "aa"
        };

        // Act
        var result = await gateway.FilterAsync(outgoingFlows, instance, processGatewayInformation);

        // Assert
        Assert.Single(result);
        Assert.Equal("2", result[0].Id);
    }
    
    private static ExpressionsExclusiveGateway SetupExpressionsGateway(List<DataType> dataTypes, string? layoutSets = null, object? formData = null, Type? dataType = null)
    {
        var resources = new Mock<IAppResources>();
        var appModel = new Mock<IAppModel>();
        var appMetadata = new Mock<IAppMetadata>();
        var dataClient = new Mock<IDataClient>();

        resources.Setup(r => r.GetLayoutSets()).Returns(layoutSets ?? string.Empty);
        appMetadata.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("ttd/test-app")
        {
            DataTypes = dataTypes
        });
        resources.Setup(r => r.GetLayoutModel(It.IsAny<string?>())).Returns(new LayoutModel()
        {
            Pages = new Dictionary<string, PageComponent>()
            {
                {
                    "Page1", new("Page1", new List<BaseComponent>(), new Dictionary<string, BaseComponent>(), null, null, null, null)
                }
            }
        });
        if (formData != null)
        {
            dataClient.Setup(d => d.GetFormData(It.IsAny<Guid>(), It.IsAny<Type>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>())).ReturnsAsync(formData);
        }

        if (dataType != null)
        {
            appModel.Setup(a => a.GetModelType(dataType.FullName!)).Returns(dataType);
        }

        var frontendSettings = Options.Create(new FrontEndSettings());
        var layoutStateInit = new LayoutEvaluatorStateInitializer(resources.Object, frontendSettings);
        return new ExpressionsExclusiveGateway(layoutStateInit, resources.Object, appModel.Object, appMetadata.Object, dataClient.Object);
    }

    private static string LayoutSetsToString(LayoutSets layoutSets)
    {
        return JsonSerializer.Serialize(layoutSets, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true,
        });
    }
}
