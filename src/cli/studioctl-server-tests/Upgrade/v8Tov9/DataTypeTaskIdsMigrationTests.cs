using System.Text;
using System.Text.Json;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class DataTypeTaskIdsMigrationTests : IDisposable
{
    private const string MetadataPath = "config/applicationmetadata.json";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task ReplacesTaskIdWithTaskIdsOnEveryDataType()
    {
        _app.Write(
            MetadataPath,
            """
            {
              "id": "ttd/app",
              "title": { "nb": "Mentions \"taskId\": \"Task_1\" in a value" },
              "dataTypes": [
                {
                  "id": "model",
                  "allowedContentTypes": ["application/xml"],
                  "taskId": "Task_1",
                  "maxCount": 1
                },
                { "id": "attachment", "TaskId"  : "Task\u005F2" },
                { "id": "ref-data-as-pdf" }
              ],
              "custom": { "taskId": "Task_1", "nested": [{ "taskId": "Task_1" }] }
            }
            """
        );

        var result = await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(
            """
            {
              "id": "ttd/app",
              "title": { "nb": "Mentions \"taskId\": \"Task_1\" in a value" },
              "dataTypes": [
                {
                  "id": "model",
                  "allowedContentTypes": ["application/xml"],
                  "taskIds": ["Task_1"],
                  "maxCount": 1
                },
                { "id": "attachment", "taskIds"  : ["Task\u005F2"] },
                { "id": "ref-data-as-pdf" }
              ],
              "custom": { "taskId": "Task_1", "nested": [{ "taskId": "Task_1" }] }
            }
            """,
            _app.Read(MetadataPath)
        );
        var message = Assert.Single(result.Messages);
        Assert.Equal(UpgradeMessageStatus.Ok, message.Status);
        Assert.Contains("'model', 'attachment'", message.Text);
    }

    [Fact]
    public async Task RemovesTaskIdNextToTaskIds_AndWarnsWhenTaskIdsDoesNotListItsTask()
    {
        _app.Write(
            MetadataPath,
            """
            {
              "dataTypes": [
                {
                  "id": "model",
                  "taskId": "Task_1",
                  "taskIds": ["Task_1", "Task_2"]
                },
                {
                  "id": "signatures",
                  "taskIds": ["Task_2"],
                  "taskId": "Task_1"
                }
              ]
            }
            """
        );

        var result = await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(
            """
            {
              "dataTypes": [
                {
                  "id": "model",
                  "taskIds": ["Task_1", "Task_2"]
                },
                {
                  "id": "signatures",
                  "taskIds": ["Task_2"]
                }
              ]
            }
            """,
            _app.Read(MetadataPath)
        );
        var removed = Assert.Single(result.Messages, message => message.Status == UpgradeMessageStatus.Ok);
        Assert.Contains("'model'", removed.Text);
        Assert.DoesNotContain("'signatures'", removed.Text);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("'signatures' (taskId 'Task_1')", warning);
        Assert.DoesNotContain("'model'", warning);
        Assert.False(result.RequiresManualFollowUp);
    }

    [Fact]
    public async Task RemovesAnEmptyOrNullTaskId()
    {
        _app.Write(
            MetadataPath,
            """
            {
              "dataTypes": [
                { "id": "a", "taskId": "", "maxCount": 1 },
                { "id": "b", "taskId": null },
                { "taskId": "", "id": "c", "taskIds": ["Task_1"] }
              ]
            }
            """
        );

        var result = await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(
            """
            {
              "dataTypes": [
                { "id": "a", "maxCount": 1 },
                { "id": "b" },
                { "id": "c", "taskIds": ["Task_1"] }
              ]
            }
            """,
            _app.Read(MetadataPath)
        );
        var message = Assert.Single(result.Messages);
        Assert.Equal(UpgradeMessageStatus.Ok, message.Status);
        Assert.Contains("'a', 'b', 'c'", message.Text);
    }

    [Fact]
    public async Task LeavesATaskIdThatIsNotAString()
    {
        var content = """
            { "dataTypes": [{ "id": "a", "taskId": 5 }, { "id": "b", "taskId": ["Task_1"], "taskIds": [] }] }
            """;
        _app.Write(MetadataPath, content);

        var result = await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.Read(MetadataPath));
        var todo = Assert.Single(result.Todos);
        Assert.Contains("'a', 'b'", todo);
        Assert.Single(result.Messages);
    }

    [Fact]
    public async Task LeavesATaskIdNextToATaskIdsThatIsNotAList()
    {
        var content = """
            {
              "dataTypes": [
                { "id": "a", "taskId": "Task_1", "taskIds": null },
                { "id": "b", "taskId": "Task_1", "taskIds": "Task_2" }
              ]
            }
            """;
        _app.Write(MetadataPath, content);

        var result = await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.Read(MetadataPath));
        Assert.Contains("'a' (taskId 'Task_1'), 'b' (taskId 'Task_1')", Assert.Single(result.Todos));
        Assert.Single(result.Messages);
    }

    [Fact]
    public async Task LeavesADataTypeWithMoreThanOneTaskId()
    {
        // v8 reads the last taskId of 'a', which binds it to no task, and the last of 'b', 'Task_2'.
        _app.Write(
            MetadataPath,
            """
            {
              "dataTypes": [
                { "id": "a", "taskId": "Task_1", "TaskId": "" },
                { "id": "b", "taskId": "Task_1", "TaskId": "Task_2" },
                { "id": "c", "taskId": "Task_1" }
              ]
            }
            """
        );

        var result = await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(
            """
            {
              "dataTypes": [
                { "id": "a", "taskId": "Task_1", "TaskId": "" },
                { "id": "b", "taskId": "Task_1", "TaskId": "Task_2" },
                { "id": "c", "taskIds": ["Task_1"] }
              ]
            }
            """,
            _app.Read(MetadataPath)
        );
        Assert.Contains("'a', 'b' in", Assert.Single(result.Todos));
        var replaced = Assert.Single(result.Messages, message => message.Status == UpgradeMessageStatus.Ok);
        Assert.Contains("'c' in", replaced.Text);
        Assert.Equal(2, result.Messages.Count);
    }

    [Fact]
    public async Task PreservesCrlfLineEndings()
    {
        _app.Write(
            MetadataPath,
            "{\r\n  \"dataTypes\": [\r\n    {\r\n      \"id\": \"model\",\r\n      \"taskId\": \"Task_1\"\r\n    },\r\n"
                + "    {\r\n      \"id\": \"old\",\r\n      \"taskId\": \"\"\r\n    }\r\n  ]\r\n}\r\n"
        );

        await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(
            "{\r\n  \"dataTypes\": [\r\n    {\r\n      \"id\": \"model\",\r\n      \"taskIds\": [\"Task_1\"]\r\n    },\r\n"
                + "    {\r\n      \"id\": \"old\"\r\n    }\r\n  ]\r\n}\r\n",
            _app.Read(MetadataPath)
        );
    }

    [Fact]
    public async Task PreservesByteOrderMark()
    {
        _app.WriteBytes(
            MetadataPath,
            [0xEF, 0xBB, 0xBF, .. """{ "dataTypes": [{ "id": "a", "taskId": "Task_1" }] }"""u8.ToArray()]
        );

        await DataTypeTaskIdsMigration.Migrate(_app.Root);

        var after = _app.ReadBytes(MetadataPath);
        Assert.Equal([0xEF, 0xBB, 0xBF], after[..3]);
        Assert.Equal(
            """{ "dataTypes": [{ "id": "a", "taskIds": ["Task_1"] }] }""",
            Encoding.UTF8.GetString(after[3..])
        );
    }

    [Fact]
    public async Task LeavesNoTrailingSpacesWhereARemovedTaskIdSharedItsLine()
    {
        _app.Write(
            MetadataPath,
            """
            {
              "dataTypes": [
                { "taskId": "",
                  "id": "a" },
                { "id": "b", "taskId": null
                }
              ]
            }
            """
        );

        await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(
            """
            {
              "dataTypes": [
                {
                  "id": "a" },
                { "id": "b"
                }
              ]
            }
            """,
            _app.Read(MetadataPath)
        );
    }

    [Fact]
    public async Task SecondRunChangesNothing()
    {
        _app.Write(
            MetadataPath,
            """
            {
              "dataTypes": [
                { "id": "model", "taskId": "Task_1" },
                { "id": "signatures", "taskId": "Task_1", "taskIds": ["Task_2"] },
                { "id": "old", "taskId": "" }
              ]
            }
            """
        );
        await DataTypeTaskIdsMigration.Migrate(_app.Root);
        var afterFirstRun = _app.Read(MetadataPath);

        var second = await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(afterFirstRun, _app.Read(MetadataPath));
        Assert.Empty(second.Messages);
    }

    [Theory]
    [InlineData("""{ "id": "ttd/app" }""")]
    [InlineData("""{ "id": "ttd/app", "dataTypes": [] }""")]
    [InlineData("""{ "id": "ttd/app", "dataTypes": [{ "id": "a", "taskIds": ["Task_1"] }] }""")]
    public async Task ReportsNothingWhenNoDataTypeHasATaskId(string content)
    {
        _app.Write(MetadataPath, content);

        var result = await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.Read(MetadataPath));
        Assert.Empty(result.Messages);
    }

    public static TheoryData<byte[]> UnreadableFiles =>
        new()
        {
            // Not JSON
            Encoding.UTF8.GetBytes("""{ "dataTypes": [{ "id": "a", "taskId": "Task_1" }"""),
            // Not UTF-8
            Encoding.Latin1.GetBytes("""{ "dataTypes": [{ "id": "søknad", "taskId": "Task_1" }] }"""),
            // A comment, which the v9 app cannot read
            Encoding.UTF8.GetBytes("""{ /* c */ "dataTypes": [{ "id": "a", "taskId": "Task_1" }] }"""),
        };

    [Theory]
    [MemberData(nameof(UnreadableFiles))]
    public async Task ReportsATodoWhenTheFileCannotBeRead(byte[] content)
    {
        _app.WriteBytes(MetadataPath, content);

        var result = await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.ReadBytes(MetadataPath));
        Assert.Contains($"Could not read {MetadataPath}", Assert.Single(result.Todos));
        Assert.Single(result.Messages);
    }

    [Fact]
    public async Task BoundTasksAreTheSameBeforeAndAfterTheMigration()
    {
        _app.Write(
            MetadataPath,
            """
            {
              "dataTypes": [
                { "id": "replaced", "taskId": "Task_1" },
                { "id": "listed", "taskId": "Task_1", "taskIds": ["Task_1", "Task_2"] },
                { "id": "notListed", "taskId": "Task_1", "taskIds": ["Task_2"] },
                { "id": "empty", "taskId": "" },
                { "id": "notAString", "taskId": 5 },
                { "id": "notAList", "taskId": "Task_1", "taskIds": "Task_1" },
                { "id": "several", "taskId": "Task_1", "TaskId": "" },
                { "id": "unbound" }
              ]
            }
            """
        );
        string[][] expected =
        [
            ["Task_1"],
            ["Task_1", "Task_2"],
            ["Task_2"],
            [],
            [],
            [],
            [],
            [],
        ];
        Assert.Equal(expected, BoundTasks());

        await DataTypeTaskIdsMigration.Migrate(_app.Root);

        Assert.Equal(expected, BoundTasks());
    }

    private string[][] BoundTasks()
    {
        using var metadata = JsonDocument.Parse(_app.Read(MetadataPath));
        return
        [
            .. metadata
                .RootElement.GetProperty("dataTypes")
                .EnumerateArray()
                .Select(dataType => DataTypeTaskIdsMigration.BoundTasks(dataType).ToArray()),
        ];
    }
}
