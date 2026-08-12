using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the semantic detection paths (see <see cref="CSharpSemanticQueries"/>): each case is either
/// a false positive the syntax heuristics cannot avoid, or a false negative they cannot catch, with
/// the contrasting syntax-only behaviour asserted alongside where it demonstrates the difference.
/// </summary>
public sealed class SemanticDetectionTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private CSharpSourceScanner SyntaxScanner() => new(AppFolder);

    private static readonly Lazy<MetadataReference> _coreStub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            """
            namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks
            {
                public sealed class ServiceTaskErrorHandling { }

                public class ServiceTaskResult
                {
                    public static ServiceTaskResult Failed(ServiceTaskErrorHandling handling) => new();
                    public static ServiceTaskResult FailedAbortProcessNext() => new();
                }
            }

            namespace Altinn.App.Core.EFormidling.Interface
            {
                public interface IEFormidlingService
                {
                    void SendEFormidlingShipment(Altinn.App.Core.Models.Instance instance);
                    void SendEFormidlingShipment(Altinn.App.Core.Models.Instance instance, string configuration);
                }
            }

            namespace Altinn.App.Core.Models
            {
                public class Instance { }

                public class PayloadHolder
                {
                    public byte[] Payload => System.Array.Empty<byte>();
                    public System.ReadOnlyMemory<byte> Memory => default;
                }
            }

            namespace Altinn.App.Core.Features.Correspondence.Builder
            {
                public class CorrespondenceBuilder
                {
                    public CorrespondenceBuilder WithData(System.ReadOnlyMemory<byte> data) => this;
                    public CorrespondenceBuilder WithData(System.IO.Stream data) => this;
                    public CorrespondenceBuilder WithResourceId(string id) => this;
                    public CorrespondenceBuilder WithSender(string sender) => this;
                    public CorrespondenceBuilder WithSendersReference(string reference) => this;
                }
            }

            namespace Altinn.App.Api.Extensions
            {
                public static class ServiceCollectionExtensions
                {
                    public static void ConfigureMaskinportenClient(this object services, string configSectionPath) { }
                }
            }
            """
        )
    );

    private static readonly Lazy<MetadataReference> _externalPackageStub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.ApiClients.Maskinporten",
            """
            namespace Altinn.ApiClients.Maskinporten.Services
            {
                public interface IMaskinportenService { }

                public class MaskinportenService : IMaskinportenService { }
            }
            """
        )
    );

    private CSharpSourceScanner SemanticScanner() =>
        SemanticScannerFactory.CreateScanner(AppFolder, _coreStub.Value, _externalPackageStub.Value);

    // --- ServiceTaskResultApiDetector ------------------------------------------------------------

    [Fact]
    public void ServiceTaskResult_AliasedFailedCall_OnlySemanticCatchesIt()
    {
        _app.Write(
            "logic/Tasks.cs",
            """
            using STR = Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskResult;
            using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

            public class Tasks
            {
                public object Run() => STR.Failed(new ServiceTaskErrorHandling());
            }
            """
        );

        var syntax = new ServiceTaskResultApiDetector(SyntaxScanner()).Detect();
        var semantic = new ServiceTaskResultApiDetector(SemanticScanner()).Detect();

        // Syntax sees the ServiceTaskErrorHandling type reference but not the aliased Failed call;
        // semantic reports both. Location lines have the shape `path:line: Symbol`.
        Assert.Contains(syntax.Warnings, static w => w.Contains("Tasks.cs:6: ServiceTaskErrorHandling"));
        Assert.DoesNotContain(syntax.Warnings, static w => w.Contains(": Failed"));
        Assert.Contains(semantic.Warnings, static w => w.Contains("Tasks.cs:6: Failed"));
        Assert.True(semantic.ManualActionRequired);
    }

    [Fact]
    public void ServiceTaskResult_AppsOwnTypeOfTheSameName_OnlySyntaxFlagsIt()
    {
        _app.Write(
            "logic/MyErrors.cs",
            """
            namespace MyApp
            {
                public class ServiceTaskErrorHandling { }

                public class Uses
                {
                    public ServiceTaskErrorHandling Make() => new();
                }
            }
            """
        );

        var syntax = new ServiceTaskResultApiDetector(SyntaxScanner()).Detect();
        var semantic = new ServiceTaskResultApiDetector(SemanticScanner()).Detect();

        Assert.True(syntax.ManualActionRequired);
        Assert.False(semantic.ManualActionRequired);
        Assert.Empty(semantic.Warnings);
    }

    // --- LegacyEFormidlingCodeDetector -----------------------------------------------------------

    [Fact]
    public void EFormidling_OverloadResolution_SeparatesRemovedFromSurviving()
    {
        _app.Write(
            "logic/Shipments.cs",
            """
            using Altinn.App.Core.EFormidling.Interface;
            using Altinn.App.Core.Models;

            public class Shipments
            {
                public void Send(IEFormidlingService service, Instance instance)
                {
                    service.SendEFormidlingShipment(instance);
                    service.SendEFormidlingShipment(instance, "config");
                }
            }
            """
        );

        var semantic = new LegacyEFormidlingCodeDetector(SemanticScanner()).Detect();

        // Only the one-argument call on line 8 is the removed overload; the two-argument call on
        // line 9 survives in v9 and must not be reported.
        var callLines = semantic.Warnings.Where(static w => w.Contains("Shipments.cs:")).ToList();
        Assert.Single(callLines);
        Assert.Contains("Shipments.cs:8: SendEFormidlingShipment", callLines[0]);
    }

    [Fact]
    public void EFormidling_AppsOwnOneArgMethodOfTheSameName_OnlySyntaxFlagsIt()
    {
        _app.Write(
            "logic/Exporter.cs",
            """
            public class Exporter
            {
                public void Run() => SendEFormidlingShipment("payload");

                private void SendEFormidlingShipment(string payload) { }
            }
            """
        );

        var syntax = new LegacyEFormidlingCodeDetector(SyntaxScanner()).Detect();
        var semantic = new LegacyEFormidlingCodeDetector(SemanticScanner()).Detect();

        // Syntax flags both the call and the declaration; semantic keeps only the declaration match
        // (an app method whose shape mirrors the removed interface overload), never the call, which
        // binds to the app's own method.
        Assert.Contains(syntax.Warnings, static w => w.Contains("Exporter.cs:3"));
        Assert.DoesNotContain(semantic.Warnings, static w => w.Contains("Exporter.cs:3"));
    }

    // --- ExternalMaskinportenPackageDetector -----------------------------------------------------

    [Fact]
    public void ExternalMaskinporten_FullyQualifiedUse_OnlySemanticCatchesIt()
    {
        _app.Write(
            "logic/Client.cs",
            """
            public class Client
            {
                public Altinn.ApiClients.Maskinporten.Services.IMaskinportenService? Service { get; set; }
            }
            """
        );
        WriteProjectWithoutExternalPackage();

        var syntax = new ExternalMaskinportenPackageDetector(SyntaxScanner(), ProjectFile()).Detect();
        var semantic = new ExternalMaskinportenPackageDetector(SemanticScanner(), ProjectFile()).Detect();

        // IMaskinportenService is on the ambiguous list, gated on a namespace import the file does
        // not have - syntax misses the fully qualified use; assembly identity catches it.
        Assert.Empty(syntax.Warnings);
        Assert.Contains(semantic.Warnings, static w => w.Contains("IMaskinportenService"));
        Assert.True(semantic.ManualActionRequired);
    }

    [Fact]
    public void ExternalMaskinporten_AppsOwnServiceWithImport_OnlySyntaxFlagsIt()
    {
        _app.Write(
            "logic/OwnService.cs",
            """
            using Altinn.ApiClients.Maskinporten.Services;

            namespace MyApp
            {
                public class MaskinportenTokenHandler { }

                public class Uses
                {
                    public MaskinportenTokenHandler Handler => new();
                }
            }
            """
        );
        WriteProjectWithoutExternalPackage();

        var syntax = new ExternalMaskinportenPackageDetector(SyntaxScanner(), ProjectFile()).Detect();
        var semantic = new ExternalMaskinportenPackageDetector(SemanticScanner(), ProjectFile()).Detect();

        // The namespace import makes syntax count the app's own MaskinportenTokenHandler as package
        // usage; semantic still reports the import itself but never the app's own type.
        Assert.Contains(syntax.Warnings, static w => w.Contains("MaskinportenTokenHandler"));
        Assert.DoesNotContain(semantic.Warnings, static w => w.Contains("MaskinportenTokenHandler"));
        Assert.Contains(semantic.Warnings, static w => w.Contains("Altinn.ApiClients.Maskinporten"));
    }

    // --- MaskinportenClientOverrideDetector ------------------------------------------------------

    [Fact]
    public void ClientOverride_ConstSectionName_OnlySemanticExemptsIt()
    {
        _app.Write(
            "Program.cs",
            """
            using Altinn.App.Api.Extensions;

            public static class Startup
            {
                private const string SectionName = "MaskinportenSettings";

                public static void Register(object services)
                {
                    services.ConfigureMaskinportenClient(SectionName);
                }
            }
            """
        );

        var syntax = new MaskinportenClientOverrideDetector(SyntaxScanner()).Detect();
        var semantic = new MaskinportenClientOverrideDetector(SemanticScanner()).Detect();

        Assert.True(syntax.ManualActionRequired);
        Assert.False(semantic.ManualActionRequired);
        Assert.Empty(semantic.Warnings);
    }

    // --- CorrespondenceApiMigration.WithData -----------------------------------------------------

    [Fact]
    public void WithData_ByteArgumentDeclaredInTheSdk_OnlySemanticCompletesTheRewrite()
    {
        var path = _app.Write(
            "logic/Sender.cs",
            """
            using Altinn.App.Core.Features.Correspondence.Builder;
            using Altinn.App.Core.Models;

            public class Sender
            {
                public void Send(CorrespondenceBuilder builder, PayloadHolder holder)
                {
                    builder.WithData(holder.Payload);
                }
            }
            """
        );

        // Syntax cannot type `holder.Payload` (its declaration lives in the SDK, not the app) and
        // reports it for the developer to finish.
        var syntax = new CorrespondenceApiMigration(SyntaxScanner()).Migrate();
        Assert.True(syntax.ManualActionRequired);
        Assert.DoesNotContain("MemoryStream", File.ReadAllText(path));

        // Overload resolution proves it a byte array, so the rewrite completes.
        var semantic = new CorrespondenceApiMigration(SemanticScanner()).Migrate();
        Assert.False(semantic.ManualActionRequired);
        Assert.Contains("WithData(new MemoryStream(holder.Payload))", File.ReadAllText(path));
    }

    [Fact]
    public void WithData_GenuineReadOnlyMemory_IsReportedNotWrapped()
    {
        var path = _app.Write(
            "logic/Sender.cs",
            """
            using Altinn.App.Core.Features.Correspondence.Builder;
            using Altinn.App.Core.Models;

            public class Sender
            {
                public void Send(CorrespondenceBuilder builder, PayloadHolder holder)
                {
                    builder.WithData(holder.Memory);
                }
            }
            """
        );

        var semantic = new CorrespondenceApiMigration(SemanticScanner()).Migrate();

        // `new MemoryStream(readOnlyMemory)` would not compile, so this must stay a report - and the
        // report must say the type IS known and give advice that compiles.
        Assert.True(semantic.ManualActionRequired);
        Assert.DoesNotContain("MemoryStream", File.ReadAllText(path));
        Assert.Contains(semantic.Warnings, static w => w.Contains("cannot be wrapped in a MemoryStream directly"));
        Assert.DoesNotContain(semantic.Warnings, static w => w.Contains("could not be determined"));
    }

    [Fact]
    public void WithData_StreamThroughAVariable_OnlySemanticLeavesItAloneSilently()
    {
        var path = _app.Write(
            "logic/Sender.cs",
            """
            using Altinn.App.Core.Features.Correspondence.Builder;

            public class Sender
            {
                public void Send(CorrespondenceBuilder builder, System.IO.Stream payload)
                {
                    var data = payload;
                    builder.WithData(data);
                }
            }
            """
        );

        var semantic = new CorrespondenceApiMigration(SemanticScanner()).Migrate();

        Assert.False(semantic.ManualActionRequired);
        Assert.DoesNotContain("MemoryStream", File.ReadAllText(path));
    }

    // --- Detection binds against the pristine pre-rewrite snapshot -------------------------------

    [Fact]
    public void Detection_AfterTheNamespaceRewrite_MustUseThePristineView()
    {
        // The production flow: the IServiceTask namespace rewrite (step 6) runs before detection
        // (step 11). After the rewrite the v8 compilation cannot bind the removed names any more, so
        // detection on the live scanner goes blind - the pristine view (frozen automatically by the
        // first Update) is what keeps it exact.
        _app.Write(
            "logic/MyTask.cs",
            """
            using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

            public class MyTask
            {
                public object Run() => ServiceTaskResult.FailedAbortProcessNext();
            }
            """
        );

        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var scanner = SemanticScanner();

        new UsingNamespaceMigration(scanner).Migrate(
            "Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks",
            "Altinn.App.Core.Features.Process",
            new System.Text.RegularExpressions.Regex(@"\.cs$")
        );

        // The live view demonstrates the blindness the pristine view exists to prevent.
        var onLiveScanner = new ServiceTaskResultApiDetector(scanner).Detect();
        Assert.Empty(onLiveScanner.Warnings);

        var pristine = scanner.PristineView;
        Assert.NotSame(scanner, pristine);
        var onPristine = new ServiceTaskResultApiDetector(pristine).Detect();
        Assert.Contains(onPristine.Warnings, static w => w.Contains("MyTask.cs:5: FailedAbortProcessNext"));
        Assert.True(onPristine.ManualActionRequired);

        // The frozen view is read-only: writing through it would revert the rewriters' output.
        var file = pristine.Files[0];
        Assert.Throws<InvalidOperationException>(() => pristine.Update(file, file.Root));
    }

    [Fact]
    public async Task CheckRemovedCSharpApis_SplitsTheViews_SemanticPristine_SyntaxLive()
    {
        // The wiring inside CheckRemovedCSharpApis carries two invariants at once: the semantic-aware
        // detectors must see the pristine view (or they go blind after the namespace rewrite - the
        // critical bug), and the syntax-only detectors must see the live view (or they re-report what
        // a rewriter just fixed - "a usage is either fixed here or warned about there, never both").
        _app.Write(
            "logic/MyTask.cs",
            """
            using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

            public class MyTask
            {
                public object Run() => ServiceTaskResult.FailedAbortProcessNext();
            }
            """
        );
        _app.Write(
            "logic/Sender.cs",
            """
            using Altinn.App.Core.Features.Correspondence.Builder;

            public class Sender
            {
                public object Send(CorrespondenceBuilder builder) =>
                    builder.WithResourceId("x").WithSender("y").WithSendersReference("z");
            }
            """
        );
        WriteProjectWithoutExternalPackage();

        var output = new StringWriter();
        using var outputScope = UpgradeConsole.Use(output, output);
        var scanner = SemanticScanner();

        new UsingNamespaceMigration(scanner).Migrate(
            "Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks",
            "Altinn.App.Core.Features.Process",
            new System.Text.RegularExpressions.Regex(@"\.cs$")
        );
        var correspondence = new CorrespondenceApiMigration(scanner).Migrate();
        Assert.Contains(correspondence.Warnings, static w => w.Contains("WithSender"));

        var exitCode = await V8Tov9Upgrade.CheckRemovedCSharpApis(scanner, ProjectFile());

        var text = output.ToString();
        // Semantic detector on the pristine view: still reports the removed factory.
        Assert.Contains("MyTask.cs:5: FailedAbortProcessNext", text);
        // Syntax detector on the live view: does not re-report the no-op call the rewriter removed.
        Assert.DoesNotContain(": WithSender", text);
        Assert.Equal(3, exitCode);
    }

    // --- ReferencesToAssembly must not report namespace segments ---------------------------------

    [Fact]
    public void ExternalMaskinporten_UsingDirective_IsReportedOnceWithoutNamespaceSegmentNoise()
    {
        _app.Write(
            "logic/Client.cs",
            """
            using Altinn.ApiClients.Maskinporten.Services;

            public class Client
            {
                public IMaskinportenService? Service { get; set; }
            }
            """
        );
        WriteProjectWithoutExternalPackage();

        var semantic = new ExternalMaskinportenPackageDetector(SemanticScanner(), ProjectFile()).Detect();

        // Namespace segments bind to the package's assembly too (merged namespaces collapse to their
        // single constituent), but reporting `ApiClients`/`Services` per using directive would bury
        // the real usages. One line for the directive, one for the actual type use.
        var locationLines = semantic.Warnings.Where(static w => w.Contains("Client.cs:")).ToList();
        Assert.Equal(2, locationLines.Count);
        Assert.Contains(locationLines, static w => w.Contains("using Altinn.ApiClients.Maskinporten.Services"));
        Assert.Contains(locationLines, static w => w.Contains("Client.cs:5: IMaskinportenService"));
        Assert.DoesNotContain(semantic.Warnings, static w => w.EndsWith(": ApiClients", StringComparison.Ordinal));
        Assert.DoesNotContain(semantic.Warnings, static w => w.EndsWith(": Services", StringComparison.Ordinal));
    }

    // --- Scanner.Update keeps semantic models current --------------------------------------------

    [Fact]
    public void ScannerUpdate_KeepsSemanticModelsCurrentAfterARewrite()
    {
        _app.Write(
            "Program.cs",
            """
            using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

            public class Tasks
            {
                public object Run() => ServiceTaskResult.FailedAbortProcessNext();
            }
            """
        );

        var scanner = SemanticScanner();

        // A rewrite through the scanner must leave the (new) file bindable: the detector still finds
        // the removed factory on the updated tree.
        var file = scanner.Files.Single(static f => f.RelativePath.Contains("Program"));
        var updated = scanner.Update(file, file.Root.WithLeadingTrivia(file.Root.GetLeadingTrivia()));
        Assert.NotNull(updated.SemanticModel);

        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var result = new ServiceTaskResultApiDetector(scanner).Detect();
        Assert.Contains(result.Warnings, static w => w.Contains("FailedAbortProcessNext"));
    }

    private string ProjectFile() => Path.Combine(AppFolder, "App.csproj");

    private void WriteProjectWithoutExternalPackage() =>
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.5" />
              </ItemGroup>
            </Project>
            """
        );
}
