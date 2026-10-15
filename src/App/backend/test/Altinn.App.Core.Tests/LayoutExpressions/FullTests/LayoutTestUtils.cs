using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests;

public static class LayoutTestUtils
{
    private const string Org = "ttd";
    private const string App = "test";
    private const string AppId = $"{Org}/{App}";
    private const int InstanceOwnerPartyId = 134;
    private static readonly Guid _instanceGuid = Guid.Parse("12345678-1234-1234-1234-123456789012");
    private static readonly Guid _dataGuid = Guid.Parse("12345678-1234-1234-1234-123456789013");
    private const string DataTypeId = "default";
    private const string TaskId = "Task_1";

    private static readonly Instance _instance = new()
    {
        Id = $"{InstanceOwnerPartyId}/{_instanceGuid}",
        AppId = AppId,
        Org = Org,
        InstanceOwner = new() { PartyId = InstanceOwnerPartyId.ToString() },
        Data = [],
    };

    private static readonly DataElement _dataElement = new DataElement()
    {
        Id = _dataGuid.ToString(),
        DataType = "default",
    };

    private static JsonDocumentOptions _options = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
    };

    public static async Task<LayoutEvaluatorState> GetLayoutModelTools(object model, string folder)
    {
        var services = new ServiceCollection();

        services.AddFakeLogging();

        var modelType = model.GetType();
        var modelTypeFullName = modelType.FullName!;
        var appMetadata = new Mock<IAppMetadata>(MockBehavior.Strict);
        var applicationMetadata = CreateApplicationMetadata(modelType);

        appMetadata.Setup(am => am.ApplicationMetadata).Returns(applicationMetadata);
        var appModel = new Mock<IAppModel>(MockBehavior.Strict);
        appModel.Setup(am => am.GetModelType(modelTypeFullName)).Returns(modelType);

        var resources = new Mock<IAppResources>();
        var layoutModel = await LoadLayoutModel(folder);

        resources.Setup(r => r.GetLayoutModelForFolder(TaskId)).Returns(layoutModel);

        services.AddSingleton(resources.Object);
        services.AddSingleton(appMetadata.Object);
        // services.AddSingleton(appModel.Object);
        services.AddTransient<ILayoutEvaluatorStateInitializer, LayoutEvaluatorStateInitializer>();

        services.AddOptions<FrontEndSettings>().Configure(fes => fes.Add("test", "value"));

        services.AddSingleton(new AppIdentifier(Org, App));
        services.AddTransient<ITranslationService, TranslationService>();

        var serviceProvider = services.BuildStrictServiceProvider();
        using var scope = serviceProvider.CreateScope();
        var initializer = scope.ServiceProvider.GetRequiredService<ILayoutEvaluatorStateInitializer>();

        var dataAccessor = new InstanceDataAccessorFake(
            _instance,
            applicationMetadata,
            scope.ServiceProvider.GetRequiredService<ITranslationService>(),
            layoutModel,
            scope.ServiceProvider.GetRequiredService<IOptions<FrontEndSettings>>().Value,
            null,
            null
        )
        {
            { _dataElement, model },
        };

        return await initializer.Init(dataAccessor, TaskId);
    }

    /// <summary>
    /// Initialize the state through the legacy <see cref="LayoutEvaluatorStateInitializer.Init(Instance, object, string?, string?)"/>
    /// overload that apps call from <c>IDataProcessor</c>
    /// </summary>
    public static async Task<LayoutEvaluatorState> GetLegacyLayoutModelTools(object model, string folder)
    {
        var appMetadata = new Mock<IAppMetadata>(MockBehavior.Strict);
        appMetadata.Setup(am => am.GetApplicationMetadata()).ReturnsAsync(CreateApplicationMetadata(model.GetType()));

        var layoutModel = await LoadLayoutModel(folder);
        var resources = new Mock<IAppResources>(MockBehavior.Strict);
#pragma warning disable CS0618 // Type or member is obsolete
        resources.Setup(r => r.GetLayoutModel("layout")).Returns(layoutModel);
#pragma warning restore CS0618 // Type or member is obsolete

        var initializer = new LayoutEvaluatorStateInitializer(
            resources.Object,
            new Mock<ITranslationService>(MockBehavior.Strict).Object,
            appMetadata.Object,
            Options.Create(new FrontEndSettings())
        );

        var instance = new Instance()
        {
            Id = _instance.Id,
            AppId = _instance.AppId,
            Org = _instance.Org,
            InstanceOwner = _instance.InstanceOwner,
            Data = [_dataElement],
        };
        return await initializer.Init(instance, model, "layout");
    }

    private static ApplicationMetadata CreateApplicationMetadata(Type modelType) =>
        new(AppId)
        {
            DataTypes =
            [
                new()
                {
                    Id = DataTypeId,
                    TaskId = TaskId,
                    AppLogic = new() { ClassRef = modelType.FullName },
                    AllowedContentTypes = ["application/json"],
                    MaxCount = 1,
                },
            ],
        };

    private static async Task<LayoutModel> LoadLayoutModel(string folder)
    {
        var pages = new List<PageComponent>();
        var layoutsPath = Path.Join(PathUtils.GetCoreTestsPath(), "LayoutExpressions", "FullTests", folder);
        foreach (var layoutFile in Directory.GetFiles(layoutsPath, "*.json"))
        {
            var layoutBytes = await File.ReadAllBytesAsync(layoutFile);
            string pageName = Path.GetFileNameWithoutExtension(layoutFile);

            using var document = JsonDocument.Parse(layoutBytes, _options);

            pages.Add(PageComponent.Parse(document.RootElement, pageName, "layout"));
        }
        var dataType = new DataType() { Id = DataTypeId };
        var layout = new LayoutSetComponent(pages, "layout", dataType);
        return new LayoutModel([layout], null);
    }
}
