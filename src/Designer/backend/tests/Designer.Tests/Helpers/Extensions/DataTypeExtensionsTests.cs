using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Helpers.Extensions;
using Xunit;

#pragma warning disable CS0618 // The extensions bind a data type with TaskId in apps that do not read TaskIds

namespace Designer.Tests.Helpers.Extensions;

public class DataTypeExtensionsTests
{
    [Fact]
    public void IsBoundToAnyTask_WhenAppReadsTaskIds_ReadsOnlyTaskIds()
    {
        Assert.True(new DataType { TaskIds = ["Task_1"] }.IsBoundToAnyTask(usesTaskIds: true));
        Assert.False(new DataType { TaskId = "Task_1", TaskIds = [] }.IsBoundToAnyTask(usesTaskIds: true));
        Assert.False(new DataType { TaskId = "Task_1" }.IsBoundToAnyTask(usesTaskIds: true));
    }

    [Fact]
    public void IsBoundToAnyTask_WhenAppReadsOnlyTaskId_ReadsOnlyTaskId()
    {
        Assert.True(new DataType { TaskId = "Task_1", TaskIds = [] }.IsBoundToAnyTask(usesTaskIds: false));
        Assert.False(new DataType { TaskIds = ["Task_1"] }.IsBoundToAnyTask(usesTaskIds: false));
        Assert.False(new DataType { TaskId = "" }.IsBoundToAnyTask(usesTaskIds: false));
    }

    [Fact]
    public void BindToTask_WhenAppReadsTaskIds_AndTaskIdsIsNull_CreatesListAndLeavesTaskIdAlone()
    {
        DataType dataType = new() { TaskId = "Task_1" };

        bool changed = dataType.BindToTask("Task_2", usesTaskIds: true);

        Assert.True(changed);
        Assert.Equal(new[] { "Task_2" }, dataType.TaskIds);
        Assert.Equal("Task_1", dataType.TaskId);
    }

    [Fact]
    public void BindToTask_WhenAppReadsTaskIds_AppendsTaskToList()
    {
        DataType dataType = new() { TaskIds = ["Task_1"] };

        bool changed = dataType.BindToTask("Task_2", usesTaskIds: true);

        Assert.True(changed);
        Assert.Equal(new[] { "Task_1", "Task_2" }, dataType.TaskIds);
        Assert.Null(dataType.TaskId);
    }

    [Fact]
    public void BindToTask_WhenAppReadsTaskIds_AndListHoldsTask_LeavesListUnchanged()
    {
        DataType dataType = new() { TaskIds = ["Task_2", "Task_1"] };

        bool changed = dataType.BindToTask("Task_1", usesTaskIds: true);

        Assert.False(changed);
        Assert.Equal(new[] { "Task_2", "Task_1" }, dataType.TaskIds);
    }

    [Fact]
    public void BindToTask_WhenAppReadsOnlyTaskId_ReplacesTaskIdAndAddsTaskToExistingTaskIds()
    {
        DataType dataType = new() { TaskId = "Task_1", TaskIds = ["Task_3"] };

        bool changed = dataType.BindToTask("Task_2", usesTaskIds: false);

        Assert.True(changed);
        Assert.Equal("Task_2", dataType.TaskId);
        Assert.Equal(new[] { "Task_3", "Task_2" }, dataType.TaskIds);
    }

    [Fact]
    public void BindToTask_WhenAppReadsOnlyTaskId_DoesNotCreateTaskIds()
    {
        DataType dataType = new() { TaskId = "Task_1" };

        bool changed = dataType.BindToTask("Task_2", usesTaskIds: false);

        Assert.True(changed);
        Assert.Equal("Task_2", dataType.TaskId);
        Assert.Null(dataType.TaskIds);
    }

    [Fact]
    public void BindToTask_WhenAppReadsOnlyTaskId_AndOnlyTaskIdsLacksTask_AddsTaskToTaskIds()
    {
        DataType dataType = new() { TaskId = "Task_1", TaskIds = [] };

        bool changed = dataType.BindToTask("Task_1", usesTaskIds: false);

        Assert.True(changed);
        Assert.Equal("Task_1", dataType.TaskId);
        Assert.Equal(new[] { "Task_1" }, dataType.TaskIds);
    }

    [Fact]
    public void BindToTask_WhenAppReadsOnlyTaskId_AndTaskIdHoldsTask_ReturnsFalse()
    {
        DataType dataType = new() { TaskId = "Task_1" };

        bool changed = dataType.BindToTask("Task_1", usesTaskIds: false);

        Assert.False(changed);
        Assert.Equal("Task_1", dataType.TaskId);
        Assert.Null(dataType.TaskIds);
    }

    [Fact]
    public void UnbindFromTask_WhenAppReadsTaskIds_RemovesOnlyThatTask()
    {
        DataType dataType = new() { TaskIds = ["Task_1", "Task_2"] };

        bool removed = dataType.UnbindFromTask("Task_1", usesTaskIds: true);

        Assert.True(removed);
        Assert.Equal(new[] { "Task_2" }, dataType.TaskIds);
    }

    [Fact]
    public void UnbindFromTask_WhenAppReadsTaskIds_AndLastTaskIsRemoved_KeepsEmptyList()
    {
        DataType dataType = new() { TaskIds = ["Task_1"] };

        bool removed = dataType.UnbindFromTask("Task_1", usesTaskIds: true);

        Assert.True(removed);
        Assert.NotNull(dataType.TaskIds);
        Assert.Empty(dataType.TaskIds);
    }

    [Fact]
    public void UnbindFromTask_WhenAppReadsTaskIds_IgnoresTaskId()
    {
        DataType dataType = new() { TaskId = "Task_1" };

        bool removed = dataType.UnbindFromTask("Task_1", usesTaskIds: true);

        Assert.False(removed);
        Assert.Equal("Task_1", dataType.TaskId);
        Assert.Null(dataType.TaskIds);
    }

    [Fact]
    public void UnbindFromTask_WhenAppReadsOnlyTaskId_ClearsMatchingTaskIdAndRemovesTaskFromTaskIds()
    {
        DataType dataType = new() { TaskId = "Task_1", TaskIds = ["Task_1", "Task_2"] };

        bool removed = dataType.UnbindFromTask("Task_1", usesTaskIds: false);

        Assert.True(removed);
        Assert.Null(dataType.TaskId);
        Assert.Equal(new[] { "Task_2" }, dataType.TaskIds);
    }

    [Fact]
    public void UnbindFromTask_WhenAppReadsOnlyTaskId_AndOnlyTaskIdsHoldsTask_RemovesTaskFromTaskIds()
    {
        DataType dataType = new() { TaskId = "Task_2", TaskIds = ["Task_1"] };

        bool removed = dataType.UnbindFromTask("Task_1", usesTaskIds: false);

        Assert.True(removed);
        Assert.Equal("Task_2", dataType.TaskId);
        Assert.Empty(dataType.TaskIds);
    }

    [Fact]
    public void UnbindFromTask_WhenAppReadsOnlyTaskId_AndTaskIdIsAnotherTask_KeepsTaskId()
    {
        DataType dataType = new() { TaskId = "Task_1" };

        bool removed = dataType.UnbindFromTask("Task_2", usesTaskIds: false);

        Assert.False(removed);
        Assert.Equal("Task_1", dataType.TaskId);
    }

    [Fact]
    public void RenameTask_WhenAppReadsTaskIds_RenamesTaskInListAndIgnoresTaskId()
    {
        DataType dataType = new() { TaskId = "Task_1", TaskIds = ["Task_1", "Task_2"] };

        bool renamed = dataType.RenameTask("Task_1", "Task_9", usesTaskIds: true);

        Assert.True(renamed);
        Assert.Equal(new[] { "Task_9", "Task_2" }, dataType.TaskIds);
        Assert.Equal("Task_1", dataType.TaskId);
    }

    [Fact]
    public void RenameTask_WhenAppReadsTaskIds_AndOnlyTaskIdHoldsTask_ReturnsFalse()
    {
        DataType dataType = new() { TaskId = "Task_1" };

        bool renamed = dataType.RenameTask("Task_1", "Task_9", usesTaskIds: true);

        Assert.False(renamed);
        Assert.Null(dataType.TaskIds);
        Assert.Equal("Task_1", dataType.TaskId);
    }

    [Fact]
    public void RenameTask_WhenAppReadsOnlyTaskId_RenamesTaskIdAndTaskInTaskIds()
    {
        DataType dataType = new() { TaskId = "Task_1", TaskIds = ["Task_1", "Task_2"] };

        bool renamed = dataType.RenameTask("Task_1", "Task_9", usesTaskIds: false);

        Assert.True(renamed);
        Assert.Equal("Task_9", dataType.TaskId);
        Assert.Equal(new[] { "Task_9", "Task_2" }, dataType.TaskIds);
    }
}
