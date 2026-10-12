using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class UnusedPdfFormatterMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private CSharpSourceScanner Scanner() => SemanticScannerFactory.CreateScanner(AppFolder, _coreStub.Value);

    private static readonly Lazy<MetadataReference> _coreStub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            """
            namespace Altinn.App.Core.Models
            {
                public class LayoutSettings { }
            }

            namespace Altinn.App.Core.Features
            {
                public interface IPdfFormatter
                {
                    System.Threading.Tasks.Task<Altinn.App.Core.Models.LayoutSettings> FormatPdf(
                        Altinn.App.Core.Models.LayoutSettings layoutSettings,
                        object data
                    );
                }
            }
            """
        )
    );

    private const string PassThrough =
        "public Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data) => Task.FromResult(layoutSettings);";

    private const string WithLogic =
        "public Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data) => "
        + "Task.FromResult(data is string ? new LayoutSettings() : layoutSettings);";

    /// <summary>A formatter file with <paramref name="members"/>, and <paramref name="besides"/> declared next to it.</summary>
    private static string Formatter(string members, string ns = "Altinn.App.AppLogic.Print", string besides = "") =>
        $$"""
            using System.Threading.Tasks;
            using Altinn.App.Core.Features;
            using Altinn.App.Core.Models;

            namespace {{ns}}
            {
                {{besides}}
                public class PdfHandler : IPdfFormatter
                {
                    {{members}}
                }
            }
            """;

    private const string Registration = """
        using Altinn.App.AppLogic.Print;
        using Altinn.App.Core.Features;
        using Microsoft.Extensions.DependencyInjection;

        namespace Altinn.App
        {
            public static class Services
            {
                public static void Register(IServiceCollection services)
                {
                    // Register your apps custom service implementations here.
                    services.AddTransient<IPdfFormatter, PdfHandler>();
                    services.AddTransient<object, object>();
                }
            }
        }
        """;

    private const string RegistrationRemoved = """
        using Altinn.App.Core.Features;
        using Microsoft.Extensions.DependencyInjection;

        namespace Altinn.App
        {
            public static class Services
            {
                public static void Register(IServiceCollection services)
                {
                    // Register your apps custom service implementations here.
                    services.AddTransient<object, object>();
                }
            }
        }
        """;

    [Theory]
    [InlineData(PassThrough)]
    [InlineData("public Task<LayoutSettings> FormatPdf(LayoutSettings s, object data) { return Task.FromResult(s); }")]
    [InlineData(
        "public async Task<LayoutSettings> FormatPdf(LayoutSettings s, object data) => await Task.FromResult(s);"
    )]
    [InlineData("public async Task<LayoutSettings> FormatPdf(LayoutSettings s, object data) { return s; }")]
    public void DeletesAFormatterThatReturnsTheSettingsUnchanged_WithItsRegistrationAndImport(string formatPdf)
    {
        var formatter = _app.Write("logic/Pdf/PdfFormatter.cs", Formatter(formatPdf));
        var services = _app.Write("Services.cs", Registration);
        var scanner = Scanner();

        var result = new UnusedPdfFormatterMigration(scanner).Migrate();

        Assert.False(File.Exists(formatter));
        Assert.Equal(RegistrationRemoved, File.ReadAllText(services));
        Assert.Contains("returned the layout settings unchanged", Assert.Single(result.Messages).Text);
        Assert.Empty(new RemovedPdfFormatterDetector(scanner).Detect().Messages);
        Assert.DoesNotContain(scanner.PristineView.Files, file => file.Path == formatter);
    }

    [Fact]
    public void DeletesAFormatterWithLogic_ThatIsNeverRegistered()
    {
        var formatter = _app.Write("logic/Pdf/PdfFormatter.cs", Formatter(WithLogic));

        var result = new UnusedPdfFormatterMigration(Scanner()).Migrate();

        Assert.False(File.Exists(formatter));
        Assert.Contains("never registered", Assert.Single(result.Messages).Text);
    }

    public static TheoryData<string, string, string> KeptFormatters =>
        new()
        {
            // Registered, with logic
            { Formatter(WithLogic), "Services.cs", Registration },
            // Registered, with a constructor that could have an effect
            { Formatter("public PdfHandler() { }\n" + PassThrough), "Services.cs", Registration },
            // Sharing its file
            { Formatter(PassThrough, besides: "public class Footer { }"), "Services.cs", Registration },
            { Formatter(PassThrough, besides: "public delegate void Formatted();"), "Services.cs", Registration },
            // Referred to elsewhere
            {
                Formatter(PassThrough),
                "logic/Wrapper.cs",
                "namespace Altinn.App.AppLogic.Print { public class Wrapper { private readonly PdfHandler _inner = new(); } }"
            },
            // Registered in code excluded by a condition
            {
                Formatter(PassThrough),
                "Services.cs",
                Registration.Replace(
                    "        services.AddTransient<IPdfFormatter, PdfHandler>();",
                    "#if RELEASE\n        services.AddTransient<IPdfFormatter, PdfHandler>();\n#endif",
                    StringComparison.Ordinal
                )
            },
        };

    [Theory]
    [MemberData(nameof(KeptFormatters))]
    public void KeepsTheFormatter(string formatterSource, string otherPath, string otherSource)
    {
        var formatter = _app.Write("logic/Pdf/PdfFormatter.cs", formatterSource);
        _app.Write(otherPath, otherSource);

        var result = new UnusedPdfFormatterMigration(Scanner()).Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(formatterSource, File.ReadAllText(formatter));
    }

    [Fact]
    public void KeepsTheImport_WhenTheNamespaceHasOtherTypes()
    {
        _app.Write("logic/Pdf/PdfFormatter.cs", Formatter(PassThrough));
        _app.Write("logic/Pdf/Footer.cs", "namespace Altinn.App.AppLogic.Print { public class Footer { } }");
        var services = _app.Write("Services.cs", Registration);

        new UnusedPdfFormatterMigration(Scanner()).Migrate();

        Assert.Equal("using Altinn.App.AppLogic.Print;\n" + RegistrationRemoved, File.ReadAllText(services));
    }

    [Fact]
    public void KeepsTheImport_WhenAReferencedAssemblyDeclaresTheNamespaceToo()
    {
        var formatter = _app.Write("logic/Pdf/PdfFormatter.cs", Formatter(PassThrough, ns: "Altinn.App.Core.Features"));
        var services = _app.Write(
            "Services.cs",
            Registration.Replace("using Altinn.App.AppLogic.Print;\n", "", StringComparison.Ordinal)
        );

        new UnusedPdfFormatterMigration(Scanner()).Migrate();

        Assert.False(File.Exists(formatter));
        Assert.Equal(RegistrationRemoved, File.ReadAllText(services));
    }

    [Fact]
    public void WithoutSemanticModels_ChangesNothing()
    {
        var formatter = _app.Write("logic/Pdf/PdfFormatter.cs", Formatter(PassThrough));

        var result = new UnusedPdfFormatterMigration(new CSharpSourceScanner(AppFolder)).Migrate();

        Assert.Empty(result.Messages);
        Assert.True(File.Exists(formatter));
    }
}
