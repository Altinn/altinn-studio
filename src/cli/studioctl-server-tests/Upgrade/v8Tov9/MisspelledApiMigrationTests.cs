using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the v9 US English API renames: distinctive names rewritten everywhere, ambiguous names
/// rewritten only when they bind to an SDK symbol (so an app's own serialized <c>OrganisationNumber</c>
/// form-model property survives), interface implementations and their call sites renamed together, and
/// string literals never touched.
/// </summary>
public sealed class MisspelledApiMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private CSharpSourceScanner SyntaxScanner() => new(AppFolder);

    /// <summary>The v8 shapes of the renamed SDK surface, in their v8 namespaces.</summary>
    private static readonly Lazy<MetadataReference> _coreStub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            """
            namespace Altinn.App.Core.Models
            {
                public readonly struct OrganisationNumber
                {
                    public static OrganisationNumber Parse(string value) => default;
                }
            }

            namespace Altinn.App.Core.Features.Maskinporten.Models
            {
                public sealed class MaskinportenTokenRequest
                {
                    public Altinn.App.Core.Models.OrganisationNumber Organisation { get; init; }
                }
            }

            namespace Altinn.App.Core.Features.FileAnalysis
            {
                public interface IFileAnalyser
                {
                    string Id { get; }
                    System.Threading.Tasks.Task<FileAnalysisResult> Analyse(System.IO.Stream stream, string? filename = null);
                }

                public sealed class FileAnalysisResult
                {
                    public FileAnalysisResult(string analyserId) { AnalyserId = analyserId; }
                    public string AnalyserId { get; }
                }
            }

            namespace Altinn.App.Core.Features.FileAnalyzis
            {
                public interface IFileAnalyserFactory
                {
                    System.Collections.Generic.IEnumerable<Altinn.App.Core.Features.FileAnalysis.IFileAnalyser> GetFileAnalysers(
                        System.Collections.Generic.IEnumerable<string> analyserIds);
                }
            }
            """
        )
    );

    private CSharpSourceScanner SemanticScanner() => SemanticScannerFactory.CreateScanner(AppFolder, _coreStub.Value);

    // --- Distinctive names: renamed on syntax alone ----------------------------------------------

    [Fact]
    public void DistinctiveNames_RenamedWithoutSemantics_AcrossReferencesAndRegistrations()
    {
        var model = _app.Write(
            "models/Instantiation.cs",
            """
            using Altinn.App.Api.Models;
            public class MyInstantiation
            {
                public InstansiationInstance Build() => new InstansiationInstance();
            }
            """
        );
        var registration = _app.Write(
            "Program.cs",
            """
            using Altinn.App.Core.Features.FileAnalysis;
            builder.Services.AddTransient<IFileAnalyser, MyAnalyser>();
            """
        );

        var result = new MisspelledApiMigration(SyntaxScanner()).Migrate();

        Assert.False(result.RequiresManualFollowUp);
        var migratedModel = File.ReadAllText(model);
        Assert.Contains("InstantiationInstance", migratedModel);
        Assert.DoesNotContain("InstansiationInstance", migratedModel);
        var migratedRegistration = File.ReadAllText(registration);
        Assert.Contains("AddTransient<IFileAnalyzer, MyAnalyser>", migratedRegistration);
        Assert.Contains(result.Warnings, w => w.Contains("Instantiation.cs") && w.Contains("InstansiationInstance"));
    }

    [Fact]
    public void FileAnalyzisUsingDirective_LeftForTheNamespaceMigration_QualifiedReferencesRenamed()
    {
        var usingFile = _app.Write(
            "logic/WithUsing.cs",
            """
            using Altinn.App.Core.Features.FileAnalyzis;
            public class WithUsing { }
            """
        );
        var qualified = _app.Write(
            "logic/Qualified.cs",
            """
            public class Qualified
            {
                public Altinn.App.Core.Features.FileAnalyzis.IFileAnalyserFactory? Factory { get; set; }
            }
            """
        );

        new MisspelledApiMigration(SyntaxScanner()).Migrate();

        Assert.Contains("using Altinn.App.Core.Features.FileAnalyzis;", File.ReadAllText(usingFile));
        var migratedQualified = File.ReadAllText(qualified);
        Assert.Contains("Altinn.App.Core.Features.FileAnalysis.IFileAnalyzerFactory", migratedQualified);
        Assert.DoesNotContain("FileAnalyzis", migratedQualified);
    }

    // --- Ambiguous names: only renamed when bound to the SDK -------------------------------------

    [Fact]
    public void AmbiguousNames_WithoutSemantics_ListedForReviewButNotRewritten()
    {
        var formModel = _app.Write(
            "models/FormModel.cs",
            """
            public class FormModel
            {
                public string? OrganisationNumber { get; set; }
                public string? Organisation { get; set; }
            }
            """
        );

        var result = new MisspelledApiMigration(SyntaxScanner()).Migrate();

        Assert.False(result.RequiresManualFollowUp);
        var content = File.ReadAllText(formModel);
        Assert.Contains("OrganisationNumber", content);
        Assert.Contains(result.Warnings, w => w.Contains("FormModel.cs") && w.Contains("OrganisationNumber"));
    }

    [Fact]
    public void AmbiguousNames_WithSemantics_SdkBindingsRenamed_AppOwnedPropertiesKept()
    {
        var sdkUse = _app.Write(
            "logic/TokenFactory.cs",
            """
            using Altinn.App.Core.Features.Maskinporten.Models;
            using Altinn.App.Core.Models;

            public class TokenFactory
            {
                public MaskinportenTokenRequest Create() =>
                    new MaskinportenTokenRequest { Organisation = OrganisationNumber.Parse("991825827") };
            }
            """
        );
        var formModel = _app.Write(
            "models/FormModel.cs",
            """
            public class FormModel
            {
                public string OrganisationNumber { get; set; } = "";
                public string Organisation { get; set; } = "";
            }

            public class ReadsForm
            {
                public string Read(FormModel model) => model.Organisation + model.OrganisationNumber;
            }
            """
        );

        var result = new MisspelledApiMigration(SemanticScanner()).Migrate();

        var migratedSdkUse = File.ReadAllText(sdkUse);
        Assert.Contains("Organization = OrganizationNumber.Parse", migratedSdkUse);
        Assert.DoesNotContain("Organisation =", migratedSdkUse);

        var migratedFormModel = File.ReadAllText(formModel);
        Assert.Contains("public string OrganisationNumber", migratedFormModel);
        Assert.Contains("model.Organisation + model.OrganisationNumber", migratedFormModel);
        // With a semantic verdict on every occurrence, nothing is left for manual review.
        Assert.DoesNotContain(result.Warnings, w => w.Contains("FormModel.cs"));
    }

    [Fact]
    public void InterfaceImplementation_DeclarationAndCallSitesRenamedTogether()
    {
        var analyser = _app.Write(
            "logic/MyAnalyser.cs",
            """
            using System.IO;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features.FileAnalysis;

            public class MyAnalyser : IFileAnalyser
            {
                public string Id => "my";

                public Task<FileAnalysisResult> Analyse(Stream stream, string? filename = null) =>
                    Task.FromResult(new FileAnalysisResult("my"));
            }
            """
        );
        var caller = _app.Write(
            "logic/Caller.cs",
            """
            using System.IO;
            using System.Threading.Tasks;

            public class Caller
            {
                public async Task<string> Run(MyAnalyser analyser, Stream stream)
                {
                    var result = await analyser.Analyse(stream);
                    return result.AnalyserId;
                }
            }
            """
        );
        var unrelated = _app.Write(
            "logic/Unrelated.cs",
            """
            public class Unrelated
            {
                public int Analyse(string input) => input.Length;
                public int Use() => Analyse("x");
            }
            """
        );

        new MisspelledApiMigration(SemanticScanner()).Migrate();

        var migratedAnalyser = File.ReadAllText(analyser);
        Assert.Contains("public class MyAnalyser : IFileAnalyzer", migratedAnalyser);
        Assert.Contains("Analyze(Stream stream", migratedAnalyser);
        Assert.DoesNotContain("Analyse(", migratedAnalyser);

        var migratedCaller = File.ReadAllText(caller);
        Assert.Contains("analyser.Analyze(stream)", migratedCaller);
        Assert.Contains("result.AnalyzerId", migratedCaller);

        // An app's own method that merely shares the name keeps it: it implements no SDK contract.
        var migratedUnrelated = File.ReadAllText(unrelated);
        Assert.Contains("public int Analyse(string input)", migratedUnrelated);
        Assert.Contains("Analyse(\"x\")", migratedUnrelated);
    }

    [Fact]
    public void NamedArguments_RenamedOnlyWhenBoundToSdkParameters()
    {
        var sdkCall = _app.Write(
            "logic/Results.cs",
            """
            using Altinn.App.Core.Features.FileAnalysis;

            public class Results
            {
                public FileAnalysisResult Build() => new FileAnalysisResult(analyserId: "mime");
            }
            """
        );
        var ownMethod = _app.Write(
            "logic/Own.cs",
            """
            public class Own
            {
                public string Describe(string analyserId) => analyserId;
                public string Use() => Describe(analyserId: "mine");
            }
            """
        );

        new MisspelledApiMigration(SemanticScanner()).Migrate();

        Assert.Contains("new FileAnalysisResult(analyzerId: \"mime\")", File.ReadAllText(sdkCall));
        // The app's own parameter of the same name is untouched, at the declaration and the call.
        var migratedOwn = File.ReadAllText(ownMethod);
        Assert.Contains("Describe(string analyserId)", migratedOwn);
        Assert.Contains("Describe(analyserId: \"mine\")", migratedOwn);
    }

    // --- Wire spellings are never touched ---------------------------------------------------------

    [Fact]
    public void StringLiterals_KeepTheirShippedSpelling()
    {
        var client = _app.Write(
            "logic/LookupClient.cs",
            """
            using Altinn.App.Api.Models;

            public class LookupClient
            {
                public string Route => "api/v1/lookup/organisation/991825827";
                public LookupOrganisationResponse? Parse(string json) => null;
            }
            """
        );

        new MisspelledApiMigration(SyntaxScanner()).Migrate();

        var migrated = File.ReadAllText(client);
        Assert.Contains("\"api/v1/lookup/organisation/991825827\"", migrated);
        Assert.Contains("LookupOrganizationResponse", migrated);
    }
}
