using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Models;
using Altinn.Augmenter.Agent.Services.Agent.Orchestration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Per-punkt orchestrated agent step. Runs <see cref="IChecklistOrchestrator"/>
/// over the application's FlatData with markdown rules + deterministic tools,
/// merges the verdicts into the document the configured mapper produces, then
/// renders the existing checklist Typst template — identical output contract
/// to the monolithic <c>agent-pdf</c> step it replaces in production. A mapper
/// is required because the Typst template needs meta/soker/arrangement/bevilling
/// fields that the orchestrator does not produce.
/// </summary>
public sealed class AgentPdfOrchestratedStep : IPdfGenerationStep
{
    private const int DefaultMaxToolIterations = 5;
    private const int DefaultConcurrency = 5;
    private const string DefaultSjekklisteSchema = "sjekkliste.json";

    private readonly StepDefinition _definition;
    private readonly IDataMapper _mapper;
    private readonly IChecklistOrchestrator _orchestrator;
    private readonly IRulesLoader _rulesLoader;
    private readonly IPdfGeneratorService _pdfGenerator;
    private readonly IDocxGeneratorService? _docxGenerator;
    private readonly PipelineContext _pipelineContext;
    private readonly string _rulesFolderAbsolutePath;
    private readonly string _sjekklisteSchemaPath;
    private readonly string _templatePath;
    private readonly string? _docxTemplatePath;
    private readonly string? _traceDirAbsolutePath;
    private readonly ILogger _logger;

    public string Name => _definition.Name;

    public AgentPdfOrchestratedStep(
        StepDefinition definition,
        IDataMapper mapper,
        IChecklistOrchestrator orchestrator,
        IRulesLoader rulesLoader,
        IPdfGeneratorService pdfGenerator,
        IDocxGeneratorService? docxGenerator,
        PipelineContext pipelineContext,
        IOptions<ContentPathsOptions> contentPaths,
        ILogger logger)
    {
        if (string.IsNullOrEmpty(definition.Template))
            throw new InvalidOperationException($"Step '{definition.Name}' (agent-pdf-orchestrated) requires 'template'.");
        if (string.IsNullOrEmpty(definition.Output))
            throw new InvalidOperationException($"Step '{definition.Name}' (agent-pdf-orchestrated) requires 'output'.");

        var paths = contentPaths.Value;
        var rulesSubfolder = string.IsNullOrEmpty(definition.RulesFolder) || definition.RulesFolder == "."
            ? string.Empty
            : definition.RulesFolder;
        _rulesFolderAbsolutePath = string.IsNullOrEmpty(rulesSubfolder)
            ? paths.RulesRoot
            : Path.Combine(paths.RulesRoot, rulesSubfolder);
        _sjekklisteSchemaPath = Path.Combine(paths.DomainRoot, definition.SjekklisteSchema ?? DefaultSjekklisteSchema);
        _templatePath = Path.Combine(paths.TemplatesRoot, definition.Template);
        _docxTemplatePath = string.IsNullOrEmpty(definition.DocxTemplate)
            ? null
            : Path.Combine(paths.TemplatesRoot, definition.DocxTemplate);

        _traceDirAbsolutePath = ResolveTraceDir(definition.TraceDir);

        _definition = definition;
        _mapper = mapper;
        _orchestrator = orchestrator;
        _rulesLoader = rulesLoader;
        _pdfGenerator = pdfGenerator;
        _docxGenerator = docxGenerator;
        _pipelineContext = pipelineContext;
        _logger = logger;
    }

    public async Task<IReadOnlyList<GeneratedPdf>> ExecuteAsync(
        IReadOnlyList<UploadedFile> files,
        CancellationToken cancellationToken = default)
    {
        var jsonFile = files.FirstOrDefault(f => f.ContentType == "application/json");
        if (jsonFile == null)
        {
            _logger.LogWarning("No JSON file found in uploaded files, skipping {StepName} step", Name);
            return [];
        }

        var (flatDataElement, applicationDoc) = LoadFlatData(jsonFile.Data);
        using (applicationDoc)
        {
            using var sjekklisteSchema = JsonDocument.Parse(await File.ReadAllTextAsync(_sjekklisteSchemaPath, cancellationToken));

            var rules = await _rulesLoader.LoadAsync(_rulesFolderAbsolutePath, cancellationToken);
            if (rules.Count == 0)
            {
                _logger.LogWarning(
                    "No markdown rules found under {RulesFolder} — all punkter will default to 'ikke_vurdert'",
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

            var result = await _orchestrator.RunAsync(applicationDoc, rules, options, cancellationToken);

            _logger.LogInformation(
                "Orchestrator {StepName} done: {WallMs}ms, {LlmCalls} LLM calls, {ToolCalls} tool calls",
                Name, result.WallTimeMs, result.TotalLlmCalls, result.TotalToolCalls);

            using var aggregated = ChecklistAggregator.Aggregate(sjekklisteSchema, result.Verdicts);
            using var mapped = _mapper.Map(flatDataElement);
            using var merged = MergeSjekkliste(mapped, aggregated);

            if (!string.IsNullOrEmpty(_definition.PublishTo))
                _pipelineContext.Set(_definition.PublishTo, SerializeJson(merged));

            return await RenderFiles(merged, cancellationToken);
        }
    }

    /// <summary>
    /// Replaces the <c>sjekkliste</c> subtree in the mapper's output with the
    /// orchestrator's aggregated verdicts (which already include the right
    /// labels per punkt). The mapper's other sections — meta, soker, arrangement,
    /// bevilling, styrer, stedfortreder — pass through untouched so the Typst
    /// template receives the same envelope it always has.
    /// </summary>
    private static JsonDocument MergeSjekkliste(JsonDocument mapped, JsonDocument aggregated)
    {
        var node = JsonNode.Parse(mapped.RootElement.GetRawText())!.AsObject();
        var sjekkliste = JsonNode.Parse(aggregated.RootElement.GetProperty("sjekkliste").GetRawText())!;
        node["sjekkliste"] = sjekkliste;
        return JsonDocument.Parse(node.ToJsonString());
    }

    private async Task<IReadOnlyList<GeneratedPdf>> RenderFiles(JsonDocument data, CancellationToken cancellationToken)
    {
        var results = new List<GeneratedPdf>();
        var pdfBytes = await _pdfGenerator.GeneratePdfAsync(data, _templatePath, cancellationToken);
        results.Add(new GeneratedPdf(_definition.Output, pdfBytes));

        if (_docxTemplatePath != null && _docxGenerator != null)
        {
            try
            {
                var docxBytes = await _docxGenerator.GenerateDocxAsync(data, _docxTemplatePath, cancellationToken);
                results.Add(new GeneratedPdf(Path.ChangeExtension(_definition.Output, ".docx"), docxBytes));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Step {StepName}: DOCX rendering failed; PDF still returned", Name);
            }
        }
        return results;
    }

    /// <summary>
    /// Unwraps FlatData from the upload envelope (Altinn submissions are wrapped
    /// in { "FlatData": {...} }). Returns a fresh JsonDocument containing the
    /// flat-shape data; the orchestrator's tools navigate it with paths like
    /// "Bevillingsansvarlig.Styrer.Foedselsnummer" rather than "FlatData.Bevillingsansvarlig...".
    /// The accompanying JsonElement points to the document's root so the mapper
    /// can be invoked over the same data without re-parsing.
    /// </summary>
    private static (JsonElement FlatDataElement, JsonDocument ApplicationDoc) LoadFlatData(byte[] uploadedBytes)
    {
        using var wrapper = JsonDocument.Parse(uploadedBytes);
        var flat = wrapper.RootElement.TryGetProperty("FlatData", out var fd) ? fd : wrapper.RootElement;
        var bytes = System.Text.Encoding.UTF8.GetBytes(flat.GetRawText());
        var doc = JsonDocument.Parse(bytes);
        return (doc.RootElement, doc);
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
