using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Default prompt builder: includes the raw application JSON, the mapped data, any
/// PipelineContext entries listed under <c>consumeContext</c>, and optionally a JSON
/// schema. Each section is wrapped in a markdown code fence with a Norwegian header.
/// Suitable for most agent steps; replace via pipeline.yaml only if a domain needs
/// non-standard prompt structure.
/// </summary>
public sealed class DefaultPromptBuilder(IOptions<ContentPathsOptions> contentPaths) : IPromptBuilder
{
    public async Task<string> BuildAsync(
        string rawApplicationJson,
        JsonDocument mappedData,
        StepDefinition stepDefinition,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken)
    {
        var sb = new StringBuilder();

        if (stepDefinition.Type == "agent-pdf" && stepDefinition.Name.Contains("checklist", StringComparison.OrdinalIgnoreCase))
        {
            // Checklist-style: raw data first, then mapped checklist to fill in
            sb.AppendLine("Her er rådata fra søknaden:");
            sb.AppendLine();
            AppendJsonBlock(sb, rawApplicationJson);
            sb.AppendLine();
            sb.AppendLine("Her er sjekklisten som skal evalueres. Oppdater \"status\" og \"merknad\" for hvert punkt basert på søknadsdataene over:");
            sb.AppendLine();
            AppendJsonBlock(sb, SerializeJson(mappedData));
        }
        else
        {
            // Decision-style: mapped grunndata first, then context, then schema
            sb.AppendLine("Her er grunndata (oppdater og utvid dette dokumentet):");
            sb.AppendLine();
            AppendJsonBlock(sb, SerializeJson(mappedData));
        }

        foreach (var key in stepDefinition.ConsumeContext)
        {
            var contextValue = pipelineContext.Get<string>(key);
            if (contextValue == null) continue;

            sb.AppendLine();
            sb.AppendLine($"Her er supplerende data fra tidligere steg ({key}):");
            sb.AppendLine();
            AppendJsonBlock(sb, contextValue);
        }

        if (!string.IsNullOrEmpty(stepDefinition.Schema))
        {
            var schemaPath = Path.Combine(contentPaths.Value.SchemasRoot, stepDefinition.Schema);
            if (File.Exists(schemaPath))
            {
                var schemaJson = await File.ReadAllTextAsync(schemaPath, cancellationToken);
                sb.AppendLine();
                sb.AppendLine("Her er JSON-schemaet (alle tilgjengelige felter og enum-verdier):");
                sb.AppendLine();
                AppendJsonBlock(sb, schemaJson);
            }
        }

        return sb.ToString();
    }

    private static void AppendJsonBlock(StringBuilder sb, string json)
    {
        sb.AppendLine("```json");
        sb.AppendLine(json);
        sb.AppendLine("```");
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
