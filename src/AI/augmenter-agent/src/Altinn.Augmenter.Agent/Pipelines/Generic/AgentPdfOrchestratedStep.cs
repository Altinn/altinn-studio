using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Models;
using Altinn.Augmenter.Agent.Services.Agent.Orchestration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Per-punkt orchestrated agent step. Runs <see cref="IChecklistOrchestrator"/>
/// over the application's FlatData with markdown rules + deterministic tools,
/// aggregates the per-punkt verdicts into the {sjekkliste:{...}} shape, then
/// renders the existing checklist Typst template — identical output contract
/// to the monolithic <c>agent-pdf</c> step it replaces in production.
/// </summary>
public sealed class AgentPdfOrchestratedStep : IPdfGenerationStep
{
    private const int DefaultMaxToolIterations = 5;
    private const int DefaultConcurrency = 5;
    private const string DefaultSjekklisteSchema = "sjekkliste.json";

    private readonly StepDefinition _definition;
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

        using var application = LoadFlatDataAsDocument(jsonFile.Data);
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

        var result = await _orchestrator.RunAsync(application, rules, options, cancellationToken);

        _logger.LogInformation(
            "Orchestrator {StepName} done: {WallMs}ms, {LlmCalls} LLM calls, {ToolCalls} tool calls",
            Name, result.WallTimeMs, result.TotalLlmCalls, result.TotalToolCalls);

        using var aggregated = ChecklistAggregator.Aggregate(sjekklisteSchema, result.Verdicts);

        if (!string.IsNullOrEmpty(_definition.PublishTo))
            _pipelineContext.Set(_definition.PublishTo, SerializeJson(aggregated));

        return await RenderFiles(aggregated, cancellationToken);
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

    private static JsonDocument LoadFlatDataAsDocument(byte[] uploadedBytes)
    {
        // Detach FlatData from the upload wrapper so the orchestrator's tools see
        // the same flat shape Altinn submissions have (paths like
        // "Bevillingsansvarlig.Styrer.Foedselsnummer" — not "FlatData.Bevillingsansvarlig...").
        using var wrapper = JsonDocument.Parse(uploadedBytes);
        var flat = wrapper.RootElement.TryGetProperty("FlatData", out var fd) ? fd : wrapper.RootElement;

        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream))
            flat.WriteTo(writer);
        return JsonDocument.Parse(stream.ToArray());
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
