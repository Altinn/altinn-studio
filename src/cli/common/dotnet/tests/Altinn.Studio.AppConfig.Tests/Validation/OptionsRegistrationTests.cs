using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class OptionsRegistrationTests
{
    private static IReadOnlyList<string> UnresolvedOptionsIds(
        string optionsId,
        string program,
        string? extraFile = null
    ) => OptionsIdFindings(optionsId, program, extraFile).Select(f => f.Message).ToList();

    private static IReadOnlyList<Finding> OptionsIdFindings(string optionsId, string program, string? extraFile = null)
    {
        var files = new Dictionary<string, string>
        {
            ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/o"),
            ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
            ["App/ui/Task_1/layouts/P1.json"] =
                $$$"""{"data":{"layout":[{"id":"dd","type":"Dropdown","optionsId":"{{{optionsId}}}"}]}}""",
            ["App/Program.cs"] = program,
        };
        if (extraFile is not null)
            files["App/logic/Ids.cs"] = extraFile;
        return AppConfigEngine
            .Open(new InMemoryAppDirectory(files))
            .Validate()
            .Findings.Where(f => f.RuleId == "REF-OPTIONS-ID")
            .ToList();
    }

    private static string Program(string registrations) =>
        $$"""
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
            {
                {{registrations}}
            }
            """;

    [Theory]
    [InlineData("kommuner")]
    [InlineData("land")]
    [InlineData("kjønn")]
    [InlineData("fylker-kv")]
    [InlineData("kommuner-kv")]
    [InlineData("poststed")]
    public void AddAltinnCodelists_RegistersTheCodelistsDefaultIds(string optionsId) =>
        Assert.Empty(UnresolvedOptionsIds(optionsId, Program("services.AddAltinnCodelists();")));

    [Theory]
    [InlineData("services.AddKartverketAdministrativeUnits();", "kommuner-kv")]
    [InlineData("services.AddSSBClassifications();", "sivilstand")]
    [InlineData("services.AddPosten();", "poststed")]
    public void CodelistsGroupHelpers_RegisterTheirIds(string registration, string optionsId) =>
        Assert.Empty(UnresolvedOptionsIds(optionsId, Program(registration)));

    [Fact]
    public void CodelistsGroupHelper_DoesNotRegisterAnotherGroupsIds() =>
        Assert.NotEmpty(UnresolvedOptionsIds("kommuner", Program("services.AddKartverketAdministrativeUnits();")));

    [Theory]
    [InlineData("services.AddSSBClassificationCodelistProvider(\"landIso2\", 100);")]
    [InlineData("services.AddSSBClassificationCodelistProvider(classificationId: 100, id: \"landIso2\");")]
    [InlineData(
        "services.AddAltinn2CodeList(id: \"landIso2\", transform: code => new() { Value = code.Code, Label = code.Value1 });"
    )]
    [InlineData("services.AddAltinn3CodeList(optionId: \"landIso2\", org: \"ttd\", codeListId: \"land\");")]
    [InlineData("services.AddJoinedAppOptions(\"landIso2\", \"norden\", \"europa\");")]
    public void IdTakingHelpers_RegisterTheIdArgument(string registration) =>
        Assert.Empty(UnresolvedOptionsIds("landIso2", Program(registration)));

    [Fact]
    public void IdTakingHelper_IdFromAConstant_IsResolved() =>
        Assert.Empty(
            UnresolvedOptionsIds(
                "landIso2",
                Program("services.AddSSBClassificationCodelistProvider(OptionIds.Countries, 100);"),
                "namespace App.Logic; public static class OptionIds { public const string Countries = \"landIso2\"; }"
            )
        );

    [Fact]
    public void IdTakingHelper_IdThatIsNotAConstant_IsStillFlagged() =>
        Assert.NotEmpty(
            UnresolvedOptionsIds(
                "landIso2",
                Program("var id = LoadId(); services.AddSSBClassificationCodelistProvider(id, 100);")
            )
        );

    [Fact]
    public void CommentedOutRegistration_IsIgnored() =>
        Assert.NotEmpty(UnresolvedOptionsIds("kommuner", Program("// services.AddAltinnCodelists();")));

    [Theory]
    [InlineData(
        "public class LandProvider : IAppOptionsProvider { public LandProvider() { Id = \"landIso2\"; } public string Id { get; } }"
    )]
    [InlineData(
        "public class LandProvider : IAppOptionsProvider { public LandProvider() { this.Id = \"landIso2\"; } public string Id { get; } }"
    )]
    [InlineData("public class landIso2 : IAppOptionsProvider { public string Id => nameof(landIso2); }")]
    [InlineData(
        "public class LandProvider : IAppOptionsProvider { private const string Key = \"landIso2\"; public string Id => Key; }"
    )]
    [InlineData(
        "public static class Constants { public static class Ids { public const string Land = \"landIso2\"; } } public class LandProvider : IAppOptionsProvider { public string Id => Constants.Ids.Land; }"
    )]
    [InlineData(
        "public class LandProvider : IAppOptionsProvider { public string Id { get { return \"landIso2\"; } } }"
    )]
    [InlineData(
        "public abstract class CodeListProvider : IAppOptionsProvider { public abstract string Id { get; set; } } public class LandProvider : CodeListProvider { public override string Id { get; set; } = \"landIso2\"; }"
    )]
    [InlineData(
        "public abstract class CodeListProvider(string source) : IAppOptionsProvider { public virtual string Id { get; } = \"landIso2\"; } public class LandProvider() : CodeListProvider(\"ssb\");"
    )]
    public void ProviderClass_IdTheCodeFixes_IsResolved(string source) =>
        Assert.Empty(UnresolvedOptionsIds("landIso2", Program(""), "namespace App.Logic; " + source));

    [Theory]
    [InlineData(
        "public class LandProvider : IAppOptionsProvider { public LandProvider(string id) { Id = id; } public string Id { get; } }"
    )]
    [InlineData("public abstract class LandProvider : IAppOptionsProvider { public string Id => \"landIso2\"; }")]
    [InlineData("public class LandProvider : CodeListProvider { public string Id => \"landIso2\"; }")]
    public void ProviderClass_IdOrRegistrationTheCodeDoesNotFix_IsStillFlagged(string source) =>
        Assert.NotEmpty(UnresolvedOptionsIds("landIso2", Program(""), "namespace App.Logic; " + source));

    [Fact]
    public void RegisteredId_InDifferentCase_IsResolvedLikeTheRuntimeDoes() =>
        Assert.Empty(
            UnresolvedOptionsIds(
                "asf_land",
                Program("services.AddSSBClassificationCodelistProvider(\"ASF_Land\", 100);")
            )
        );

    [Fact]
    public void OptionsFile_InDifferentCase_IsStillFlagged()
    {
        var findings = AppConfigEngine
            .Open(
                new InMemoryAppDirectory(
                    new()
                    {
                        ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/o"),
                        ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                        ["App/ui/Task_1/layouts/P1.json"] =
                            """{"data":{"layout":[{"id":"dd","type":"Dropdown","optionsId":"JaNei"}]}}""",
                        ["App/options/jaNei.json"] = "[]",
                    }
                )
            )
            .Validate()
            .Findings;

        Assert.Contains(findings, f => f.RuleId == "REF-OPTIONS-ID");
    }

    [Theory]
    [InlineData("lib**ttd**countries**latest")]
    [InlineData("lib**digdir**kommuner_2024**1.2")]
    public void LibraryCodeListReference_IsResolvedWithoutFileOrRegistration(string optionsId) =>
        Assert.Empty(UnresolvedOptionsIds(optionsId, Program("")));

    [Theory]
    [InlineData("lib**ttd**countries")]
    [InlineData("lib**ttd**coun tries**latest")]
    public void MalformedLibraryCodeListReference_IsStillFlagged(string optionsId) =>
        Assert.NotEmpty(UnresolvedOptionsIds(optionsId, Program("")));

    [Theory]
    [InlineData(
        "services.AddSingleton<IAppOptionsProvider, PackageProvider>();",
        "",
        "PackageProvider (App/Program.cs)"
    )]
    [InlineData(
        "services.AddSSBClassificationCodelistProvider(settings.Id, 100);",
        "",
        "AddSSBClassificationCodelistProvider() (App/Program.cs)"
    )]
    [InlineData(
        "",
        "public class KlassProvider : IAppOptionsProvider { public KlassProvider(string id) { Id = id; } public string Id { get; } }",
        "KlassProvider (App/logic/Ids.cs)"
    )]
    public void MissingOptionsId_WhenAProviderIdCannotBeRead_IsInfoNamingTheProvider(
        string registration,
        string source,
        string named
    )
    {
        var finding = Assert.Single(
            OptionsIdFindings("landIso2", Program(registration), "namespace App.Logic; " + source)
        );

        Assert.Equal(Severity.Info, finding.Severity);
        Assert.Contains($"it may come from {named}", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void MissingOptionsId_WhenEveryProviderIdIsRead_IsAWarning()
    {
        var finding = Assert.Single(
            OptionsIdFindings("landIso2", Program("services.AddAltinnCodelists();"), "namespace App.Logic;")
        );

        Assert.Equal(Severity.Warning, finding.Severity);
    }

    [Fact]
    public void BaseProviderClassWithoutId_DoesNotCountAsAProviderWithUnknownId()
    {
        var finding = Assert.Single(
            OptionsIdFindings(
                "landIso2",
                Program(""),
                "namespace App.Logic; public class CodeListProvider : IAppOptionsProvider { public virtual string Id { get; set; } } public class CountyProvider : CodeListProvider { public override string Id { get; set; } = \"fylker\"; }"
            )
        );

        Assert.Equal(Severity.Warning, finding.Severity);
    }

    [Fact]
    public void RegisteredAppClass_WithABaseFromAPackage_IsReadAsAProvider() =>
        Assert.Empty(
            UnresolvedOptionsIds(
                "landIso2",
                Program("services.AddTransient<IAppOptionsProvider, LandProvider>();"),
                "namespace App.Logic; public class LandProvider : PackageCodeListProvider { public string Id => \"landIso2\"; }"
            )
        );

    [Fact]
    public void RegisteredCodelistsProviderClass_RegistersItsId() =>
        Assert.Empty(
            UnresolvedOptionsIds(
                "poststed",
                Program("services.AddTransient<IAppOptionsProvider, PostalCodesCodelistsProvider>();")
            )
        );

    [Fact]
    public void Definition_FromACodelistsId_LandsOnTheRegisteringCall_AndTheCallAnswersNoSingleId()
    {
        string[] codelistsIds =
        [
            "fylker-kv",
            "kommuner-kv",
            "kjønn",
            "næringsgruppering",
            "yrker",
            "sivilstand",
            "grunnbeløpfolketrygden",
            "fylker",
            "kommuner",
            "land",
            "poststed",
        ];
        var dropdowns = codelistsIds.Select((id, i) => $$"""{"id":"dd{{i}}","type":"Dropdown","optionsId":"{{id}}"}""");
        var layout = """{"data":{"layout":[""" + string.Join(",", dropdowns) + "]}}";
        var program = Program("services.AddAltinnCodelists();");
        var engine = AppConfigEngine.Open(
            new InMemoryAppDirectory(
                new()
                {
                    ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/o"),
                    ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                    ["App/ui/Task_1/layouts/P1.json"] = layout,
                    ["App/Program.cs"] = program,
                }
            )
        );
        var symbols = new AppSymbols(engine);

        var def = Assert.Single(
            symbols.Definition(
                "App/ui/Task_1/layouts/P1.json",
                1,
                layout.IndexOf("\"kommuner\"", StringComparison.Ordinal) + 2
            )
        );

        Assert.Equal("App/Program.cs", def.File);
        var callLine =
            program[..program.IndexOf("AddAltinnCodelists", StringComparison.Ordinal)].Count(c => c == '\n') + 1;
        Assert.Equal(callLine, def.Line);
        Assert.Empty(symbols.References("App/Program.cs", def.Line, def.Column, includeDeclaration: false));
    }

    [Fact]
    public void Hover_NamesTheRegisteringCall()
    {
        const string layout = """{"data":{"layout":[{"id":"dd","type":"Dropdown","optionsId":"landIso2"}]}}""";
        var engine = AppConfigEngine.Open(
            new InMemoryAppDirectory(
                new()
                {
                    ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/o"),
                    ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                    ["App/ui/Task_1/layouts/P1.json"] = layout,
                    ["App/Program.cs"] = Program("services.AddSSBClassificationCodelistProvider(\"landIso2\", 100);"),
                }
            )
        );

        var hover = new AppSymbols(engine).SymbolHover(
            "App/ui/Task_1/layouts/P1.json",
            1,
            layout.IndexOf("\"landIso2\"", StringComparison.Ordinal) + 2
        );

        Assert.NotNull(hover);
        Assert.Contains(
            "`AddSSBClassificationCodelistProvider()` in `App/Program.cs`",
            hover,
            StringComparison.Ordinal
        );
    }
}
