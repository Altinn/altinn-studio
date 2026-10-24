using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Services;
using Moq;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class ApplicationServiceTests
{
    private const string Org = "ttd";
    private const string AppId = "ttd/task-ids";

    public static TheoryData<string?, string[]?, string, bool> TaskCases =>
        new()
        {
            { null, ["Task_1", "Task_2"], "Task_2", true },
            { null, ["Task_1", "Task_2"], "Task_3", false },
            { null, [], "Task_1", true },
            { null, null, "Task_1", true },
            // v8 apps upload taskId, which counts only for a data type without taskIds.
            { "", null, "Task_1", true },
            { "Task_1", null, "Task_1", true },
            { "Task_1", null, "Task_2", false },
            { "Task_1", ["Task_2"], "Task_1", false },
            { "Task_1", [], "Task_2", true },
        };

    [Theory]
    [MemberData(nameof(TaskCases))]
    public async Task ValidateDataTypeForApp_AllowsADataTypeOnlyInTheTasksItBelongsTo(
        string? taskId,
        string[]? taskIds,
        string currentTask,
        bool expectedValid
    )
    {
#pragma warning disable CS0618 // Type or member is obsolete
        ApplicationService service = CreateService(
            new DataType
            {
                Id = "signatures",
                TaskId = taskId,
                TaskIds = taskIds?.ToList(),
            }
        );
#pragma warning restore CS0618 // Type or member is obsolete

        (bool isValid, _) = await service.ValidateDataTypeForApp(Org, AppId, "signatures", currentTask);

        Assert.Equal(expectedValid, isValid);
    }

    [Fact]
    public async Task ValidateDataTypeForApp_RefusesADataTypeOutsideItsTasksWith405()
    {
        ApplicationService service = CreateService(new DataType { Id = "signatures", TaskIds = ["Task_1"] });

        (bool isValid, ServiceError serviceError) = await service.ValidateDataTypeForApp(
            Org,
            AppId,
            "signatures",
            "Task_2"
        );

        Assert.False(isValid);
        Assert.Equal(405, serviceError.ErrorCode);
        Assert.Equal(
            $"DataType signatures is not declared in application metadata for app {AppId}",
            serviceError.ErrorMessage
        );
    }

    [Fact]
    public async Task ValidateDataTypeForApp_AcceptsAnyDataTypeWithTheIdThatFits()
    {
        ApplicationService service = CreateService(
            new DataType { Id = "signatures", TaskIds = ["Task_1"] },
            new DataType { Id = "signatures", TaskIds = ["Task_2"] }
        );

        (bool isValid, _) = await service.ValidateDataTypeForApp(Org, AppId, "signatures", "Task_2");

        Assert.True(isValid);
    }

    private static ApplicationService CreateService(params DataType[] dataTypes)
    {
        var repository = new Mock<IApplicationRepository>();
        repository
            .Setup(r => r.FindOne(AppId, Org, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Application { Id = AppId, Org = Org, DataTypes = [.. dataTypes] });
        return new ApplicationService(repository.Object);
    }
}
