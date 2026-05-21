using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Services.Agent.Orchestration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Builds <see cref="IPdfGenerationStep"/> instances from <see cref="StepDefinition"/> entries
/// read from pipeline.yaml. Resolves keyed services (mappers) and passes the matching step
/// definition into the constructor.
/// </summary>
public sealed class StepFactory(IServiceProvider serviceProvider)
{
    public IPdfGenerationStep Create(StepDefinition definition)
    {
        var contentPaths = serviceProvider.GetRequiredService<IOptions<ContentPathsOptions>>();
        var pdfGenerator = serviceProvider.GetRequiredService<IPdfGeneratorService>();
        var docxGenerator = serviceProvider.GetService<IDocxGeneratorService>();
        var loggerFactory = serviceProvider.GetRequiredService<ILoggerFactory>();

        return definition.Type switch
        {
            "mapping-pdf" => new MappingPdfStep(
                definition, RequireMapper(definition), pdfGenerator, docxGenerator, contentPaths,
                loggerFactory.CreateLogger($"Step.{definition.Name}")),

            "agent-pdf-orchestrated" => BuildAgentPdfOrchestratedStep(definition, RequireMapper(definition), contentPaths, pdfGenerator, docxGenerator, loggerFactory),

            _ => throw new InvalidOperationException(
                $"Step '{definition.Name}' has unknown type '{definition.Type}'. " +
                $"Supported: mapping-pdf, agent-pdf-orchestrated."),
        };
    }

    private IDataMapper RequireMapper(StepDefinition definition)
    {
        if (string.IsNullOrEmpty(definition.Mapper))
            throw new InvalidOperationException($"Step '{definition.Name}' is missing 'mapper'.");
        return serviceProvider.GetKeyedService<IDataMapper>(definition.Mapper)
            ?? throw new InvalidOperationException(
                $"Step '{definition.Name}' references unknown mapper '{definition.Mapper}'. " +
                $"Drop a <name>.json spec into ContentPaths.MappingsRoot.");
    }

    private AgentPdfOrchestratedStep BuildAgentPdfOrchestratedStep(
        StepDefinition definition,
        IDataMapper mapper,
        IOptions<ContentPathsOptions> contentPaths,
        IPdfGeneratorService pdfGenerator,
        IDocxGeneratorService? docxGenerator,
        ILoggerFactory loggerFactory)
    {
        var orchestrator = serviceProvider.GetRequiredService<IEvaluationOrchestrator>();
        var rulesLoader = serviceProvider.GetRequiredService<IRulesLoader>();
        var pipelineContext = serviceProvider.GetRequiredService<PipelineContext>();

        return new AgentPdfOrchestratedStep(
            definition, mapper, orchestrator, rulesLoader, pdfGenerator, docxGenerator,
            pipelineContext, contentPaths,
            loggerFactory.CreateLogger($"Step.{definition.Name}"));
    }
}
