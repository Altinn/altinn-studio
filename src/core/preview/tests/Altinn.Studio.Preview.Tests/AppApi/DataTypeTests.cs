using System.Text.Json.Nodes;
using Altinn.Studio.Preview.AppApi;

namespace Altinn.Studio.Preview.Tests.AppApi;

public sealed class DataTypeTests
{
    private static readonly DateTimeOffset s_now = new(2026, 11, 26, 9, 0, 0, TimeSpan.FromHours(1));

    private static JsonObject MetadataWithBothSpellings() =>
        JsonNode
            .Parse(
                """
                {
                  "dataTypes": [
                    { "id": "model", "taskId": "TheV8Task", "taskIds": ["Task_1", null, "Task_2"] },
                    { "id": "attachment" }
                  ]
                }
                """
            )
            ?.AsObject()
        ?? throw new InvalidOperationException("No metadata.");

    [Fact]
    public void From_ReadsTheTasksOfAV9App_FromTaskIds()
    {
        IReadOnlyList<DataType> dataTypes = DataType.From(MetadataWithBothSpellings(), AppGeneration.V9);

        Assert.Equal(["Task_1", "Task_2"], dataTypes[0].TaskIds);
        Assert.Empty(dataTypes[1].TaskIds);
    }

    [Fact]
    public void From_ReadsTheTaskOfAV8App_FromTaskId()
    {
        IReadOnlyList<DataType> dataTypes = DataType.From(MetadataWithBothSpellings(), AppGeneration.V8);

        Assert.Equal(["TheV8Task"], dataTypes[0].TaskIds);
        Assert.Empty(dataTypes[1].TaskIds);
    }

    [Theory]
    [InlineData("Task_1", false, true)]
    [InlineData("Task_1", true, true)]
    [InlineData("Task_2", false, false)]
    [InlineData(null, false, false)]
    public void IsWritable_FollowsTheCurrentTask_WhenTheDataTypeHasTasks(
        string? currentTask,
        bool locked,
        bool writable
    )
    {
        var dataType = new DataType("model", ["Task_1"], "App.Models.Model", AutoCreate: true);

        Assert.Equal(writable, dataType.IsWritable(Element(locked), currentTask));
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public void IsWritable_FollowsTheLock_WhenTheDataTypeHasNoTasks(bool locked, bool writable)
    {
        var dataType = new DataType("model", [], "App.Models.Model", AutoCreate: false);

        Assert.Equal(writable, dataType.IsWritable(Element(locked), "Task_1"));
    }

    private static DataElement Element(bool locked) =>
        new()
        {
            Id = Guid.Empty.ToString(),
            InstanceGuid = Guid.Empty.ToString(),
            DataType = "model",
            ContentType = "application/xml",
            BlobStoragePath = "ttd/my-app/data",
            Locked = locked,
            Created = s_now,
            CreatedBy = "1024",
            LastChanged = s_now,
            LastChangedBy = "1024",
        };
}
