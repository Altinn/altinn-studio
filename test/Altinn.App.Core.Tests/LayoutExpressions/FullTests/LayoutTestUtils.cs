using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests;

public static class LayoutTestUtils
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private const string Org = "ttd";
    private const string App = "test";
    private const string AppId = $"{Org}/{App}";
    private const int InstanceOwnerPartyId = 134;
    private static readonly Guid _instanceGuid = Guid.Parse("12345678-1234-1234-1234-123456789012");
    private static readonly Guid _dataGuid = Guid.Parse("12345678-1234-1234-1234-123456789013");
    private const string DataTypeId = "default";
    private const string ClassRef = "NoClass";
    private const string TaskId = "Task_1";

    private static readonly ApplicationMetadata _applicationMetadata =
        new(AppId)
        {
            DataTypes =
            [
                new DataType()
                {
                    Id = DataTypeId,
                    TaskId = TaskId,
                    AppLogic = new() { ClassRef = ClassRef }
                }
            ]
        };

    private static readonly Instance _instance =
        new()
        {
            Id = $"{InstanceOwnerPartyId}/{_instanceGuid}",
            AppId = AppId,
            Org = Org,
            InstanceOwner = new() { PartyId = InstanceOwnerPartyId.ToString() },
            Data = []
        };

    private static readonly DataElement _dataElement = new DataElement()
    {
        Id = _dataGuid.ToString(),
        DataType = "default",
    };

    public static async Task<LayoutEvaluatorState> GetLayoutModelTools(object model, string folder)
    {
        var services = new ServiceCollection();

        var appMetadata = new Mock<IAppMetadata>(MockBehavior.Strict);

        appMetadata.Setup(am => am.GetApplicationMetadata()).ReturnsAsync(_applicationMetadata);
        var appModel = new Mock<IAppModel>(MockBehavior.Strict);
        var modelType = model.GetType();
        appModel.Setup(am => am.GetModelType(ClassRef)).Returns(modelType);

        var resources = new Mock<IAppResources>();
        var pages = new List<PageComponent>();
        var layoutsPath = Path.Join("LayoutExpressions", "FullTests", folder);
        foreach (var layoutFile in Directory.GetFiles(layoutsPath, "*.json"))
        {
            var layoutBytes = await File.ReadAllBytesAsync(layoutFile);
            string pageName = layoutFile.Replace(layoutsPath + "/", string.Empty).Replace(".json", string.Empty);

            PageComponentConverter.SetAsyncLocalPageName("layout", pageName);

            pages.Add(JsonSerializer.Deserialize<PageComponent>(layoutBytes.RemoveBom(), _jsonSerializerOptions)!);
        }
        var dataType = new DataType() { Id = DataTypeId, };
        var layout = new LayoutSetComponent(pages, "layout", dataType);
        var layoutModel = new LayoutModel([layout], null);

        resources.Setup(r => r.GetLayoutModelForTask(TaskId)).Returns(layoutModel);

        services.AddSingleton(resources.Object);
        services.AddSingleton(appMetadata.Object);
        // services.AddSingleton(appModel.Object);
        services.AddScoped<ILayoutEvaluatorStateInitializer, LayoutEvaluatorStateInitializer>();

        services.AddOptions<FrontEndSettings>().Configure(fes => fes.Add("test", "value"));

        var serviceProvider = services.BuildServiceProvider(validateScopes: true);
        using var scope = serviceProvider.CreateScope();
        var initializer = scope.ServiceProvider.GetRequiredService<ILayoutEvaluatorStateInitializer>();

        var dataAccessor = new InstanceDataAccessorFake(_instance) { { _dataElement, model } };

        return await initializer.Init(dataAccessor, TaskId);
    }
}
