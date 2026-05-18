using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Generic step that maps raw JSON input with an <see cref="IDataMapper"/> and renders a Typst template,
/// optionally also a DOCX template via Pandoc. No AI agent involvement.
/// </summary>
public sealed class MappingPdfStep : IPdfGenerationStep
{
    private readonly StepDefinition _definition;
    private readonly IDataMapper _mapper;
    private readonly IPdfGeneratorService _pdfGenerator;
    private readonly IDocxGeneratorService? _docxGenerator;
    private readonly string _templatePath;
    private readonly string? _docxTemplatePath;
    private readonly ILogger _logger;

    public string Name => _definition.Name;

    public MappingPdfStep(
        StepDefinition definition,
        IDataMapper mapper,
        IPdfGeneratorService pdfGenerator,
        IDocxGeneratorService? docxGenerator,
        IOptions<ContentPathsOptions> contentPaths,
        ILogger logger)
    {
        if (string.IsNullOrEmpty(definition.Template))
            throw new InvalidOperationException($"Step '{definition.Name}' (mapping-pdf) requires 'template'.");
        if (string.IsNullOrEmpty(definition.Output))
            throw new InvalidOperationException($"Step '{definition.Name}' (mapping-pdf) requires 'output'.");

        _definition = definition;
        _mapper = mapper;
        _pdfGenerator = pdfGenerator;
        _docxGenerator = docxGenerator;
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

        var results = new List<GeneratedPdf>();

        var pdfBytes = await _pdfGenerator.GeneratePdfAsync(mappedData, _templatePath, cancellationToken);
        results.Add(new GeneratedPdf(_definition.Output, pdfBytes));

        if (_docxTemplatePath != null && _docxGenerator != null)
        {
            var docxBytes = await _docxGenerator.GenerateDocxAsync(mappedData, _docxTemplatePath, cancellationToken);
            var docxName = Path.ChangeExtension(_definition.Output, ".docx");
            results.Add(new GeneratedPdf(docxName, docxBytes));
        }

        return results;
    }
}
