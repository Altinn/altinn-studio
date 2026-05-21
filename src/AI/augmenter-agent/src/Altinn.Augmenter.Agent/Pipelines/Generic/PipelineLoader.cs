using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Reads pipeline.yaml from the mounted config root and produces a list of
/// step definitions in declaration order.
/// </summary>
public sealed class PipelineLoader(IOptions<ContentPathsOptions> contentPaths, ILogger<PipelineLoader> logger)
{
    private const string PipelineFileName = "pipeline.yaml";

    public PipelineDefinition Load()
    {
        var path = ResolvePipelinePath();

        var yaml = File.ReadAllText(path);
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        var definition = deserializer.Deserialize<PipelineDefinition>(yaml)
            ?? throw new InvalidOperationException($"{PipelineFileName} parsed to null.");

        logger.LogInformation(
            "Loaded pipeline from {Path}: {Count} steps ({Names})",
            path, definition.Steps.Count, string.Join(", ", definition.Steps.Select(s => s.Name)));

        return definition;
    }

    private string ResolvePipelinePath()
    {
        // pipeline.yaml sits at the config root (one level above templates/registries).
        var templatesRoot = contentPaths.Value.TemplatesRoot;
        var configRoot = Path.GetDirectoryName(templatesRoot)
            ?? throw new InvalidOperationException($"Cannot derive config root from TemplatesRoot='{templatesRoot}'.");

        var candidate = Path.Combine(configRoot, PipelineFileName);
        if (File.Exists(candidate))
            return candidate;

        throw new FileNotFoundException(
            $"Pipeline definition not found at {candidate}. " +
            $"Mount the config folder (containing {PipelineFileName}) into the container.");
    }
}
