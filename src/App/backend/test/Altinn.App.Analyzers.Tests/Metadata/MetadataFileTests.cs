using Altinn.App.Analyzers.Metadata;
using Altinn.App.Analyzers.Tests.Fixtures;

namespace Altinn.App.Analyzers.Tests.Metadata;

public sealed class MetadataFileTests
{
    [Theory]
    [InlineData("")]
    [InlineData(" // final comment")]
    [InlineData(" /* final comment */")]
    public void Comments_and_trailing_commas_preserve_task_bindings_and_locations(string suffix)
    {
        const string json = """
            // App metadata
            {
                "dataTypes": [
                    { "id": "model", "taskIds": [/* binding */ "Task_1",], },
                ],
            }
            """;
        var file = new InMemoryAdditionalText("/repo/App/config/applicationmetadata.json", json + suffix);

        var content = MetadataFile.TryRead(file, CancellationToken.None);

        Assert.NotNull(content);
        var model = Assert.Single(content.DataTypes.All);
        Assert.Equal("model", model.Id);
        Assert.NotNull(model.TaskIds);
        var task = Assert.Single(model.TaskIds);
        Assert.Equal("Task_1", task.Value);
        Assert.Equal("\"Task_1\"", json.Substring(task.Start, task.End - task.Start));
    }

    [Theory]
    [InlineData("/* unterminated")]
    [InlineData("// comment\n unexpected")]
    [InlineData("{}")]
    public void Invalid_content_after_the_document_is_not_accepted(string suffix)
    {
        var file = new InMemoryAdditionalText(
            "/repo/App/config/applicationmetadata.json",
            "{\"dataTypes\":[]}" + suffix
        );

        Assert.Null(MetadataFile.TryRead(file, CancellationToken.None));
    }
}
