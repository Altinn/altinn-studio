using System.Text.Json;
using Altinn.App.Ai.Enrichment.Agents;
using Altinn.App.Ai.Enrichment.Mapping;
using Altinn.App.Ai.Enrichment.Models;
using Altinn.App.Ai.Enrichment.Rendering;

namespace Altinn.App.Ai.Enrichment.Pipeline;

/// <summary>
/// Step that maps raw application JSON with an <see cref="IDataMapper"/> and renders
/// a Typst template. Pure deterministic transformation — no AI agent involvement.
/// </summary>
public sealed class MappingPdfStep : IEnrichmentStep
{
    private readonly StepDefinition _definition;
    private readonly IDataMapper _mapper;
    private readonly ITypstRenderer _renderer;
    private readonly string _templatePath;
    private readonly ILogger _logger;

    public string Name => _definition.Name;

    public MappingPdfStep(
        StepDefinition definition,
        IDataMapper mapper,
        ITypstRenderer renderer,
        AgentFolder folder,
        ILogger logger)
    {
        if (string.IsNullOrEmpty(definition.Template))
            throw new InvalidOperationException($"Step '{definition.Name}' (mapping-pdf) requires 'template'.");
        if (string.IsNullOrEmpty(definition.Output))
            throw new InvalidOperationException($"Step '{definition.Name}' (mapping-pdf) requires 'output'.");

        _definition = definition;
        _mapper = mapper;
        _renderer = renderer;
        _templatePath = Path.Combine(folder.TemplatesDirectory, definition.Template);
        _logger = logger;
    }

    public async Task<IReadOnlyList<GeneratedFile>> ExecuteAsync(
        JsonDocument application,
        PipelineContext context,
        CancellationToken cancellationToken = default)
    {
        using var mappedData = _mapper.Map(application.RootElement);

        _logger.LogInformation("Step {StepName}: rendering {Template}", Name, _definition.Template);
        var pdfBytes = await _renderer.RenderPdfAsync(mappedData, _templatePath, cancellationToken);
        return [new GeneratedFile(_definition.Output!, "application/pdf", pdfBytes)];
    }
}
