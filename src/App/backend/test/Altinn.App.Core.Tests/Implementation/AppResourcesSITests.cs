using System.Text;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Internal.App;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Implementation;

public class AppResourcesSITests
{
    private const string ApplicationMetadataJson = """
        {
            "id": "ttd/app",
            "org": "ttd",
            "dataTypes": [
                { "id": "main", "appLogic": { "classRef": "Model.Main" } }
            ]
        }
        """;

    private async Task<AppResourcesSI> CreateAppResources(DirectoryInfo appDir)
    {
        if (!File.Exists(Path.Join(appDir.FullName, "config", "applicationmetadata.json")))
        {
            WriteApplicationMetadata(appDir);
        }
        var appFiles = await TestAppFiles.Load(appDir.FullName);
        var frontendFeatures = new Mock<IFrontendFeatures>();
        frontendFeatures.Setup(f => f.GetDictionary()).Returns(new Dictionary<string, bool>());
        return new AppResourcesSI(appFiles, new AppMetadata(appFiles, frontendFeatures.Object));
    }

    [Fact]
    public async Task GetUiConfiguration_loads_folder_settings_and_global_settings()
    {
        var tempDir = Directory.CreateTempSubdirectory("AppResourcesSI-UiConfig-");
        try
        {
            var uiDir = Path.Join(tempDir.FullName, "ui");
            Directory.CreateDirectory(Path.Join(uiDir, "Task_1"));
            Directory.CreateDirectory(Path.Join(uiDir, "subform"));

            File.WriteAllText(
                Path.Join(uiDir, "Task_1", "Settings.json"),
                """{ "defaultDataType": "main", "pages": { "order": ["page1"] } }"""
            );
            File.WriteAllText(Path.Join(uiDir, "subform", "Settings.json"), """{ "pages": { "order": ["sub1"] } }""");
            File.WriteAllText(Path.Join(uiDir, "Settings.json"), """{ "showProgress": true }""");

            AppResourcesSI appResources = await CreateAppResources(tempDir);

            UiConfiguration ui =
                appResources.GetUiConfiguration()
                ?? throw new InvalidOperationException("Expected UI configuration to be loaded");

            ui.Settings.Should().NotBeNull();
            ui.Settings!.ShowProgress.Should().BeTrue();
            ui.Folders.Keys.Should().BeEquivalentTo(["Task_1", "subform"]);
            ui.Folders["Task_1"].DefaultDataType.Should().Be("main");
        }
        finally
        {
            Directory.Delete(tempDir.FullName, true);
        }
    }

    [Fact]
    public async Task GetLayoutModelForFolder_returns_null_when_folder_does_not_exist()
    {
        var tempDir = Directory.CreateTempSubdirectory("AppResourcesSI-LayoutModel-");
        try
        {
            WriteApplicationMetadata(tempDir);
            var uiDir = Path.Join(tempDir.FullName, "ui");
            Directory.CreateDirectory(Path.Join(uiDir, "Task_1", "layouts"));

            File.WriteAllText(
                Path.Join(uiDir, "Task_1", "Settings.json"),
                """{ "defaultDataType": "main", "pages": { "order": ["page1"] } }"""
            );
            File.WriteAllText(Path.Join(uiDir, "Task_1", "layouts", "page1.json"), """{ "data": [] }""");

            AppResourcesSI appResources = await CreateAppResources(tempDir);

            var model = appResources.GetLayoutModelForFolder("Task_PDF_Auto");

            model.Should().BeNull();
        }
        finally
        {
            Directory.Delete(tempDir.FullName, true);
        }
    }

    [Fact]
    public async Task GetLayoutModelForFolder_reads_data_types_from_application_metadata()
    {
        var tempDir = Directory.CreateTempSubdirectory("AppResourcesSI-LayoutModel-");
        try
        {
            WriteApplicationMetadata(tempDir);
            var uiDir = Path.Join(tempDir.FullName, "ui");
            Directory.CreateDirectory(Path.Join(uiDir, "Task_1", "layouts"));

            File.WriteAllText(
                Path.Join(uiDir, "Task_1", "Settings.json"),
                """{ "defaultDataType": "main", "pages": { "order": ["page1"] } }"""
            );
            File.WriteAllText(Path.Join(uiDir, "Task_1", "layouts", "page1.json"), """{ "data": { "layout": [] } }""");

            AppResourcesSI appResources = await CreateAppResources(tempDir);

            var model = appResources.GetLayoutModelForFolder("Task_1");

            model.Should().NotBeNull();
            model!.DefaultDataType.Id.Should().Be("main");
            appResources.GetClassRefForLogicDataType("main").Should().Be("Model.Main");
            appResources.GetClassRefForLogicDataType("missing").Should().BeEmpty();
        }
        finally
        {
            Directory.Delete(tempDir.FullName, true);
        }
    }

    [Fact]
    public async Task GetLayoutModelForFolder_accepts_json_with_bom()
    {
        var tempDir = Directory.CreateTempSubdirectory("AppResourcesSI-Bom-");
        try
        {
            WriteApplicationMetadata(tempDir);
            var uiDir = Path.Join(tempDir.FullName, "ui");
            Directory.CreateDirectory(Path.Join(uiDir, "Task_1", "layouts"));

            WriteAllTextWithBom(
                Path.Join(uiDir, "Task_1", "Settings.json"),
                """{ "defaultDataType": "main", "pages": { "order": ["page1"] } }"""
            );
            WriteAllTextWithBom(
                Path.Join(uiDir, "Task_1", "layouts", "page1.json"),
                """{ "data": { "layout": [] } }"""
            );

            AppResourcesSI appResources = await CreateAppResources(tempDir);

            var model = appResources.GetLayoutModelForFolder("Task_1");

            model.Should().NotBeNull();
        }
        finally
        {
            Directory.Delete(tempDir.FullName, true);
        }
    }

    [Fact]
    public async Task GetTexts_accepts_json_with_bom()
    {
        var tempDir = Directory.CreateTempSubdirectory("AppResourcesSI-Bom-");
        try
        {
            var textsDir = Path.Join(tempDir.FullName, "config", "texts");
            Directory.CreateDirectory(textsDir);
            WriteAllTextWithBom(
                Path.Join(textsDir, "resource.nb.json"),
                """{ "language": "nb", "resources": [{ "id": "some.id", "value": "Bokmål" }] }"""
            );

            AppResourcesSI appResources = await CreateAppResources(tempDir);

            TextResource? textResource = await appResources.GetTexts("ttd", "app", "nb");

            textResource.Should().NotBeNull();
            textResource!.Resources.Should().ContainSingle(r => r.Id == "some.id" && r.Value == "Bokmål");
        }
        finally
        {
            Directory.Delete(tempDir.FullName, true);
        }
    }

    [Fact]
    public async Task GetText_strips_bom()
    {
        var tempDir = Directory.CreateTempSubdirectory("AppResourcesSI-Bom-");
        try
        {
            var textsDir = Path.Join(tempDir.FullName, "config", "texts");
            Directory.CreateDirectory(textsDir);
            WriteAllTextWithBom(Path.Join(textsDir, "resource.nb.json"), """{ "language": "nb" }""");

            AppResourcesSI appResources = await CreateAppResources(tempDir);

            byte[] text = appResources.GetText("ttd", "app", "resource.nb.json");

            using var document = System.Text.Json.JsonDocument.Parse(text.AsMemory());
            document.RootElement.GetProperty("language").GetString().Should().Be("nb");
        }
        finally
        {
            Directory.Delete(tempDir.FullName, true);
        }
    }

    private static void WriteApplicationMetadata(DirectoryInfo appDir)
    {
        var configDir = Path.Join(appDir.FullName, "config");
        Directory.CreateDirectory(configDir);
        File.WriteAllText(Path.Join(configDir, "applicationmetadata.json"), ApplicationMetadataJson);
    }

    private static void WriteAllTextWithBom(string path, string contents) =>
        File.WriteAllText(path, contents, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
}
