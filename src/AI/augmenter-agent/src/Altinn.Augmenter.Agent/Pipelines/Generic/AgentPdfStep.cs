using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Models;
using Altinn.Augmenter.Agent.Services.Agent;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Generic step that maps data, runs an AI agent over it (with skill, prompt, and parser
/// configured per step in pipeline.yaml), renders the evaluated result via Typst (PDF),
/// optionally also via Pandoc (DOCX), and optionally publishes the evaluated JSON to
/// <see cref="PipelineContext"/> for downstream steps.
/// On agent failure or invalid response, falls back to rendering the unevaluated mapped data.
/// </summary>
public sealed class AgentPdfStep : IPdfGenerationStep
{
    private readonly StepDefinition _definition;
    private readonly IDataMapper _mapper;
    private readonly IAgentService _agentService;
    private readonly IPromptBuilder _promptBuilder;
    private readonly IResponseParser _responseParser;
    private readonly IPdfGeneratorService _pdfGenerator;
    private readonly IDocxGeneratorService? _docxGenerator;
    private readonly PipelineContext _pipelineContext;
    private readonly string _skillFolder;
    private readonly string _templatePath;
    private readonly string? _docxTemplatePath;
    private readonly ILogger _logger;

    public string Name => _definition.Name;

    public AgentPdfStep(
        StepDefinition definition,
        IDataMapper mapper,
        IAgentService agentService,
        IPromptBuilder promptBuilder,
        IResponseParser responseParser,
        IPdfGeneratorService pdfGenerator,
        IDocxGeneratorService? docxGenerator,
        PipelineContext pipelineContext,
        IOptions<ContentPathsOptions> contentPaths,
        ILogger logger)
    {
        if (string.IsNullOrEmpty(definition.SkillFolder))
            throw new InvalidOperationException($"Step '{definition.Name}' (agent-pdf) requires 'skillFolder'.");
        if (string.IsNullOrEmpty(definition.Template))
            throw new InvalidOperationException($"Step '{definition.Name}' (agent-pdf) requires 'template'.");
        if (string.IsNullOrEmpty(definition.Output))
            throw new InvalidOperationException($"Step '{definition.Name}' (agent-pdf) requires 'output'.");

        _definition = definition;
        _mapper = mapper;
        _agentService = agentService;
        _promptBuilder = promptBuilder;
        _responseParser = responseParser;
        _pdfGenerator = pdfGenerator;
        _docxGenerator = docxGenerator;
        _pipelineContext = pipelineContext;
        _skillFolder = Path.Combine(contentPaths.Value.SkillsRoot, definition.SkillFolder);
        _templatePath = Path.Combine(contentPaths.Value.TemplatesRoot, definition.Template);
        _docxTemplatePath = string.IsNullOrEmpty(definition.DocxTemplate)
            ? null
            : Path.Combine(contentPaths.Value.TemplatesRoot, definition.DocxTemplate);
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

        var jsonString = Encoding.UTF8.GetString(jsonFile.Data);
        using var doc = JsonDocument.Parse(jsonString);

        var flatData = doc.RootElement.TryGetProperty("FlatData", out var fd)
            ? fd
            : doc.RootElement;

        using var mappedData = _mapper.Map(flatData);

        var userPrompt = await _promptBuilder.BuildAsync(jsonString, mappedData, _definition, _pipelineContext, cancellationToken);

        var agentRequest = new AgentRequest
        {
            SkillFolder = _skillFolder,
            UserPrompt = userPrompt,
        };

        _logger.LogInformation(
            "Sending {StepName} to agent (userPrompt={PromptLen} chars)",
            Name, userPrompt.Length);

        string agentResponse;
        try
        {
            agentResponse = await _agentService.RunAsync(agentRequest, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Agent step {StepName} failed, falling back to unevaluated data", Name);
            return await GenerateFallbackFiles(mappedData, cancellationToken);
        }

        using var evaluatedData = _responseParser.Parse(agentResponse, _definition);
        if (evaluatedData == null)
        {
            _logger.LogWarning("Agent step {StepName} returned unparseable JSON, falling back to unevaluated data", Name);
            if (!string.IsNullOrEmpty(_definition.PublishTo))
                _pipelineContext.Set(_definition.PublishTo, SerializeJson(mappedData));
            return await GenerateFallbackFiles(mappedData, cancellationToken);
        }

        if (!string.IsNullOrEmpty(_definition.PublishTo))
            _pipelineContext.Set(_definition.PublishTo, SerializeJson(evaluatedData));

        return await RenderFiles(evaluatedData, cancellationToken);
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
                var docxName = Path.ChangeExtension(_definition.Output, ".docx");
                results.Add(new GeneratedPdf(docxName, docxBytes));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Step {StepName}: DOCX rendering failed; PDF still returned", Name);
            }
        }

        return results;
    }

    private async Task<IReadOnlyList<GeneratedPdf>> GenerateFallbackFiles(
        JsonDocument data,
        CancellationToken cancellationToken)
    {
        if (cancellationToken.IsCancellationRequested)
        {
            using var fallbackCts = new CancellationTokenSource(TimeSpan.FromSeconds(60));
            return await RenderFiles(data, fallbackCts.Token);
        }
        return await RenderFiles(data, cancellationToken);
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
