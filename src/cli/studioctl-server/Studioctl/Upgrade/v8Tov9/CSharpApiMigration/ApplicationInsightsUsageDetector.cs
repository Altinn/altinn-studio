using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for app code that uses the Application Insights SDK, an Azure Monitor exporter of its own, or
/// the v8 telemetry filters v9 removes (<c>IdentityTelemetryFilter</c> and <c>HealthTelemetryFilter</c>). v8 brought
/// the SDK in through <c>Altinn.App.Api</c>; v9 exports only over OpenTelemetry (OTLP), so such code no longer
/// compiles, or compiles and sends nothing. What replaces it depends on what the code was for - recording, enriching or
/// scrubbing telemetry - so it is reported, never rewritten.
/// </summary>
/// <remarks>
/// Reads the project file as well as the source, for package references of the app's own.
/// </remarks>
internal sealed class ApplicationInsightsUsageDetector
{
    private const string SdkNamespace = "Microsoft.ApplicationInsights";
    private const string ExporterNamespace = "Azure.Monitor.OpenTelemetry";

    /// <summary>Types whose simple names belong to the Application Insights SDK or the removed v8 filters.</summary>
    private static readonly IReadOnlySet<string> _distinctiveTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "TelemetryClient",
        "ITelemetryInitializer",
        "ITelemetryProcessor",
        "RequestTelemetry",
        "DependencyTelemetry",
        "ExceptionTelemetry",
        "TraceTelemetry",
        "EventTelemetry",
        "MetricTelemetry",
        "IdentityTelemetryFilter",
        "HealthTelemetryFilter",
    };

    /// <summary>
    /// SDK types with names generic enough for an app's own types, so they count only in a file that imports the
    /// SDK's namespace.
    /// </summary>
    private static readonly IReadOnlySet<string> _ambiguousTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "ITelemetry",
        "TelemetryConfiguration",
    };

    private static readonly IReadOnlySet<string> _methods = new HashSet<string>(StringComparer.Ordinal)
    {
        "AddApplicationInsightsTelemetry",
        "AddApplicationInsightsTelemetryProcessor",
        "AddApplicationInsightsTelemetryWorkerService",
        "AddAzureMonitorTraceExporter",
        "AddAzureMonitorMetricExporter",
        "AddAzureMonitorLogExporter",
        "UseAzureMonitor",
        "UseAzureMonitorExporter",
    };

    private static readonly string[] _packagePrefixes =
    [
        "Microsoft.ApplicationInsights",
        "Azure.Monitor.OpenTelemetry",
    ];

    private const string Summary =
        "v9 apps export telemetry only over OpenTelemetry (OTLP), to the runtime's collectors, which forward it to the "
        + "service owner's Application Insights. v9 no longer brings in the Application Insights SDK, so the code below "
        + "does not compile, or sends nothing. Record telemetry with ILogger, or with System.Diagnostics (ActivitySource "
        + "and Activity tags, Meter); the app libraries export both. A telemetry initializer or processor that enriches "
        + "or scrubs telemetry becomes an OpenTelemetry BaseProcessor<Activity>, registered with "
        + "services.ConfigureOpenTelemetryTracerProvider(b => b.AddProcessor<...>()), and for logs a "
        + "BaseProcessor<LogRecord> registered with ConfigureOpenTelemetryLoggerProvider. One that removes national "
        + "identity numbers must keep doing that. An Azure Monitor exporter of the app's own gets no connection string "
        + "in v9: remove it. Delete a using directive for Microsoft.ApplicationInsights that nothing in the file uses, "
        + "and remove the package references. Found:";

    private readonly CSharpSourceScanner _scanner;
    private readonly string _projectFile;

    public ApplicationInsightsUsageDetector(CSharpSourceScanner scanner, string projectFile)
    {
        _scanner = scanner;
        _projectFile = projectFile;
    }

    private const string UseOtlpExporterSummary =
        "UseOtlpExporter() stops a v9 app from starting wherever the runtime gives it a collector: the OpenTelemetry "
        + "SDK does not allow it next to the app libraries' own OTLP exporter. Remove it; the libraries already export "
        + "over OTLP. To send telemetry to a destination of the app's own as well, add a named exporter, such as "
        + "AddOtlpExporter(\"my-backend\", options => ...), with ConfigureOpenTelemetryTracerProvider. Found:";

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(MatchesIn).Concat(PackageReferences());
        var useOtlpExporter = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries.InvokedMethods(file, _crossCuttingOtlpExporter)
        );
        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(Summary, matches),
            WarnOnlyDetector.Report(UseOtlpExporterSummary, useOtlpExporter)
        );
    }

    private static readonly IReadOnlySet<string> _crossCuttingOtlpExporter = new HashSet<string>(StringComparer.Ordinal)
    {
        "UseOtlpExporter",
    };

    private static IEnumerable<CSharpApiMatch> MatchesIn(ScannedCSharpFile file)
    {
        var usings = CSharpSyntaxQueries.UsingNamespaces(file, SdkNamespace).ToList();

        var matches = usings
            .Concat(CSharpSyntaxQueries.UsingNamespaces(file, ExporterNamespace))
            .Concat(CSharpSyntaxQueries.QualifiedNameReferences(file, SdkNamespace))
            .Concat(CSharpSyntaxQueries.TypeReferences(file, _distinctiveTypes))
            .Concat(CSharpSyntaxQueries.TypesImplementing(file, _distinctiveTypes))
            .Concat(CSharpSyntaxQueries.InvokedMethods(file, _methods));

        if (usings.Count > 0)
        {
            matches = matches
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _ambiguousTypes))
                .Concat(CSharpSyntaxQueries.TypesImplementing(file, _ambiguousTypes));
        }

        return matches;
    }

    /// <summary>
    /// The project's package references to the SDK or the Azure Monitor exporter. A project file that cannot be read
    /// has none to report.
    /// </summary>
    private IEnumerable<CSharpApiMatch> PackageReferences()
    {
        XDocument document;
        try
        {
            document = XDocument.Parse(File.ReadAllText(_projectFile), LoadOptions.SetLineInfo);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or XmlException)
        {
            return [];
        }

        var projectName = Path.GetFileName(_projectFile);
        return document
                .Root?.Descendants()
                .Where(static element => element.Name.LocalName == "PackageReference")
                .Select(reference => (Element: reference, Id: reference.Attribute("Include")?.Value))
                .Where(static reference =>
                    reference.Id is { } id
                    && _packagePrefixes.Any(prefix => id.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                )
                .Select(reference => new CSharpApiMatch(
                    projectName,
                    ((IXmlLineInfo)reference.Element).LineNumber,
                    $"PackageReference {reference.Id}"
                ))
                .ToList()
            ?? [];
    }
}
