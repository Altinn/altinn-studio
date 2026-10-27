using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Ai.Enrichment.Agents;
using Altinn.App.Ai.Enrichment.Mapping;
using Altinn.App.Ai.Enrichment.Models;
using Altinn.App.Ai.Enrichment.Orchestration;
using Altinn.App.Ai.Enrichment.Rendering;

namespace Altinn.App.Ai.Enrichment.Pipeline;

/// <summary>
/// Per-item orchestrated agent step. Runs <see cref="IEvaluationOrchestrator"/>
/// over the application data with markdown rules + deterministic tools, merges
/// the verdicts into the document the configured mapper produces, publishes the
/// merged JSON to the pipeline context, and — when a template is configured —
/// renders it to PDF. A mapper is required because the enrichment output needs
/// envelope fields (meta, applicant, ...) that the orchestrator does not produce.
/// </summary>
public sealed class AgentOrchestratedStep : IEnrichmentStep
{
    private const int DefaultMaxToolIterations = 5;
    private const int DefaultConcurrency = 5;
    private const string DefaultSchemaFile = "sjekkliste.json";

    private readonly StepDefinition _definition;
    private readonly IDataMapper _mapper;
    private readonly IEvaluationOrchestrator _orchestrator;
    private readonly IRulesLoader _rulesLoader;
    private readonly ITypstRenderer _renderer;
    private readonly string _rulesFolderAbsolutePath;
    private readonly string _schemaFilePath;
    private readonly string? _templatePath;
    private readonly string? _traceDirAbsolutePath;
    private readonly ILogger _logger;

    public string Name => _definition.Name;

    public AgentOrchestratedStep(
        StepDefinition definition,
        IDataMapper mapper,
        IEvaluationOrchestrator orchestrator,
        IRulesLoader rulesLoader,
        ITypstRenderer renderer,
        AgentFolder folder,
        ILogger logger)
    {
        if (!string.IsNullOrEmpty(definition.Template) && string.IsNullOrEmpty(definition.Output))
            throw new InvalidOperationException($"Step '{definition.Name}' (agent-pdf-orchestrated) requires 'output' when 'template' is set.");

        var rulesSubfolder = string.IsNullOrEmpty(definition.RulesFolder) || definition.RulesFolder == "."
            ? string.Empty
            : definition.RulesFolder;
        _rulesFolderAbsolutePath = string.IsNullOrEmpty(rulesSubfolder)
            ? folder.RulesDirectory
            : Path.Combine(folder.RulesDirectory, rulesSubfolder);
        _schemaFilePath = Path.Combine(folder.RegistriesDirectory, definition.SchemaFile ?? DefaultSchemaFile);
        _templatePath = string.IsNullOrEmpty(definition.Template)
            ? null
            : Path.Combine(folder.TemplatesDirectory, definition.Template);

        _traceDirAbsolutePath = ResolveTraceDir(definition.TraceDir);

        _definition = definition;
        _mapper = mapper;
        _orchestrator = orchestrator;
        _rulesLoader = rulesLoader;
        _renderer = renderer;
        _logger = logger;
    }

    public async Task<IReadOnlyList<GeneratedFile>> ExecuteAsync(
        JsonDocument application,
        PipelineContext context,
        CancellationToken cancellationToken = default)
    {
        using var schema = JsonDocument.Parse(await File.ReadAllTextAsync(_schemaFilePath, cancellationToken));

        var rules = await _rulesLoader.LoadAsync(_rulesFolderAbsolutePath, cancellationToken);
        if (rules.Count == 0)
        {
            _logger.LogWarning(
                "No markdown rules found under {RulesFolder} — all items will default to 'ikke_vurdert'",
                _rulesFolderAbsolutePath);
        }

        var options = new OrchestratorOptions
        {
            MaxToolIterations = _definition.MaxToolIterations ?? DefaultMaxToolIterations,
            Concurrency = _definition.Concurrency ?? DefaultConcurrency,
            TraceDirAbsolutePath = _traceDirAbsolutePath,
        };

        _logger.LogInformation(
            "Orchestrator {StepName}: {RuleCount} rules, concurrency={Concurrency}, maxIter={MaxIter}",
            Name, rules.Count, options.Concurrency, options.MaxToolIterations);

        var result = await _orchestrator.RunAsync(application, rules, options, cancellationToken);

        _logger.LogInformation(
            "Orchestrator {StepName} done: {WallMs}ms, {LlmCalls} LLM calls, {ToolCalls} tool calls",
            Name, result.WallTimeMs, result.TotalLlmCalls, result.TotalToolCalls);

        using var aggregated = VerdictAggregator.Aggregate(schema, result.Verdicts);
        using var mapped = _mapper.Map(application.RootElement);
        using var merged = MergeAggregatedInto(mapped, aggregated);

        context.Set(_definition.PublishTo ?? _definition.Name, SerializeJson(merged));

        if (_templatePath is null)
            return [];

        var pdfBytes = await _renderer.RenderPdfAsync(merged, _templatePath, cancellationToken);
        return [new GeneratedFile(_definition.Output!, "application/pdf", pdfBytes)];
    }

    /// <summary>
    /// Replaces the aggregator's root subtree (e.g. <c>sjekkliste</c>) in the
    /// mapper's output with the orchestrator's aggregated verdicts (which already
    /// include the right labels per item). The mapper's other sections pass
    /// through untouched so the template receives the envelope it expects.
    /// </summary>
    private static JsonDocument MergeAggregatedInto(JsonDocument mapped, JsonDocument aggregated)
    {
        var node = JsonNode.Parse(mapped.RootElement.GetRawText())!.AsObject();
        foreach (var property in aggregated.RootElement.EnumerateObject())
        {
            node[property.Name] = JsonNode.Parse(property.Value.GetRawText());
        }
        return JsonDocument.Parse(node.ToJsonString());
    }

    private static string? ResolveTraceDir(string? configured)
    {
        if (string.IsNullOrWhiteSpace(configured))
            return null;
        return Path.IsPathRooted(configured)
            ? configured
            : Path.Combine(Path.GetTempPath(), configured);
    }

    private static string SerializeJson(JsonDocument doc)
    {
        using var stream = new MemoryStream();
        using var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = true });
        doc.WriteTo(writer);
        writer.Flush();
        return Encoding.UTF8.GetString(stream.ToArray());
    }
}
