using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks.Common;

public class ProcessTaskFinalizerTests
{
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly Mock<IDataClient> _dataClientMock = new(MockBehavior.Strict);
    private readonly Mock<IInstanceClient> _instanceClientMock = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModelMock = new(MockBehavior.Strict);
    private readonly Mock<IAppResources> _appResourcesMock = new(MockBehavior.Strict);
    private readonly Mock<IDataElementAccessChecker> _dataElementAccessCheckerMock = new(MockBehavior.Strict);

    private readonly IOptions<AppSettings> _appSettings = Options.Create(new AppSettings());
    private readonly ServiceCollection _services = new();

    public ProcessTaskFinalizerTests(ITestOutputHelper output)
    {
        _dataElementAccessCheckerMock
            .Setup(x => x.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>()))
            .ReturnsAsync(true);

        _services.AddSingleton(_appSettings);
        _services.AddSingleton(_appMetadataMock.Object);
        _services.AddSingleton(_dataClientMock.Object);
        _services.AddSingleton(_instanceClientMock.Object);
        _services.AddSingleton(_appModelMock.Object);
        _services.AddSingleton(_appResourcesMock.Object);
        _services.AddSingleton(_dataElementAccessCheckerMock.Object);
        _services.AddSingleton(Options.Create(new FrontEndSettings()));
        _services.AddFakeLoggingWithXunit(output);
        _services.AddTransient<IProcessTaskFinalizer, ProcessTaskFinalizer>();
        _services.AddSingleton(new AppIdentifier("ttd", "test"));
        _services.AddTransient<ITranslationService, TranslationService>();
        _services.AddTransient<ILayoutEvaluatorStateInitializer, LayoutEvaluatorStateInitializer>();
        _services.AddTransient<InstanceDataUnitOfWorkInitializer>();
        _services.AddTransient<ModelSerializationService>();
    }

    [Fact]
    public async Task Finalize_WithValidInputs_ShouldCallCorrectMethods()
    {
        // Arrange
        Instance instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = "signing", ElementId = "EndEvent" },
            },
            Data =
            [
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    DataType = "dataType",
                    References = [new Reference { ValueType = ReferenceType.Task, Value = "EndEvent" }],
                },
            ],
        };

        var applicationMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes = [new DataType { Id = "dataType", TaskId = instance.Process.CurrentTask.ElementId }],
        };

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        // Act
        await using var sp = _services.BuildStrictServiceProvider();
        var processTaskFinalizer = sp.GetRequiredService<IProcessTaskFinalizer>();
        await processTaskFinalizer.Finalize(instance.Process.CurrentTask.ElementId, instance);

        // Assert
        // Called once in Finalize and once when initializing the dataAccessor
        _appMetadataMock.Verify(x => x.GetApplicationMetadata(), Times.Exactly(2));
    }
}
