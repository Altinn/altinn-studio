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

    private const string PassThroughFormatter = """
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Models;

        namespace Altinn.App.AppLogic.Print
        {
            public class PdfHandler : IPdfFormatter
            {
                public Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
                {
                    //return Task.FromResult(layoutSettings);
                    return Task.FromResult(layoutSettings);
                }
            }
        }
        """;

    private const string FormatterWithLogic = """
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Models;

        namespace Altinn.App.AppLogic.Print
        {
            public class PdfHandler : IPdfFormatter
            {
                public Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data) =>
                    Task.FromResult(data is string ? new LayoutSettings() : layoutSettings);
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

    [Fact]
    public void DeletesAPassThroughFormatter_ItsRegistration_AndTheImportOfItsNamespace()
    {
        var formatter = _app.Write("logic/Pdf/PdfFormatter.cs", PassThroughFormatter);
        var services = _app.Write("Services.cs", Registration);
        var scanner = Scanner();

        var result = new UnusedPdfFormatterMigration(scanner).Migrate();

        Assert.False(File.Exists(formatter));
        Assert.Equal(RegistrationRemoved, File.ReadAllText(services));
        var message = Assert.Single(result.Messages);
        Assert.Contains("returned the layout settings unchanged", message.Text);
        Assert.Empty(new RemovedPdfFormatterDetector(scanner).Detect().Messages);
        Assert.DoesNotContain(scanner.PristineView.Files, file => file.Path == formatter);
    }

    [Theory]
    [InlineData(
        "public Task<LayoutSettings> FormatPdf(LayoutSettings settings, object data) => Task.FromResult(settings);"
    )]
    [InlineData(
        "public async Task<LayoutSettings> FormatPdf(LayoutSettings settings, object data) { return await Task.FromResult(settings); }"
    )]
    [InlineData(
        "public async Task<LayoutSettings> FormatPdf(LayoutSettings settings, object data) { return settings; }"
    )]
    public void RecognizesEveryWayOfReturningTheSettingsUnchanged(string method)
    {
        var formatter = _app.Write(
            "logic/Pdf/PdfFormatter.cs",
            PassThroughFormatter[..PassThroughFormatter.IndexOf("public Task", StringComparison.Ordinal)]
                + method
                + "\n    }\n}"
        );
        _app.Write("Services.cs", Registration);

        new UnusedPdfFormatterMigration(Scanner()).Migrate();

        Assert.False(File.Exists(formatter));
    }

    [Fact]
    public void DeletesAFormatterWithLogic_ThatIsNeverRegistered()
    {
        var formatter = _app.Write("logic/Pdf/PdfFormatter.cs", FormatterWithLogic);

        var result = new UnusedPdfFormatterMigration(Scanner()).Migrate();

        Assert.False(File.Exists(formatter));
        Assert.Contains("never registered", Assert.Single(result.Messages).Text);
    }

    [Fact]
    public void KeepsARegisteredFormatterWithLogic()
    {
        var formatter = _app.Write("logic/Pdf/PdfFormatter.cs", FormatterWithLogic);
        var services = _app.Write("Services.cs", Registration);

        var result = new UnusedPdfFormatterMigration(Scanner()).Migrate();

        Assert.Empty(result.Messages);
        Assert.True(File.Exists(formatter));
        Assert.Equal(Registration, File.ReadAllText(services));
    }

    [Fact]
    public void KeepsARegisteredFormatterWithOtherMembers()
    {
        // A constructor may inject services, or a field hold state: the class may do more than return
        // what it is given, even when FormatPdf does just that.
        var formatter = _app.Write(
            "logic/Pdf/PdfFormatter.cs",
            PassThroughFormatter.Replace(
                "    {\n        public Task",
                "    {\n        public PdfHandler() { }\n\n        public Task",
                StringComparison.Ordinal
            )
        );
        _app.Write("Services.cs", Registration);

        var result = new UnusedPdfFormatterMigration(Scanner()).Migrate();

        Assert.Empty(result.Messages);
        Assert.True(File.Exists(formatter));
    }

    [Fact]
    public void KeepsAFormatterTheAppRefersToElsewhere()
    {
        var formatter = _app.Write("logic/Pdf/PdfFormatter.cs", PassThroughFormatter);
        _app.Write(
            "logic/Wrapper.cs",
            """
            namespace Altinn.App.AppLogic.Print
            {
                public class Wrapper
                {
                    private readonly PdfHandler _inner = new();
                }
            }
            """
        );

        var result = new UnusedPdfFormatterMigration(Scanner()).Migrate();

        Assert.Empty(result.Messages);
        Assert.True(File.Exists(formatter));
    }

    [Fact]
    public void KeepsAFormatterThatSharesItsFile()
    {
        var source = PassThroughFormatter.Replace(
            "    public class PdfHandler",
            "    public class Footer { }\n\n    public class PdfHandler",
            StringComparison.Ordinal
        );
        var formatter = _app.Write("logic/Pdf/PdfFormatter.cs", source);

        var result = new UnusedPdfFormatterMigration(Scanner()).Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(source, File.ReadAllText(formatter));
    }

    [Fact]
    public void KeepsTheImport_WhenTheNamespaceHasOtherTypes()
    {
        _app.Write("logic/Pdf/PdfFormatter.cs", PassThroughFormatter);
        _app.Write("logic/Pdf/Footer.cs", "namespace Altinn.App.AppLogic.Print { public class Footer { } }");
        var services = _app.Write("Services.cs", Registration);

        new UnusedPdfFormatterMigration(Scanner()).Migrate();

        Assert.Equal("using Altinn.App.AppLogic.Print;\n" + RegistrationRemoved, File.ReadAllText(services));
    }

    [Fact]
    public void KeepsTheImport_WhenAReferencedAssemblyDeclaresTheNamespaceToo()
    {
        var formatter = _app.Write(
            "logic/Pdf/PdfFormatter.cs",
            PassThroughFormatter.Replace(
                "Altinn.App.AppLogic.Print",
                "Altinn.App.Core.Features",
                StringComparison.Ordinal
            )
        );
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
        // Whether a removal breaks a using directive takes a compilation to tell, and an app is expected
        // to compile on v8 before it moves to v9. Without one, the formatter stays for the developer.
        var formatter = _app.Write("logic/Pdf/PdfFormatter.cs", PassThroughFormatter);

        var result = new UnusedPdfFormatterMigration(new CSharpSourceScanner(AppFolder)).Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(PassThroughFormatter, File.ReadAllText(formatter));
    }
}
