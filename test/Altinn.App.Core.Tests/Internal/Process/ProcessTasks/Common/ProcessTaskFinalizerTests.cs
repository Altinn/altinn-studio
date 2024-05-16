using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks.Common
{
    public class ProcessTaskFinalizerTests
    {
        private readonly Mock<IAppMetadata> _appMetadataMock;
        private readonly Mock<IDataClient> _dataClientMock;
        private readonly Mock<IAppModel> _appModelMock;
        private readonly Mock<IAppResources> _appResourcesMock;
        private readonly Mock<LayoutEvaluatorStateInitializer> _layoutEvaluatorStateInitializerMock;
        private readonly IOptions<AppSettings> _appSettingsMock;
        private readonly ProcessTaskFinalizer _processTaskFinalizer;

        public ProcessTaskFinalizerTests()
        {
            _appMetadataMock = new Mock<IAppMetadata>();
            _dataClientMock = new Mock<IDataClient>();
            _appModelMock = new Mock<IAppModel>();
            _appResourcesMock = new Mock<IAppResources>();
            var frontendSettingsMock = new Mock<IOptions<FrontEndSettings>>();
            _layoutEvaluatorStateInitializerMock = new Mock<LayoutEvaluatorStateInitializer>(
                MockBehavior.Strict,
                [_appResourcesMock.Object, frontendSettingsMock.Object]
            );
            _appSettingsMock = Options.Create(new AppSettings());

            _processTaskFinalizer = new ProcessTaskFinalizer(
                _appMetadataMock.Object,
                _dataClientMock.Object,
                _appModelMock.Object,
                _appResourcesMock.Object,
                _layoutEvaluatorStateInitializerMock.Object,
                _appSettingsMock
            );
        }

        [Fact]
        public async Task Finalize_WithValidInputs_ShouldCallCorrectMethods()
        {
            // Arrange
            Instance instance = CreateInstance();

            instance.Data =
            [
                new DataElement
                {
                    Id = Guid.NewGuid().ToString(),
                    References =
                    [
                        new Reference { ValueType = ReferenceType.Task, Value = instance.Process.CurrentTask.ElementId }
                    ]
                }
            ];

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

        private static Instance CreateInstance()
        {
            return new Instance()
            {
                Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
                AppId = "ttd/test",
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo { AltinnTaskType = "signing", ElementId = "EndEvent", },
                },
            };
        }
    }
}
