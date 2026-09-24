using System.Text;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Tests.Internal.App;

public sealed class AppFilesLoaderTests : IDisposable
{
    private static readonly UTF8Encoding _utf8WithBom = new(encoderShouldEmitUTF8Identifier: true);

    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("AppFilesLoader-");

    public void Dispose() => _appDir.Delete(recursive: true);

    private Task<AppFiles> Load() => AppFilesLoader.Load(_appDir.FullName, default);

    private void WriteFile(string relativePath, string content, Encoding? encoding = null)
    {
        string path = Path.Join(_appDir.FullName, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content, encoding ?? new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
    }

    private void WriteStandardApp()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""", _utf8WithBom);
        WriteFile("config/authorization/policy.xml", "<policy />");
        WriteFile("config/process/process.bpmn", "<process />");
        WriteFile("config/texts/resource.nb.json", """{ "language": "nb", "resources": [] }""", _utf8WithBom);
        WriteFile("config/texts/resource.nn.json", """{ "language": "nn", "resources": [] }""");
        WriteFile("config/texts/resource.en-GB.json", """{ "language": "en-GB", "resources": [] }""");
        WriteFile("config/texts/readme.txt", "not a text resource");
        WriteFile("config/assets.json", """{ "stylesheets": [], "scripts": [] }""");
        WriteFile("config/unrelated.json", "not json, but not an app file either");
        WriteFile("views/Home/Index.cshtml", "@page");
        WriteFile("wwwroot/custom-css/b.css", "body {}");
        WriteFile("wwwroot/custom-css/a.css", "html {}");
        WriteFile("wwwroot/custom-js/x.js", "console.log(1)");
        WriteFile("models/model.schema.json", """{ "type": "object" }""");
        WriteFile("models/model.xsd", "<schema />");
        WriteFile("models/model.validation.json", """{ "validations": [] }""");
        WriteFile("models/model.calculation.json", """{ "calculations": [] }""");
        WriteFile("models/model.v2.prefill.json", """{ "ER": {} }""");
        WriteFile("models/model.cs", "public class Model { }");
        WriteFile("options/kommuner.json", """[{ "value": "0301", "label": "Oslo" }]""");
        WriteFile("options/land.json", """[{ "value": "NO", "label": "Norge" }]""", _utf8WithBom);
        WriteFile("options/readme.txt", "not an option list");
        WriteFile("ui/Settings.json", """{ "showProgress": true }""");
        WriteFile("ui/footer.json", """{ "footer": [] }""");
        WriteFile("ui/b/Settings.json", """{ "pages": { "order": ["page1"] } }""");
        WriteFile("ui/b/layouts/page1.json", """{ "data": { "layout": [] } }""");
        WriteFile("ui/a/Settings.json", """{ "pages": { "order": ["page2", "page1"] } }""", _utf8WithBom);
        WriteFile("ui/a/layouts/page2.json", """{ "data": { "layout": [] } }""");
        WriteFile("ui/a/layouts/page1.json", """{ "data": { "layout": [] } }""");
        WriteFile("ui/a/layouts/notes.txt", "not a layout");
        WriteFile("ui/a/RuleHandler.js", "// not loaded");
        WriteFile("ui/empty/readme.txt", "a folder without settings or layouts");
    }

    [Fact]
    public async Task The_files_are_loaded_into_their_typed_place_without_bom()
    {
        WriteStandardApp();
        var files = await Load();

        Assert.Equal("""{ "id": "ttd/app" }""", AsString(files.ApplicationMetadata));
        Assert.Equal("<policy />", AsString(files.XacmlPolicy));
        Assert.Equal("<process />", AsString(files.ProcessDefinition));
        Assert.Equal("""{ "stylesheets": [], "scripts": [] }""", AsString(files.FrontendAssets));

        Assert.Equal(["en-GB", "nb", "nn"], files.GetTextResourceLanguages());
        Assert.Equal("""{ "language": "nb", "resources": [] }""", AsString(files.GetTextResource("nb")));

        Assert.Null(files.GetModelFiles("missing"));
        var model = files.GetModelFiles("model")!;
        Assert.Equal("""{ "type": "object" }""", AsString(model.JsonSchema));
        Assert.Equal("<schema />", AsString(model.XsdSchema));
        Assert.Equal("""{ "validations": [] }""", AsString(model.ValidationConfiguration));
        Assert.Equal("""{ "calculations": [] }""", AsString(model.CalculationConfiguration));
        Assert.Null(model.Prefill);
        Assert.Equal("""{ "ER": {} }""", AsString(files.GetModelFiles("model.v2")!.Prefill));

        Assert.Equal(["kommuner", "land"], files.GetOptionIds());
        Assert.Equal("""[{ "value": "NO", "label": "Norge" }]""", AsString(files.GetOptions("land")));

        Assert.Equal("""{ "showProgress": true }""", AsString(files.Ui.Settings));
        Assert.Equal("""{ "footer": [] }""", AsString(files.Ui.Footer));
        Assert.Equal(["a", "b"], files.Ui.GetFolderIds());
        var folder = files.Ui.GetFolder("a")!;
        Assert.Equal("""{ "pages": { "order": ["page2", "page1"] } }""", AsString(folder.Settings));
        Assert.Equal(["page1", "page2"], folder.GetLayoutPages());
        Assert.Equal("""{ "data": { "layout": [] } }""", AsString(folder.GetLayout("page2")));

        Assert.Equal(["a.css", "b.css"], files.GetCustomCssFileNames());
        Assert.Equal(["x.js"], files.GetCustomJsFileNames());
        Assert.True(files.HasLegacyIndexPage);
    }

    [Fact]
    public async Task An_app_with_only_application_metadata_has_nothing_else()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        var files = await Load();

        Assert.Empty(files.GetTextResourceLanguages());
        Assert.Null(files.GetModelFiles("model"));
        Assert.Empty(files.GetOptionIds());
        Assert.Empty(files.Ui.GetFolderIds());
        Assert.Null(files.Ui.Settings);
        Assert.Null(files.FrontendAssets);
        Assert.Empty(files.GetCustomCssFileNames());
        Assert.False(files.HasLegacyIndexPage);
        Assert.Throws<FileNotFoundException>(() => files.XacmlPolicy);
        var exception = Assert.Throws<ApplicationConfigException>(() => files.ProcessDefinition);
        Assert.Contains("process.bpmn", exception.Message);
    }

    [Fact]
    public async Task Loading_fails_without_the_application_metadata_file()
    {
        WriteFile("ui/Settings.json", "{}");

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() => Load());

        Assert.Contains("config/applicationmetadata.json", exception.Message);
    }

    [Fact]
    public async Task Loading_reports_every_app_json_file_that_does_not_parse()
    {
        WriteStandardApp();
        WriteFile("ui/a/layouts/page1.json", """{ "data": { "layout": [ } }""");
        WriteFile("config/texts/resource.en.json", "not json");
        WriteFile("models/model.xsd", "<not-json-so-not-validated");

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() => Load());

        Assert.Contains("config/texts/resource.en.json", exception.Message);
        Assert.Contains("ui/a/layouts/page1.json", exception.Message);
        Assert.DoesNotContain("model.xsd", exception.Message);
        Assert.DoesNotContain("page2.json", exception.Message);
        // Only files the app reads are loaded, so an unrelated broken file does not stop the app
        Assert.DoesNotContain("unrelated.json", exception.Message);
    }

    [Fact]
    public async Task Names_are_matched_case_sensitively_on_every_operating_system()
    {
        // The scanner lists the folders and matches names ordinally, so these are not found even on a
        // case-insensitive file system, where a path lookup would have succeeded
        WriteFile("config/ApplicationMetadata.json", """{ "id": "ttd/app" }""");
        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() => Load());
        Assert.Contains("config/applicationmetadata.json", exception.Message);

        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        WriteFile("ui/settings.json", "{}");
        WriteFile("Options/land.json", "[]");
        WriteFile("options/KOMMUNER.JSON", "[]");
        WriteFile("Models/model.schema.json", "{}");
        var files = await Load();

        Assert.Null(files.Ui.Settings);
        Assert.Empty(files.GetOptionIds());
        Assert.Null(files.GetModelFiles("model"));
    }

    [Fact]
    public async Task Names_that_look_like_paths_are_just_missing_keys()
    {
        WriteStandardApp();
        var files = await Load();

        Assert.Null(files.GetTextResource("../applicationmetadata"));
        Assert.Null(files.GetOptions("../config/applicationmetadata"));
        Assert.Null(files.Ui.GetFolder(".."));
        Assert.Null(files.Ui.GetFolder("a")!.GetLayout("../Settings"));
    }

    [Fact]
    public async Task A_scan_matches_the_snapshot_until_a_file_changes()
    {
        WriteStandardApp();
        var files = await Load();

        Assert.True(files.IsLoadedFrom(AppFilesLoader.Scan(_appDir.FullName)));

        File.Delete(Path.Join(_appDir.FullName, "ui/a/layouts/page1.json"));
        Assert.False(files.IsLoadedFrom(AppFilesLoader.Scan(_appDir.FullName)));
    }

    [Fact]
    public void The_empty_snapshot_explains_that_the_files_were_not_loaded()
    {
        var exception = Assert.Throws<ApplicationConfigException>(() => AppFiles.Empty.ApplicationMetadata);
        Assert.Contains("await services.AddAltinnAppServices", exception.Message);
    }

    private static string? AsString(ReadOnlyMemory<byte>? bytes) =>
        bytes is { } value ? Encoding.UTF8.GetString(value.Span) : null;
}
