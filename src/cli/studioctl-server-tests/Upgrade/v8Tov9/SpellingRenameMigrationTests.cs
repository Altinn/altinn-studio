using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the rename of v8 API members whose spelling changed in v9, including that whole-word
/// matching leaves an app's own similarly-named identifiers alone.
/// </summary>
public sealed class SpellingRenameMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task Migrate()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        await SpellingRenameMigration.Migrate(_app.Root);
    }

    [Fact]
    public async Task RenamesOrganizationTypes()
    {
        var file = _app.Write(
            "logic/Lookup.cs",
            """
            using Altinn.App.Core.Models;

            public class Lookup
            {
                public OrganisationNumber Number { get; set; }
                public OrganisationOrPersonIdentifier Who { get; set; }
                public OrganisationNumberFormat Format { get; set; }
            }
            """
        );

        await Migrate();

        var text = await File.ReadAllTextAsync(file, TestContext.Current.CancellationToken);
        Assert.Contains("OrganizationNumber Number", text);
        Assert.Contains("OrganizationOrPersonIdentifier Who", text);
        Assert.Contains("OrganizationNumberFormat Format", text);
        Assert.DoesNotContain("Organisation", text);
    }

    [Fact]
    public async Task RenamesFileAnalysisAndInstantiationTypes()
    {
        var file = _app.Write(
            "logic/Analysis.cs",
            """
            public class MyAnalyser : IFileAnalyser
            {
                public Task<FileAnalysisResult> Analyse(Stream stream, string? filename = null) => throw new();
            }

            public class Inst
            {
                public InstansiationInstance Instance { get; set; }
            }
            """
        );

        await Migrate();

        var text = await File.ReadAllTextAsync(file, TestContext.Current.CancellationToken);
        Assert.Contains(": IFileAnalyzer", text);
        Assert.Contains("Analyze(Stream stream", text);
        Assert.Contains("InstantiationInstance Instance", text);
    }

    [Fact]
    public async Task LeavesLongerNameIntactWhenAShorterOnePrefixesIt()
    {
        // OrganisationNumber is a prefix of OrganisationNumberJsonConverter; rewriting the short
        // name first would produce "OrganizationNumberJsonConverter" only by luck, and
        // "OrganizationNumberGuard" not at all. Longest-first ordering is what makes this work.
        var file = _app.Write(
            "logic/Converters.cs",
            """
            public class C
            {
                public OrganisationNumberJsonConverter Converter { get; set; }
                public OrganisationNumberJsonConverterAttribute Attribute { get; set; }
                public OrganisationNumber Plain { get; set; }
            }
            """
        );

        await Migrate();

        var text = await File.ReadAllTextAsync(file, TestContext.Current.CancellationToken);
        Assert.Contains("OrganizationNumberJsonConverter Converter", text);
        Assert.Contains("OrganizationNumberJsonConverterAttribute Attribute", text);
        Assert.Contains("OrganizationNumber Plain", text);
    }

    [Fact]
    public async Task LeavesAppOwnedIdentifiersAlone()
    {
        // Whole-word matching: the app's own type merely contains the old name as a substring.
        var file = _app.Write(
            "logic/Own.cs",
            """
            public class MyOrganisationNumberHelper
            {
                public string AnalyseSomething() => "x";
                public string Analyse => "y";
            }
            """
        );

        await Migrate();

        var text = await File.ReadAllTextAsync(file, TestContext.Current.CancellationToken);
        Assert.Contains("MyOrganisationNumberHelper", text);
        Assert.Contains("AnalyseSomething()", text);
        Assert.Contains("public string Analyse =>", text);
    }

    [Fact]
    public async Task LeavesBuildOutputUntouched()
    {
        var generated = _app.Write("obj/Debug/Generated.cs", "public class G { OrganisationNumber N; }\n");

        await Migrate();

        Assert.Contains(
            "OrganisationNumber",
            await File.ReadAllTextAsync(generated, TestContext.Current.CancellationToken)
        );
    }
}
