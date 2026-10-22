using Altinn.App.Core.Extensions;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.Extensions;

public class DataTypeExtensionsTests
{
    [Theory]
    [InlineData(new[] { "Task_1" }, "Task_1", true)]
    [InlineData(new[] { "Task_1" }, "Task_2", false)]
    [InlineData(new[] { "Task_1" }, "task_1", false)]
    [InlineData(new[] { "Task_1", "Task_2" }, "Task_2", true)]
    [InlineData(new[] { "Task_1", "Task_2" }, "Task_3", false)]
    [InlineData(new string[0], "Task_1", false)]
    [InlineData(null, "Task_1", false)]
    [InlineData(new[] { "Task_1" }, null, false)]
    [InlineData(new string?[] { null }, null, false)]
    public void IsBoundToTask_LooksTheTaskUpInTaskIds(string?[]? taskIds, string? taskId, bool expected)
    {
        var dataType = new DataType { Id = "model", TaskIds = taskIds?.ToList() };

        Assert.Equal(expected, dataType.IsBoundToTask(taskId));
    }

    [Fact]
    public void IsBoundToTask_IgnoresTheV8TaskId()
    {
#pragma warning disable CS0618 // Type or member is obsolete
        var dataType = new DataType { Id = "model", TaskId = "Task_1" };
#pragma warning restore CS0618 // Type or member is obsolete

        Assert.False(dataType.IsBoundToTask("Task_1"));
    }
}
