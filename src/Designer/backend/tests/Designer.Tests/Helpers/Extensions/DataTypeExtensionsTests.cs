using System.Linq;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Helpers.Extensions;
using Xunit;

#pragma warning disable CS0618 // v8 apps bind a data type with TaskId

namespace Designer.Tests.Helpers.Extensions;

public class DataTypeExtensionsTests
{
    [Theory]
    [InlineData(null, new[] { "Task_1" }, true, true)]
    [InlineData("Task_1", new string[0], true, false)]
    [InlineData("Task_1", null, true, false)]
    [InlineData("Task_1", null, false, true)]
    [InlineData(null, new[] { "Task_1" }, false, false)]
    [InlineData("", null, false, false)]
    public void IsBoundToAnyTask_ReadsOnlyTheFieldTheAppReads(
        string taskId,
        string[] taskIds,
        bool usesTaskIds,
        bool expected
    )
    {
        DataType dataType = new() { TaskId = taskId, TaskIds = taskIds?.ToList() };

        Assert.Equal(expected, dataType.IsBoundToAnyTask(usesTaskIds));
    }

    [Theory]
    [InlineData("Task_1", null, true, "Task_2", true, "Task_1", new[] { "Task_2" })]
    [InlineData(null, new[] { "Task_1" }, true, "Task_2", true, null, new[] { "Task_1", "Task_2" })]
    [InlineData(null, new[] { "Task_2", "Task_1" }, true, "Task_1", false, null, new[] { "Task_2", "Task_1" })]
    [InlineData("Task_1", new[] { "Task_3" }, false, "Task_2", true, "Task_2", new[] { "Task_3" })]
    [InlineData("Task_1", null, false, "Task_1", false, "Task_1", null)]
    public void BindToTask_WritesOnlyTheFieldTheAppReads(
        string taskId,
        string[] taskIds,
        bool usesTaskIds,
        string taskToBind,
        bool expectedChanged,
        string expectedTaskId,
        string[] expectedTaskIds
    )
    {
        DataType dataType = new() { TaskId = taskId, TaskIds = taskIds?.ToList() };

        bool changed = dataType.BindToTask(taskToBind, usesTaskIds);

        Assert.Equal(expectedChanged, changed);
        Assert.Equal(expectedTaskId, dataType.TaskId);
        Assert.Equal(expectedTaskIds, dataType.TaskIds);
    }

    [Theory]
    [InlineData(null, new[] { "Task_1", "Task_2" }, true, "Task_1", true, null, new[] { "Task_2" })]
    [InlineData(null, new[] { "Task_1" }, true, "Task_1", true, null, new string[0])]
    [InlineData("Task_1", null, true, "Task_1", false, "Task_1", null)]
    [InlineData("Task_1", new[] { "Task_1" }, false, "Task_1", true, null, new[] { "Task_1" })]
    [InlineData("Task_1", null, false, "Task_2", false, "Task_1", null)]
    public void UnbindFromTask_ClearsOnlyTheFieldTheAppReads(
        string taskId,
        string[] taskIds,
        bool usesTaskIds,
        string taskToUnbind,
        bool expectedChanged,
        string expectedTaskId,
        string[] expectedTaskIds
    )
    {
        DataType dataType = new() { TaskId = taskId, TaskIds = taskIds?.ToList() };

        bool changed = dataType.UnbindFromTask(taskToUnbind, usesTaskIds);

        Assert.Equal(expectedChanged, changed);
        Assert.Equal(expectedTaskId, dataType.TaskId);
        Assert.Equal(expectedTaskIds, dataType.TaskIds);
    }

    [Theory]
    [InlineData("Task_1", new[] { "Task_1", "Task_2" }, true, true, "Task_1", new[] { "Task_9", "Task_2" })]
    [InlineData("Task_1", null, true, false, "Task_1", null)]
    [InlineData("Task_1", new[] { "Task_1" }, false, true, "Task_9", new[] { "Task_1" })]
    [InlineData("Task_2", null, false, false, "Task_2", null)]
    public void RenameTask_RenamesOnlyInTheFieldTheAppReads(
        string taskId,
        string[] taskIds,
        bool usesTaskIds,
        bool expectedChanged,
        string expectedTaskId,
        string[] expectedTaskIds
    )
    {
        DataType dataType = new() { TaskId = taskId, TaskIds = taskIds?.ToList() };

        bool changed = dataType.RenameTask("Task_1", "Task_9", usesTaskIds);

        Assert.Equal(expectedChanged, changed);
        Assert.Equal(expectedTaskId, dataType.TaskId);
        Assert.Equal(expectedTaskIds, dataType.TaskIds);
    }
}
