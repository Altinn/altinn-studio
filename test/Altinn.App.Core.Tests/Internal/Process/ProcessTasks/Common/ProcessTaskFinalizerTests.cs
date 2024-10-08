using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks.Common;

public class ProcessTaskFinalizerTests
{
    private readonly Mock<IAppMetadata> _appMetadataMock = new();
    private readonly Mock<IDataClient> _dataClientMock = new();
    private readonly Mock<IInstanceClient> _instanceClientMock = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModelMock = new();
    private readonly Mock<ILayoutEvaluatorStateInitializer> _layoutEvaluatorStateInitializerMock = new();
    private readonly IOptions<AppSettings> _appSettings = Options.Create(new AppSettings());
    private readonly ProcessTaskFinalizer _processTaskFinalizer;

    public ProcessTaskFinalizerTests()
    {
        _processTaskFinalizer = new ProcessTaskFinalizer(
            _appMetadataMock.Object,
            _dataClientMock.Object,
            _instanceClientMock.Object,
            _appModelMock.Object,
            new ModelSerializationService(_appModelMock.Object),
            _layoutEvaluatorStateInitializerMock.Object,
            _appSettings
        );
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
                CurrentTask = new ProcessElementInfo { AltinnTaskType = "signing", ElementId = "EndEvent", },
            },
            Data =
            [
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    References = [new Reference { ValueType = ReferenceType.Task, Value = "EndEvent" }]
                }
            ]
        };

        var applicationMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes = [new DataType { TaskId = instance.Process.CurrentTask.ElementId }]
        };

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        // Act
        await _processTaskFinalizer.Finalize(instance.Process.CurrentTask.ElementId, instance);

        // Assert
        _appMetadataMock.Verify(x => x.GetApplicationMetadata(), Times.Once);
    }
}
