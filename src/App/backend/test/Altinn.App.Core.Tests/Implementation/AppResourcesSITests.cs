using System.Text;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Implementation;

public class AppResourcesSITests
{
    private readonly TelemetrySink _telemetry = new();

    [Fact]
    public void GetUiConfiguration_loads_folder_settings_and_global_settings()
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

            var appSettings = new AppSettings { AppBasePath = tempDir.FullName, UiFolder = "ui" };
            var appMetadata = new Mock<IAppMetadata>();
            appMetadata
                .Setup(m => m.GetApplicationMetadata())
                .ReturnsAsync(
                    new ApplicationMetadata("ttd/app")
                    {
                        DataTypes =
                        [
                            new()
                            {
                                Id = "main",
                                AppLogic = new() { ClassRef = "Model.Main" },
                            },
                        ],
                    }
                );

            AppResourcesSI appResources = new(
                Options.Create(appSettings),
                appMetadata.Object,
                null!,
                _telemetry.Object
            );

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
    public void GetLayoutModelForFolder_returns_null_when_folder_does_not_exist()
    {
        var tempDir = Directory.CreateTempSubdirectory("AppResourcesSI-LayoutModel-");
        try
        {
            var uiDir = Path.Join(tempDir.FullName, "ui");
            Directory.CreateDirectory(Path.Join(uiDir, "Task_1"));
            Directory.CreateDirectory(Path.Join(uiDir, "Task_1", "layouts"));

            File.WriteAllText(
                Path.Join(uiDir, "Task_1", "Settings.json"),
                """{ "defaultDataType": "main", "pages": { "order": ["page1"] } }"""
            );
            File.WriteAllText(Path.Join(uiDir, "Task_1", "layouts", "page1.json"), """{ "data": [] }""");

            var appSettings = new AppSettings { AppBasePath = tempDir.FullName, UiFolder = "ui" };
            var appMetadata = new Mock<IAppMetadata>();
            appMetadata
                .Setup(m => m.GetApplicationMetadata())
                .ReturnsAsync(
                    new ApplicationMetadata("ttd/app")
                    {
                        DataTypes =
                        [
                            new()
                            {
                                Id = "main",
                                AppLogic = new() { ClassRef = "Model.Main" },
                            },
                        ],
                    }
                );

            AppResourcesSI appResources = new(
                Options.Create(appSettings),
                appMetadata.Object,
                null!,
                _telemetry.Object
            );

            var model = appResources.GetLayoutModelForFolder("Task_PDF_Auto");

            model.Should().BeNull();
        }
        finally
        {
            Directory.Delete(tempDir.FullName, true);
        }
    }

    [Fact]
    public void GetLayoutModelForFolder_accepts_json_with_bom()
    {
        var tempDir = Directory.CreateTempSubdirectory("AppResourcesSI-Bom-");
        try
        {
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

            var appSettings = new AppSettings { AppBasePath = tempDir.FullName, UiFolder = "ui" };
            var appMetadata = new Mock<IAppMetadata>();
            appMetadata
                .Setup(m => m.GetApplicationMetadata())
                .ReturnsAsync(
                    new ApplicationMetadata("ttd/app")
                    {
                        DataTypes =
                        [
                            new()
                            {
                                Id = "main",
                                AppLogic = new() { ClassRef = "Model.Main" },
                            },
                        ],
                    }
                );

            AppResourcesSI appResources = new(
                Options.Create(appSettings),
                appMetadata.Object,
                null!,
                _telemetry.Object
            );

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

            AppResourcesSI appResources = new(
                Options.Create(new AppSettings { AppBasePath = tempDir.FullName }),
                Mock.Of<IAppMetadata>(),
                null!,
                _telemetry.Object
            );

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
    public void GetText_strips_bom()
    {
        var tempDir = Directory.CreateTempSubdirectory("AppResourcesSI-Bom-");
        try
        {
            var textsDir = Path.Join(tempDir.FullName, "config", "texts");
            Directory.CreateDirectory(textsDir);
            WriteAllTextWithBom(Path.Join(textsDir, "resource.nb.json"), """{ "language": "nb" }""");

            AppResourcesSI appResources = new(
                Options.Create(new AppSettings { AppBasePath = tempDir.FullName }),
                Mock.Of<IAppMetadata>(),
                null!,
                _telemetry.Object
            );

            byte[] text = appResources.GetText("ttd", "app", "resource.nb.json");

            using var document = System.Text.Json.JsonDocument.Parse(text.AsMemory());
            document.RootElement.GetProperty("language").GetString().Should().Be("nb");
        }
        finally
        {
            Directory.Delete(tempDir.FullName, true);
        }
    }

    private static void WriteAllTextWithBom(string path, string contents) =>
        File.WriteAllText(path, contents, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
}
