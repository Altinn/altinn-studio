using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ApplicationInsightsUsageDetectorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private MigrationResult Detect(string packageReferences = "")
    {
        var project = _app.Write(
            "App.csproj",
            $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.0.0" />
                {packageReferences}
              </ItemGroup>
            </Project>
            """
        );
        return new ApplicationInsightsUsageDetector(
            new CSharpSourceScanner(Path.Combine(_app.Root, "App")),
            project
        ).Detect();
    }

    [Fact]
    public void Reports_a_telemetry_initializer_and_its_registration()
    {
        _app.Write(
            "Telemetry/PrivacyTelemetryInitializer.cs",
            """
            using Microsoft.ApplicationInsights.Channel;
            using Microsoft.ApplicationInsights.Extensibility;
            public class PrivacyTelemetryInitializer : ITelemetryInitializer
            {
                public void Initialize(ITelemetry telemetry) { }
            }
            """
        );
        _app.Write(
            "Program.cs",
            """
            services.AddApplicationInsightsTelemetry(options => { });
            services.AddSingleton<ITelemetryInitializer, PrivacyTelemetryInitializer>();
            services.AddApplicationInsightsTelemetryProcessor<IdentityTelemetryFilter>();
            """
        );

        var result = Detect();

        Assert.True(result.RequiresManualFollowUp);
        Assert.Contains(result.Todos, t => t.Contains("BaseProcessor<Activity>", StringComparison.Ordinal));
        Assert.Contains(
            result.Warnings,
            w =>
                w.StartsWith(
                    "Telemetry/PrivacyTelemetryInitializer.cs:1: using Microsoft.ApplicationInsights.Channel",
                    StringComparison.Ordinal
                )
        );
        Assert.Contains(
            result.Warnings,
            w => w.Contains("PrivacyTelemetryInitializer : ITelemetryInitializer", StringComparison.Ordinal)
        );
        Assert.Contains(result.Warnings, w => w.EndsWith(".cs:5: ITelemetry", StringComparison.Ordinal));
        Assert.Contains(result.Warnings, w => w == "Program.cs:1: AddApplicationInsightsTelemetry");
        Assert.Contains(result.Warnings, w => w == "Program.cs:2: ITelemetryInitializer");
        Assert.Contains(result.Warnings, w => w == "Program.cs:3: IdentityTelemetryFilter");
    }

    [Fact]
    public void Reports_a_stray_using_static_and_a_fully_qualified_reference()
    {
        _app.Write(
            "logic/InstantiationHandler.cs",
            """
            using static Microsoft.ApplicationInsights.MetricDimensionNames.TelemetryContext;
            public class Handler
            {
                private readonly Microsoft.ApplicationInsights.TelemetryClient _client;
            }
            """
        );

        var result = Detect();

        Assert.Contains(
            result.Warnings,
            w => w.Contains("using Microsoft.ApplicationInsights.MetricDimensionNames", StringComparison.Ordinal)
        );
        Assert.Contains(result.Warnings, w => w.Contains(":4: Microsoft.ApplicationInsights.TelemetryClient"));
    }

    [Fact]
    public void Reports_an_azure_monitor_exporter_and_the_package_references()
    {
        _app.Write(
            "Telemetry/Setup.cs",
            """
            using Azure.Monitor.OpenTelemetry.Exporter;
            using OpenTelemetry.Trace;
            public static class Setup
            {
                public static void Add(TracerProviderBuilder builder) => builder.AddAzureMonitorTraceExporter();

                public static void Use(OpenTelemetryBuilder builder) => builder.UseAzureMonitorExporter(x => { });
            }
            """
        );

        var result = Detect(
            """
            <PackageReference Include="Azure.Monitor.OpenTelemetry.Exporter" Version="1.8.2" />
                <PackageReference Include="Microsoft.ApplicationInsights.AspNetCore" Version="2.23.0" />
            """
        );

        Assert.True(result.RequiresManualFollowUp);
        Assert.Contains(result.Warnings, w => w == "Telemetry/Setup.cs:1: using Azure.Monitor.OpenTelemetry.Exporter");
        Assert.Contains(result.Warnings, w => w == "Telemetry/Setup.cs:5: AddAzureMonitorTraceExporter");
        Assert.Contains(result.Warnings, w => w == "Telemetry/Setup.cs:7: UseAzureMonitorExporter");
        Assert.Contains(
            result.Warnings,
            w => w == "App.csproj:4: PackageReference Azure.Monitor.OpenTelemetry.Exporter"
        );
        Assert.Contains(
            result.Warnings,
            w => w == "App.csproj:5: PackageReference Microsoft.ApplicationInsights.AspNetCore"
        );
    }

    [Fact]
    public void Reports_UseOtlpExporter_but_not_a_named_otlp_exporter()
    {
        _app.Write(
            "Program.cs",
            """
            services.AddOpenTelemetry().UseOtlpExporter();
            services.ConfigureOpenTelemetryTracerProvider(b => b.AddOtlpExporter("ElasticExporter", null));
            """
        );

        var result = Detect();

        var todo = Assert.Single(result.Todos);
        Assert.Contains("UseOtlpExporter()", todo, StringComparison.Ordinal);
        Assert.Contains(result.Warnings, w => w.Contains("UseOtlpExporter", StringComparison.Ordinal));
        Assert.DoesNotContain(result.Warnings, w => w.Contains("AddOtlpExporter", StringComparison.Ordinal));
    }

    [Fact]
    public void Ignores_open_telemetry_code_and_an_apps_own_types_with_generic_names()
    {
        _app.Write(
            "Telemetry/HealthCheckFilterProcessor.cs",
            """
            using System.Diagnostics;
            using OpenTelemetry;
            // OTel equivalent of the Application Insights HealthTelemetryFilter.
            internal sealed class HealthCheckFilterProcessor : BaseProcessor<Activity> { }
            public interface ITelemetry { }
            public class TelemetryConfiguration { }
            """
        );
        _app.Write("Program.cs", "services.AddSingleton<ITelemetry, Telemetry>();");

        var result = Detect();

        Assert.Empty(result.Messages);
    }
}
