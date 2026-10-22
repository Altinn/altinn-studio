using Altinn.App.Analyzers.Metadata;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Metadata;

public class DataTypeTaskIdsUtilsTests
{
    private const string Path = "/repo/App/config/applicationmetadata.json";

    private static List<Diagnostic> Collect(string json)
    {
        var diagnostics = new List<Diagnostic>();
        DataTypeTaskIdsUtils.CollectDiagnostics(
            new InMemoryAdditionalText(Path, json),
            CancellationToken.None,
            diagnostics
        );
        return diagnostics;
    }

    private static string Metadata(params string[] dataTypes) =>
        $$"""
            {
              "id": "ttd/app",
              "dataTypes": [
                {{string.Join(",\n    ", dataTypes)}}
              ]
            }
            """;

    [Fact]
    public void A_Task_Id_Without_Task_Ids_Is_An_Error_On_The_Task_Id()
    {
        var json = Metadata("""{ "id": "model", "taskId": "Task_1" }""");

        var diagnostic = Assert.Single(Collect(json));

        Assert.Equal(Diagnostics.Deprecations.TaskId.Id, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Equal(
            "'taskId' on dataType 'model' is no longer supported by this version of the app backend, so the data type "
                + "is bound to no task: it is not auto-created or validated in 'Task_1', and users can change its data "
                + "in every task. Replace it with \"taskIds\": [\"Task_1\"]; studioctl app upgrade v9 does this.",
            diagnostic.GetMessage()
        );
        Assert.Equal(Path, diagnostic.Location.GetLineSpan().Path);
        Assert.Equal(
            "\"Task_1\"",
            json.Substring(diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length)
        );
    }

    [Theory]
    [InlineData("""{ "id": "model", "taskId": "Task_1", "taskIds": null }""")]
    [InlineData("""{ "id": "model", "taskId": "Task_1", "taskIds": "Task_1" }""")]
    [InlineData("""{ "ID": "model", "TaskId": "Task_1" }""")]
    public void Every_Task_Id_Without_A_Task_Ids_List_Is_An_Error(string dataType)
    {
        Assert.Equal(Diagnostics.Deprecations.TaskId.Id, Assert.Single(Collect(Metadata(dataType))).Id);
    }

    [Fact]
    public void A_Task_Id_Beside_Task_Ids_Is_A_Warning_On_The_Task_Id()
    {
        var json = Metadata("""{ "id": "model", "taskId": "Task_1", "taskIds": ["Task_2", "Task_3"] }""");

        var diagnostic = Assert.Single(Collect(json));

        Assert.Equal(Diagnostics.Deprecations.TaskIdNextToTaskIds.Id, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Warning, diagnostic.Severity);
        Assert.Equal(
            "'taskId' on dataType 'model' is no longer supported by this version of the app backend and is ignored, so "
                + "the data type is bound only to the tasks in its taskIds. Remove the taskId 'Task_1', and list every "
                + "task the data belongs to in taskIds.",
            diagnostic.GetMessage()
        );
        Assert.Equal(
            "\"Task_1\"",
            json.Substring(diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length)
        );
    }

    [Theory]
    [InlineData("""{ "id": "model", "taskId": "Task_1", "taskIds": [] }""")]
    [InlineData("""{ "id": "model", "taskId": "Task_1", "taskIds": ["Task_1"] }""")]
    [InlineData("""{ "ID": "model", "TaskId": "Task_1", "TASKIDS": ["Task_2"] }""")]
    public void Every_Task_Id_Beside_A_Task_Ids_List_Is_A_Warning(string dataType)
    {
        Assert.Equal(Diagnostics.Deprecations.TaskIdNextToTaskIds.Id, Assert.Single(Collect(Metadata(dataType))).Id);
    }

    [Theory]
    [InlineData("""{ "id": "model", "taskIds": ["Task_1"] }""")]
    [InlineData("""{ "id": "model", "taskIds": [] }""")]
    [InlineData("""{ "id": "model", "taskIds": null }""")]
    [InlineData("""{ "id": "model" }""")]
    // An empty taskId binds no task in v8 either.
    [InlineData("""{ "id": "model", "taskId": "" }""")]
    [InlineData("""{ "id": "model", "taskId": "", "taskIds": ["Task_1"] }""")]
    [InlineData("""{ "id": "model", "taskId": null, "taskIds": ["Task_1"] }""")]
    public void A_Data_Type_Without_A_Task_Id_Is_Valid(string dataType)
    {
        Assert.Empty(Collect(Metadata(dataType)));
    }

    [Fact]
    public void Each_Data_Type_Is_Reported_Once()
    {
        var json = Metadata(
            """{ "id": "a", "taskId": "Task_1", "taskIds": ["Task_2"] }""",
            """{ "id": "b", "taskId": "Task_1" }""",
            """{ "id": "c", "taskIds": ["Task_3"] }"""
        );

        Assert.Equal(
            [("a", Diagnostics.Deprecations.TaskIdNextToTaskIds.Id), ("b", Diagnostics.Deprecations.TaskId.Id)],
            Collect(json).Select(d => (d.GetMessage().Split('\'')[3], d.Id))
        );
    }

    [Theory]
    [InlineData("{ \"dataTypes\": [ { \"id\": \"model\", \"taskId\": \"Task_1\" ")]
    [InlineData("[]")]
    [InlineData("{ }")]
    public void Unreadable_Applicationmetadata_Is_Ignored(string json)
    {
        Assert.Empty(Collect(json));
    }
}
