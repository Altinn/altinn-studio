using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class ProcessTaskDataLockerTests
{
    private readonly Mock<IAppMetadata> _appMetadataMock;
    private readonly Mock<IDataClient> _dataClientMock;
    private readonly ProcessTaskDataLocker _processTaskDataLocker;

    public ProcessTaskDataLockerTests()
    {
        _appMetadataMock = new Mock<IAppMetadata>();
        _dataClientMock = new Mock<IDataClient>();
        _processTaskDataLocker = new ProcessTaskDataLocker(_appMetadataMock.Object, _dataClientMock.Object);
    }

    [Fact]
    public async Task Unlock_ShouldUnlockAllDataElementsConnectedToTask()
    {
        // Arrange
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;

        instance.Data =
        [
            new DataElement { Id = Guid.NewGuid().ToString(), DataType = "dataType1" },
            new DataElement { Id = Guid.NewGuid().ToString(), DataType = "dataType2" },
        ];

        var applicationMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes =
            [
                new DataType { Id = "dataType1", TaskIds = [taskId] },
                new DataType { Id = "dataType2", TaskIds = [taskId] },
            ],
        };

        _appMetadataMock.Setup(x => x.ApplicationMetadata).Returns(applicationMetadata);

        // Act
        await _processTaskDataLocker.Unlock(taskId, instance);

        // Assert
        _dataClientMock.Verify(
            x =>
                x.UnlockDataElement(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task Lock_ShouldLockAllDataElementsConnectedToTask()
    {
        // Arrange
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;

        instance.Data =
        [
            new DataElement { Id = Guid.NewGuid().ToString(), DataType = "dataType1" },
            new DataElement { Id = Guid.NewGuid().ToString(), DataType = "dataType2" },
        ];

        var applicationMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes =
            [
                new DataType { Id = "dataType1", TaskIds = [taskId] },
                new DataType { Id = "dataType2", TaskIds = [taskId] },
            ],
        };

        _appMetadataMock.Setup(x => x.ApplicationMetadata).Returns(applicationMetadata);

        // Act
        await _processTaskDataLocker.Lock(taskId, instance);

        // Assert
        _dataClientMock.Verify(
            x =>
                x.LockDataElement(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task Unlock_ShouldNotUnlockDataElementsNotConnectedToTask()
    {
        // Arrange
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;

        instance.Data =
        [
            new DataElement { Id = Guid.NewGuid().ToString(), DataType = "dataType1" },
            new DataElement { Id = Guid.NewGuid().ToString(), DataType = "dataType2" },
        ];

        var applicationMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes =
            [
                new DataType { Id = "dataType1", TaskIds = [taskId] },
                new DataType { Id = "dataType3", TaskIds = ["task2"] },
            ],
        };

        _appMetadataMock.Setup(x => x.ApplicationMetadata).Returns(applicationMetadata);

        // Act
        await _processTaskDataLocker.Unlock(taskId, instance);

        // Assert
        _dataClientMock.Verify(
            x =>
                x.UnlockDataElement(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Lock_ShouldNotLockDataElementsNotConnectedToTask()
    {
        // Arrange
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;

        instance.Data =
        [
            new DataElement { Id = Guid.NewGuid().ToString(), DataType = "dataType1" },
            new DataElement { Id = Guid.NewGuid().ToString(), DataType = "dataType2" },
        ];

        var applicationMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes =
            [
                new DataType { Id = "dataType1", TaskIds = [taskId] },
                new DataType { Id = "dataType3", TaskIds = ["task2"] },
            ],
        };

        _appMetadataMock.Setup(x => x.ApplicationMetadata).Returns(applicationMetadata);

        // Act
        await _processTaskDataLocker.Lock(taskId, instance);

        // Assert
        _dataClientMock.Verify(
            x =>
                x.LockDataElement(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Lock_ShouldLockDataElementsOfDataTypesThatListTheTaskInTaskIds()
    {
        // Arrange
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;
        var dataElement1 = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "dataType1" };
        var dataElement2 = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "dataType2" };
        instance.Data = [dataElement1, dataElement2];

        var applicationMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes =
            [
                new DataType { Id = "dataType1", TaskIds = ["task0", taskId] },
                new DataType { Id = "dataType2", TaskIds = ["task2"] },
            ],
        };

        _appMetadataMock.Setup(x => x.ApplicationMetadata).Returns(applicationMetadata);

        // Act
        await _processTaskDataLocker.Lock(taskId, instance);

        // Assert
        _dataClientMock.Verify(
            x =>
                x.LockDataElement(
                    It.IsAny<InstanceIdentifier>(),
                    Guid.Parse(dataElement1.Id),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        _dataClientMock.VerifyNoOtherCalls();
    }

    private static Instance CreateInstance()
    {
        return new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = "datatask", ElementId = "datatask" },
            },
        };
    }
}
