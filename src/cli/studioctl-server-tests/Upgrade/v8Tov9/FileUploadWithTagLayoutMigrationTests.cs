using System.Text;
using System.Text.Json;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class FileUploadWithTagLayoutMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task RewritesFileUploadWithTagComponentTypeToFileUpload()
    {
        _app.Write(
            "ui/Task_1/layouts/form.json",
            """
            { "data": { "layout": [{ "id": "attachment", "type": "FileUploadWithTag", "optionsId": "tags" }] } }
            """
        );

        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var exitCode = await FileUploadWithTagLayoutMigration.Migrate(_app.Root);

        var after = _app.Read("ui/Task_1/layouts/form.json");
        Assert.Equal(0, exitCode);
        Assert.Contains("\"type\": \"FileUpload\"", after, StringComparison.Ordinal);
        Assert.DoesNotContain("FileUploadWithTag", after, StringComparison.Ordinal);
        Assert.Contains("\"optionsId\": \"tags\"", after, StringComparison.Ordinal);
        using var _ = JsonDocument.Parse(after);
    }

    [Fact]
    public async Task PreservesUtf8BomAndLeavesNonLayoutFilesUntouched()
    {
        var layout = "{ \"data\": { \"layout\": [{ \"type\": \"FileUploadWithTag\" }] } }";
        _app.WriteBytes(
            "ui/Task_1/layouts/form.json",
            Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(layout)).ToArray()
        );
        _app.Write("ui/Task_1/Settings.json", "{ \"type\": \"FileUploadWithTag\" }");

        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        await FileUploadWithTagLayoutMigration.Migrate(_app.Root);

        var bytes = _app.ReadBytes("ui/Task_1/layouts/form.json");
        Assert.True(bytes.AsSpan().StartsWith(Encoding.UTF8.GetPreamble()));
        Assert.Contains("FileUpload\"", Encoding.UTF8.GetString(bytes), StringComparison.Ordinal);
        Assert.Contains("FileUploadWithTag", _app.Read("ui/Task_1/Settings.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task PreservesCrLfLineEndingsAndTrailingNewline()
    {
        _app.Write(
            "ui/Task_1/layouts/form.json",
            "{\r\n  \"data\": { \"layout\": [{ \"type\": \"FileUploadWithTag\" }] }\r\n}\r\n"
        );

        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        await FileUploadWithTagLayoutMigration.Migrate(_app.Root);

        var after = _app.Read("ui/Task_1/layouts/form.json");
        Assert.DoesNotContain("\n", after.Replace("\r\n", string.Empty, StringComparison.Ordinal));
        Assert.EndsWith("\r\n", after, StringComparison.Ordinal);
    }
}
