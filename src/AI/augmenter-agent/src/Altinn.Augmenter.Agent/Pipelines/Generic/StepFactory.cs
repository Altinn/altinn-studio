using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Services.Agent;
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
        if (string.IsNullOrEmpty(definition.Mapper))
            throw new InvalidOperationException($"Step '{definition.Name}' is missing 'mapper'.");

        var mapper = serviceProvider.GetKeyedService<IDataMapper>(definition.Mapper)
            ?? throw new InvalidOperationException(
                $"Step '{definition.Name}' references unknown mapper '{definition.Mapper}'. " +
                $"Register it via AddKeyedSingleton<IDataMapper, ...>(key) in Program.cs.");

        var contentPaths = serviceProvider.GetRequiredService<IOptions<ContentPathsOptions>>();
        var pdfGenerator = serviceProvider.GetRequiredService<IPdfGeneratorService>();
        var docxGenerator = serviceProvider.GetService<IDocxGeneratorService>();
        var loggerFactory = serviceProvider.GetRequiredService<ILoggerFactory>();

        return definition.Type switch
        {
            "mapping-pdf" => new MappingPdfStep(
                definition, mapper, pdfGenerator, docxGenerator, contentPaths,
                loggerFactory.CreateLogger($"Step.{definition.Name}")),

            "agent-pdf" => BuildAgentPdfStep(definition, mapper, contentPaths, pdfGenerator, docxGenerator, loggerFactory),

            _ => throw new InvalidOperationException(
                $"Step '{definition.Name}' has unknown type '{definition.Type}'. " +
                $"Supported: mapping-pdf, agent-pdf."),
        };
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
}
