using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Services.Agent;
using Altinn.Augmenter.Agent.Services.Agent.Orchestration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Builds <see cref="IPdfGenerationStep"/> instances from <see cref="StepDefinition"/> entries
/// read from pipeline.yaml. Resolves keyed services (mappers, prompt builders, parsers) and
/// passes the matching step definition into the constructor.
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

            "agent-pdf" => BuildAgentPdfStep(definition, RequireMapper(definition), contentPaths, pdfGenerator, docxGenerator, loggerFactory),

            "agent-pdf-orchestrated" => BuildAgentPdfOrchestratedStep(definition, contentPaths, pdfGenerator, docxGenerator, loggerFactory),

            _ => throw new InvalidOperationException(
                $"Step '{definition.Name}' has unknown type '{definition.Type}'. " +
                $"Supported: mapping-pdf, agent-pdf, agent-pdf-orchestrated."),
        };
    }

    private IDataMapper RequireMapper(StepDefinition definition)
    {
        if (string.IsNullOrEmpty(definition.Mapper))
            throw new InvalidOperationException($"Step '{definition.Name}' is missing 'mapper'.");
        return serviceProvider.GetKeyedService<IDataMapper>(definition.Mapper)
            ?? throw new InvalidOperationException(
                $"Step '{definition.Name}' references unknown mapper '{definition.Mapper}'. " +
                $"Register it via AddKeyedSingleton<IDataMapper, ...>(key) in Program.cs.");
    }

    private AgentPdfStep BuildAgentPdfStep(
        StepDefinition definition,
        IDataMapper mapper,
        IOptions<ContentPathsOptions> contentPaths,
        IPdfGeneratorService pdfGenerator,
        IDocxGeneratorService? docxGenerator,
        ILoggerFactory loggerFactory)
    {
        var agentService = serviceProvider.GetRequiredService<IAgentService>();
        var pipelineContext = serviceProvider.GetRequiredService<PipelineContext>();

        var promptBuilder = serviceProvider.GetKeyedService<IPromptBuilder>(definition.PromptBuilder)
            ?? throw new InvalidOperationException(
                $"Step '{definition.Name}' references unknown promptBuilder '{definition.PromptBuilder}'.");

        var responseParser = serviceProvider.GetKeyedService<IResponseParser>(definition.ResponseParser)
            ?? throw new InvalidOperationException(
                $"Step '{definition.Name}' references unknown responseParser '{definition.ResponseParser}'.");

        return new AgentPdfStep(
            definition, mapper, agentService, promptBuilder, responseParser,
            pdfGenerator, docxGenerator, pipelineContext, contentPaths,
            loggerFactory.CreateLogger($"Step.{definition.Name}"));
    }

    private AgentPdfOrchestratedStep BuildAgentPdfOrchestratedStep(
        StepDefinition definition,
        IOptions<ContentPathsOptions> contentPaths,
        IPdfGeneratorService pdfGenerator,
        IDocxGeneratorService? docxGenerator,
        ILoggerFactory loggerFactory)
    {
        var orchestrator = serviceProvider.GetRequiredService<IChecklistOrchestrator>();
        var rulesLoader = serviceProvider.GetRequiredService<IRulesLoader>();
        var pipelineContext = serviceProvider.GetRequiredService<PipelineContext>();

        return new AgentPdfOrchestratedStep(
            definition, orchestrator, rulesLoader, pdfGenerator, docxGenerator,
            pipelineContext, contentPaths,
            loggerFactory.CreateLogger($"Step.{definition.Name}"));
    }
}
