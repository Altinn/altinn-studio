using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Moq;
using ApplicationLanguage = Altinn.App.Core.Internal.Language.ApplicationLanguage;

namespace Altinn.App.Core.Tests.Internal.App;

public sealed class AppFileJsonCompatibilityTests : IDisposable
{
    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("AppFileJson-");

    public void Dispose() => _appDir.Delete(recursive: true);

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(true, true)]
    public async Task Files_accepted_at_ingestion_are_read_by_runtime_consumers(bool comments, bool trailingCommas)
    {
        string Json(string properties) =>
            "{" + (comments ? "/* configuration */\n" : "") + properties + (trailingCommas ? "," : "") + "}";

        string metadataJson = Json("\"id\": \"ttd/app\", \"dataTypes\": []");
        string textJson = Json("\"language\": \"nb\", \"resources\": [{\"id\":\"title\",\"value\":\"Hello\"}]");
        WriteFile("config/applicationmetadata.json", metadataJson);
        WriteFile("config/texts/resource.nb.json", textJson);
        WriteFile("ui/Settings.json", Json("\"autoSaveBehavior\": \"onChangePage\""));
        WriteFile("ui/task/Settings.json", Json("\"defaultDataType\": \"model\", \"pages\": {\"order\":[\"page\"]}"));
        WriteFile("ui/task/layouts/page.json", Json("\"data\": {\"layout\": []}"));
        WriteFile("ui/footer.json", Json("\"footer\": []"));
        WriteFile(
            "options/choices.json",
            "[" + Json("\"label\": \"Choice\", \"value\": \"value\"") + (trailingCommas ? "," : "") + "]"
        );
        WriteFile("config/assets.json", Json("\"scripts\": [{\"url\":\"/example.js\"}], \"stylesheets\": []"));
        var files = TestAppFiles.Load(_appDir.FullName);
        var features = new Mock<IFrontendFeatures>();
        features.Setup(f => f.GetDictionary()).Returns(new Dictionary<string, bool>());
        var metadata = new AppMetadata(files, features.Object);
        var resources = new AppResourcesSI(files, metadata);

        Assert.Equal("ttd/app", metadata.ApplicationMetadata.Id);
        var language = Assert.Single(await new ApplicationLanguage(files).GetApplicationLanguages());
        Assert.Equal("nb", language.Language);
        var texts = await resources.GetTexts("ttd", "app", "nb");
        Assert.NotNull(texts);
        Assert.Equal("Hello", Assert.Single(texts.Resources).Value);
        var ui = resources.GetUiConfiguration();
        Assert.NotNull(ui);
        Assert.NotNull(ui.Settings);
        Assert.Equal(AutoSaveBehavior.OnChangePage, ui.Settings.AutoSaveBehavior);
        Assert.Equal("model", ui.Folders["task"].DefaultDataType);
        using var layouts = JsonDocument.Parse(resources.GetLayoutsInFolder("task"));
        Assert.Equal(
            JsonValueKind.Array,
            layouts.RootElement.GetProperty("page").GetProperty("data").GetProperty("layout").ValueKind
        );
        var options = await new AppOptionsFileHandler(files).ReadOptionsFromFile("choices");
        Assert.NotNull(options);
        Assert.Equal("value", Assert.Single(options).Value);
        var html = await new IndexPageGenerator(features.Object, files).Generate(
            "ttd",
            "app",
            new BootstrapGlobalResponse
            {
                ApplicationMetadata = metadata.ApplicationMetadata,
                Ui = ui,
                AvailableLanguages = [language],
                PlatformFrontendSettings = new PlatformFrontendSettings(),
            }
        );
        Assert.Contains("<script src=\"/example.js\"></script>", html);

        // Parsing for bootstrap must not rewrite raw resource getters or the snapshot.
        Assert.Equal(textJson, Encoding.UTF8.GetString(resources.GetText("ttd", "app", "resource.nb.json")));
        Assert.Equal(metadataJson, Encoding.UTF8.GetString(files.Current.ApplicationMetadata.Span));
    }

    [Fact]
    public void Invalid_syntax_reports_the_source_filename_and_original_line()
    {
        WriteFile("config/applicationmetadata.json", "{\n// accepted comment\n\"id\": invalid\n}");

        var exception = Assert.Throws<ApplicationConfigException>(() => TestAppFiles.Load(_appDir.FullName));

        Assert.Contains("config/applicationmetadata.json", exception.Message);
        Assert.Contains("LineNumber: 2", exception.Message);
    }

    private void WriteFile(string path, string content)
    {
        string fullPath = Path.Join(_appDir.FullName, path);
        Directory.CreateDirectory(
            Path.GetDirectoryName(fullPath) ?? throw new InvalidOperationException("Missing directory")
        );
        File.WriteAllText(fullPath, content, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
    }
}
