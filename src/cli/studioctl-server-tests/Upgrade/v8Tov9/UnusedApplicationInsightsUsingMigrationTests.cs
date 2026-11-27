using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers <see cref="UnusedApplicationInsightsUsingMigration"/>: a using directive for the Application Insights SDK
/// goes only when the v8 semantic model shows that nothing else in the file uses the SDK.
/// </summary>
public sealed class UnusedApplicationInsightsUsingMigrationTests : IDisposable
{
    // A stand-in for the SDK with the real assembly name, which is what the migration keys on.
    private static readonly Lazy<MetadataReference> _sdk = new(() =>
        SemanticScannerFactory.EmitStubAssembly(
            "Microsoft.ApplicationInsights",
            """
            namespace Microsoft.ApplicationInsights
            {
                public class TelemetryClient
                {
                    public void TrackEvent(string name) { }
                }
            }
            namespace Microsoft.ApplicationInsights.DataContracts
            {
                public class RequestTelemetry { }
            }
            namespace Microsoft.ApplicationInsights.WindowsServer
            {
                public class DeveloperModeWithDebuggerAttachedTelemetryModule { }
            }
            namespace Microsoft.ApplicationInsights.Extensibility
            {
                public static class TelemetryExtensions
                {
                    public static int Count(this string text) => text.Length;
                }
            }
            namespace Microsoft.ApplicationInsights.MetricDimensionNames
            {
                public static class TelemetryContext
                {
                    public const string Operation = "operation";
                }
            }
            """
        )
    );

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private MigrationResult Migrate(bool semantic = true)
    {
        var scanner = semantic ? SemanticScannerFactory.CreateScanner(AppFolder, _sdk.Value) : new(AppFolder);
        return new UnusedApplicationInsightsUsingMigration(scanner).Migrate();
    }

    [Fact]
    public void Removes_usings_nothing_in_the_file_uses()
    {
        _app.Write(
            "logic/InstantiationProcessor.cs",
            """
            using System;
            using Microsoft.ApplicationInsights.WindowsServer;
            using Microsoft.ApplicationInsights.DataContracts; // left by the IDE
            using static Microsoft.ApplicationInsights.MetricDimensionNames.TelemetryContext;

            namespace Altinn.App.logic;

            public class InstantiationProcessor
            {
                public string Name => nameof(InstantiationProcessor) + Environment.NewLine;
            }
            """
        );

        var result = Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Contains(
            result.Messages,
            m => m.Text.Contains("logic/InstantiationProcessor.cs", StringComparison.Ordinal)
        );
        Assert.Equal(
            """
            using System;
            // left by the IDE

            namespace Altinn.App.logic;

            public class InstantiationProcessor
            {
                public string Name => nameof(InstantiationProcessor) + Environment.NewLine;
            }
            """,
            _app.Read("logic/InstantiationProcessor.cs")
        );
    }

    [Fact]
    public void Keeps_every_sdk_using_in_a_file_that_uses_a_type_from_one()
    {
        const string source = """
            using Microsoft.ApplicationInsights;
            using Microsoft.ApplicationInsights.WindowsServer;

            public class Tracker
            {
                private readonly TelemetryClient _client = new();
            }
            """;
        _app.Write("Tracker.cs", source);

        var result = Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(source, _app.Read("Tracker.cs"));
    }

    [Fact]
    public void Keeps_a_using_static_whose_member_is_used()
    {
        const string source = """
            using static Microsoft.ApplicationInsights.MetricDimensionNames.TelemetryContext;

            public class Dimensions
            {
                public string Name => Operation;
            }
            """;
        _app.Write("Dimensions.cs", source);

        Migrate();

        Assert.Equal(source, _app.Read("Dimensions.cs"));
    }

    [Fact]
    public void Keeps_a_using_that_brings_in_an_extension_method()
    {
        const string source = """
            using Microsoft.ApplicationInsights.Extensibility;

            public class Lengths
            {
                public int Of(string text) => text.Count();
            }
            """;
        _app.Write("Lengths.cs", source);

        Migrate();

        Assert.Equal(source, _app.Read("Lengths.cs"));
    }

    [Fact]
    public void Keeps_the_usings_without_a_semantic_model_for_the_detector_to_report()
    {
        const string source = """
            using Microsoft.ApplicationInsights.WindowsServer;

            public class Nothing { }
            """;
        _app.Write("Nothing.cs", source);
        var project = _app.Write("App.csproj", "<Project Sdk=\"Microsoft.NET.Sdk.Web\"></Project>");

        var result = Migrate(semantic: false);
        var detected = new ApplicationInsightsUsageDetector(new CSharpSourceScanner(AppFolder), project).Detect();

        Assert.Empty(result.Messages);
        Assert.Equal(source, _app.Read("Nothing.cs"));
        Assert.True(detected.RequiresManualFollowUp);
    }
}
