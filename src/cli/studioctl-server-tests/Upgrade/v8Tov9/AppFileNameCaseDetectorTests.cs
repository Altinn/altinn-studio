using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class AppFileNameCaseDetectorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private MigrationResult Detect() => new AppFileNameCaseDetector(Path.Combine(_app.Root, "App")).Detect();

    private static IEnumerable<string> Findings(MigrationResult result) =>
        result.Warnings.Where(w => w.Contains("rename", StringComparison.Ordinal)).Select(f => f.Replace('\\', '/'));

    [Fact]
    public void Is_quiet_for_an_app_with_the_names_v9_reads()
    {
        _app.Write("config/applicationmetadata.json", "{}");
        _app.Write("config/authorization/policy.xml", "<p/>");
        _app.Write("config/process/process.bpmn", "<p/>");
        _app.Write("config/texts/resource.nb.json", "{}");
        _app.Write("models/model.schema.json", "{}");
        _app.Write("models/model.cs", "");
        _app.Write("options/land.json", "[]");
        _app.Write("options/Land.json", "[]");
        _app.Write("ui/Settings.json", "{}");
        _app.Write("ui/footer.json", "{}");
        _app.Write("ui/Task_1/Settings.json", "{}");
        _app.Write("ui/Task_1/layouts/page1.json", "{}");
        _app.Write("wwwroot/custom-css/a.css", "");

        Assert.Empty(Detect().Messages);
    }

    /// <summary>
    /// Every entry here is spelled in a case v9 does not read, and none has a correctly spelled twin, so each is
    /// reported with the name to use - on a case-sensitive file system as well as a case-insensitive one.
    /// </summary>
    [Fact]
    public void Reports_names_that_differ_only_in_case_with_the_name_to_use()
    {
        _app.Write("config/applicationmetadata.json", "{}");
        _app.Write("config/texts/Resource.en.json", "{}");
        _app.Write("models/other.Schema.json", "{}");
        _app.Write("options/kommuner.JSON", "[]");
        _app.Write("ui/settings.json", "{}");
        _app.Write("ui/Footer.json", "{}");
        _app.Write("ui/Task_2/settings.json", "{}");
        _app.Write("ui/Task_2/Layouts/page2.json", "{}");
        _app.Write("wwwroot/Custom-CSS/a.css", "");

        var result = Detect();

        Assert.True(result.RequiresManualFollowUp);
        Assert.Equal(
            [
                "config/texts/Resource.en.json: rename the file to resource.en.json",
                "models/other.Schema.json: rename the file to other.schema.json",
                "options/kommuner.JSON: rename the file to kommuner.json",
                "ui/Footer.json: rename the file to footer.json",
                "ui/Task_2/Layouts: rename the folder to layouts",
                "ui/Task_2/settings.json: rename the file to Settings.json",
                "ui/settings.json: rename the file to Settings.json",
                "wwwroot/Custom-CSS: rename the folder to custom-css",
            ],
            Findings(result)
        );
    }

    [Fact]
    public void Reports_a_top_level_folder_with_the_wrong_case_and_does_not_look_inside_it()
    {
        _app.Write("Config/ApplicationMetadata.json", "{}");
        _app.Write("Models/model.Schema.json", "{}");

        var result = Detect();

        Assert.Equal(["Config: rename the folder to config", "Models: rename the folder to models"], Findings(result));
    }

    [Fact]
    public void Is_quiet_for_an_app_folder_that_does_not_exist()
    {
        Assert.Empty(new AppFileNameCaseDetector(Path.Combine(_app.Root, "missing")).Detect().Messages);
    }
}
