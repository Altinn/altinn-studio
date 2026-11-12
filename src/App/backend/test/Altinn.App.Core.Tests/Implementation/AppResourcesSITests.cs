using System.Collections.Immutable;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Calculation;
using Altinn.App.Core.Tests.Internal.App;
using Altinn.App.Core.Tests.TestUtils;
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

    private AppResourcesSI CreateAppResources(DirectoryInfo appDir)
    {
        if (!File.Exists(Path.Join(appDir.FullName, "config", "applicationmetadata.json")))
        {
            WriteApplicationMetadata(appDir);
        }
        var appFiles = TestAppFiles.Load(appDir.FullName);
        var frontendFeatures = new Mock<IFrontendFeatures>();
        frontendFeatures.Setup(f => f.GetDictionary()).Returns(new Dictionary<string, bool>());
        return new AppResourcesSI(appFiles, new AppMetadata(appFiles, frontendFeatures.Object));
    }

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

            AppResourcesSI appResources = CreateAppResources(tempDir);

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
            WriteApplicationMetadata(tempDir);
            var uiDir = Path.Join(tempDir.FullName, "ui");
            Directory.CreateDirectory(Path.Join(uiDir, "Task_1", "layouts"));

            File.WriteAllText(
                Path.Join(uiDir, "Task_1", "Settings.json"),
                """{ "defaultDataType": "main", "pages": { "order": ["page1"] } }"""
            );
            File.WriteAllText(Path.Join(uiDir, "Task_1", "layouts", "page1.json"), """{ "data": [] }""");

            AppResourcesSI appResources = CreateAppResources(tempDir);

            var model = appResources.GetLayoutModelForFolder("Task_PDF_Auto");

            model.Should().BeNull();
        }
        finally
        {
            Directory.Delete(tempDir.FullName, true);
        }
    }

    [Fact]
    public void GetLayoutModelForFolder_reads_data_types_from_application_metadata()
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

            AppResourcesSI appResources = CreateAppResources(tempDir);

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
    public void GetLayoutModelForFolder_finds_a_data_type_the_apps_own_IAppMetadata_adds()
    {
        var tempDir = Directory.CreateTempSubdirectory("AppResourcesSI-LayoutModel-");
        try
        {
            WriteApplicationMetadata(tempDir);
            var uiDir = Path.Join(tempDir.FullName, "ui");
            Directory.CreateDirectory(Path.Join(uiDir, "Task_1", "layouts"));

            File.WriteAllText(
                Path.Join(uiDir, "Task_1", "Settings.json"),
                """{ "defaultDataType": "added", "pages": { "order": ["page1"] } }"""
            );
            File.WriteAllText(Path.Join(uiDir, "Task_1", "layouts", "page1.json"), """{ "data": { "layout": [] } }""");

            var appFiles = TestAppFiles.Load(tempDir.FullName);
            var appMetadata = new Mock<IAppMetadata>();
            appMetadata
                .Setup(m => m.ApplicationMetadata)
                .Returns(
                    new ApplicationMetadata("ttd/app")
                    {
                        DataTypes =
                        [
                            new DataType
                            {
                                Id = "added",
                                AppLogic = new() { ClassRef = "Model.Added" },
                            },
                        ],
                    }
                );
            var appResources = new AppResourcesSI(appFiles, appMetadata.Object);

            var model = appResources.GetLayoutModelForFolder("Task_1");

            model.Should().NotBeNull();
            model!.DefaultDataType.Id.Should().Be("added");
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

            AppResourcesSI appResources = CreateAppResources(tempDir);

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

            AppResourcesSI appResources = CreateAppResources(tempDir);

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

            AppResourcesSI appResources = CreateAppResources(tempDir);

            byte[] text = appResources.GetText("ttd", "app", "resource.nb.json");

            using var document = System.Text.Json.JsonDocument.Parse(text.AsMemory());
            document.RootElement.GetProperty("language").GetString().Should().Be("nb");
        }
        finally
        {
            Directory.Delete(tempDir.FullName, true);
        }
    }

    [Fact]
    public void GetCalculationConfig_deserializes_file_from_disk()
    {
        IAppResources appResources = GetAppResourcesForCalculation("default");

        CalculationConfig? actual = appResources.GetCalculationConfig("default");

        Assert.NotNull(actual);
        Assert.Equal(2, actual.Calculations.Count);
        Assert.Equal("skjema.calculated-fixed-value", actual.Calculations[0].Field);
        Assert.Equal("skjema.children[].total", actual.Calculations[1].Field);
        // The expression is a function call and must round-trip as such
        Assert.Equal(
            """["concat","Hello ",["dataModel","skjema.name"]]""",
            JsonSerializer.Serialize(actual.Calculations[0].Expression)
        );
    }

    [Fact]
    public void GetCalculationConfig_returns_null_when_file_is_missing()
    {
        IAppResources appResources = GetAppResourcesForCalculation("default");

        CalculationConfig? actual = appResources.GetCalculationConfig("does-not-exist");

        Assert.Null(actual);
    }

    [Fact]
    public void GetCalculationConfig_accepts_comments_in_file()
    {
        IAppResources appResources = GetAppResourcesForCalculation("comments");

        CalculationConfig? actual = appResources.GetCalculationConfig("comments");

        Assert.NotNull(actual);
        var calculation = Assert.Single(actual.Calculations);
        Assert.Equal("skjema.name", calculation.Field);
        Assert.Equal("\"fixed\"", JsonSerializer.Serialize(calculation.Expression));
    }

    [Fact]
    public void Loading_app_throws_on_invalid_calculation_json()
    {
        // The app files loader rejects invalid JSON before the app starts, so GetCalculationConfig never sees it
        var exception = Assert.Throws<ApplicationConfigException>(() => GetAppResourcesForCalculation("invalid"));

        Assert.Contains("models/invalid.calculation.json", exception.Message);
    }

    [Fact]
    public void Loading_app_throws_on_legacy_dictionary_format()
    {
        // Before the "calculations" property became a list it was an object keyed by field name.
        // The loader rejects such files before the app starts, and the message says how to convert them.
        var exception = Assert.Throws<ApplicationConfigException>(() => GetAppResourcesForCalculation("legacy"));

        Assert.Contains("models/legacy.calculation.json", exception.Message);
        Assert.Contains("v8 format", exception.Message);
        Assert.Contains("studioctl app upgrade v9", exception.Message);
    }

    [Fact]
    public void GetCalculationConfig_throws_on_legacy_dictionary_format_in_a_snapshot()
    {
        // A snapshot that did not go through the loader gets the same message from GetCalculationConfig
        var legacyFile = File.ReadAllBytes(
            Path.Join(
                PathUtils.GetCoreTestsPath(),
                "Implementation",
                "TestData",
                "Calculation",
                "legacy.calculation.json"
            )
        );
        var appFiles = new AppFilesAccessor(
            new AppFiles(
                applicationMetadata: Encoding.UTF8.GetBytes(ApplicationMetadataJson),
                models: ImmutableSortedDictionary.CreateRange(
                    StringComparer.Ordinal,
                    [KeyValuePair.Create("legacy", new AppModelFiles(calculationConfiguration: legacyFile))]
                )
            )
        );
        var frontendFeatures = new Mock<IFrontendFeatures>();
        frontendFeatures.Setup(f => f.GetDictionary()).Returns(new Dictionary<string, bool>());
        IAppResources appResources = new AppResourcesSI(appFiles, new AppMetadata(appFiles, frontendFeatures.Object));

        var exception = Assert.Throws<JsonException>(() => appResources.GetCalculationConfig("legacy"));

        Assert.StartsWith("models/legacy.calculation.json: ", exception.Message);
        Assert.Contains("v8 format", exception.Message);
        Assert.Contains("studioctl app upgrade v9", exception.Message);
    }

    [Theory]
    [InlineData("null-document")]
    [InlineData("null-calculations")]
    [InlineData("null-item")]
    [InlineData("null-field")]
    [InlineData("empty-field")]
    [InlineData("missing-expression")]
    public void Loading_app_throws_with_file_name_on_invalid_calculation_values(string dataTypeId)
    {
        // The app files loader rejects the file before the app starts, so GetCalculationConfig never sees it
        var exception = Assert.Throws<ApplicationConfigException>(() => GetAppResourcesForCalculation(dataTypeId));

        Assert.Contains($"models/{dataTypeId}.calculation.json: ", exception.Message);
    }

    [Fact]
    public void GetCalculationConfig_accepts_null_expression()
    {
        // A null expression evaluates to null, which clears the field, so it is a valid expression
        IAppResources appResources = GetAppResourcesForCalculation("null-expression");

        CalculationConfig? actual = appResources.GetCalculationConfig("null-expression");

        Assert.NotNull(actual);
        var calculation = Assert.Single(actual.Calculations);
        Assert.Equal("skjema.name", calculation.Field);
        Assert.Equal("null", JsonSerializer.Serialize(calculation.Expression));
    }

    /// <summary>
    /// Loads an app whose models folder holds <c>TestData/Calculation/{dataTypeId}.calculation.json</c>.
    /// </summary>
    private IAppResources GetAppResourcesForCalculation(string dataTypeId)
    {
        var tempDir = Directory.CreateTempSubdirectory("AppResourcesSI-Calculation-");
        try
        {
            var modelsDir = Path.Join(tempDir.FullName, "models");
            Directory.CreateDirectory(modelsDir);
            var sourceDir = Path.Join(PathUtils.GetCoreTestsPath(), "Implementation", "TestData", "Calculation");
            var fileName = $"{dataTypeId}.calculation.json";
            File.Copy(Path.Join(sourceDir, fileName), Path.Join(modelsDir, fileName));

            return CreateAppResources(tempDir);
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
