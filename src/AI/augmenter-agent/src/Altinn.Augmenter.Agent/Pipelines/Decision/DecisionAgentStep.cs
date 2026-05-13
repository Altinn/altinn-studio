using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Models;
using Altinn.Augmenter.Agent.Pipelines.Checklist;
using Altinn.Augmenter.Agent.Services.Agent;

namespace Altinn.Augmenter.Agent.Pipelines.Decision;

/// <summary>
/// Pipeline step that uses an AI agent to produce a complete vedtak (decision) document.
/// Reads the evaluated checklist from <see cref="PipelineContext"/> (produced by
/// <see cref="ChecklistAgentStep"/>) and combines it with the mapped base data
/// to let the agent fill in vurdering, vilkaar, gebyr, and utfall.
/// </summary>
public sealed class DecisionAgentStep(
    IDecisionDataMapper dataMapper,
    IAgentService agentService,
    IPdfGeneratorService pdfGenerator,
    PipelineContext pipelineContext,
    ILogger<DecisionAgentStep> logger) : IPdfGenerationStep
{
    private const string SkillFolder = "Pipelines/Decision/Skill";
    private const string TemplatePath = "Pipelines/Decision/Templates/vedtak.typ";
    private const string SchemaPath = "Pipelines/Decision/Templates/vedtak-schema.json";

    public string Name => "decision-agent";

    public async Task<GeneratedPdf?> ExecuteAsync(
        IReadOnlyList<UploadedFile> files,
        CancellationToken cancellationToken = default)
    {
        var jsonFile = files.FirstOrDefault(f => f.ContentType == "application/json");
        if (jsonFile == null)
        {
            logger.LogWarning("No JSON file found in uploaded files, skipping {StepName} step", Name);
            return null;
        }

        var jsonString = Encoding.UTF8.GetString(jsonFile.Data);
        using var doc = JsonDocument.Parse(jsonString);

        var flatData = doc.RootElement.TryGetProperty("FlatData", out var fd)
            ? fd
            : doc.RootElement;

        // Map base decision data (soker, sted, arrangement, styrer, etc.)
        using var mappedData = dataMapper.MapToDecision(flatData);
        var decisionJson = SerializeJson(mappedData);

        // Get evaluated checklist from upstream step (if available)
        var checklistJson = pipelineContext.Get<string>(ChecklistAgentStep.ChecklistJsonKey);
        if (checklistJson == null)
        {
            logger.LogWarning("No evaluated checklist available in pipeline context, decision agent will work without it");
        }

        // Load the vedtak schema so the agent knows the full structure
        var schemaJson = await LoadSchemaAsync(cancellationToken);

        var agentRequest = new AgentRequest
        {
            SkillFolder = SkillFolder,
            UserPrompt = BuildUserPrompt(decisionJson, checklistJson, schemaJson),
        };

        logger.LogInformation(
            "Sending decision data to agent (decisionJson={DecisionLen} chars, checklistJson={ChecklistLen} chars, schema={SchemaLen} chars, userPrompt={PromptLen} chars)",
            decisionJson.Length,
            checklistJson?.Length ?? 0,
            schemaJson?.Length ?? 0,
            agentRequest.UserPrompt.Length);

        logger.LogDebug("Decision agent user prompt:\n{UserPrompt}", agentRequest.UserPrompt);

        string agentResponse;
        try
        {
            agentResponse = await agentService.RunAsync(agentRequest, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Agent evaluation failed, falling back to base decision data");
            return await GenerateFallbackPdf(mappedData, cancellationToken);
        }

        logger.LogInformation(
            "Decision agent returned {Length} chars",
            agentResponse.Length);
        logger.LogDebug("Decision agent raw response:\n{Response}", agentResponse);

        using var evaluatedData = ParseAgentResponse(agentResponse);
        if (evaluatedData == null)
        {
            logger.LogWarning(
                "Agent returned invalid JSON, falling back to base decision data. Raw response (first 2000 chars):\n{Response}",
                agentResponse.Length > 2000 ? agentResponse[..2000] : agentResponse);
            return await GenerateFallbackPdf(mappedData, cancellationToken);
        }

        var evaluatedJson = SerializeJson(evaluatedData);
        logger.LogInformation(
            "Decision agent produced valid JSON ({Length} chars) with keys: {Keys}",
            evaluatedJson.Length,
            string.Join(", ", evaluatedData.RootElement.EnumerateObject().Select(p => p.Name)));
        logger.LogDebug("Decision agent evaluated JSON:\n{Json}", evaluatedJson);

        var pdfBytes = await pdfGenerator.GeneratePdfAsync(evaluatedData, TemplatePath, cancellationToken);
        return new GeneratedPdf("vedtak.pdf", pdfBytes);
    }

    private static string BuildUserPrompt(string decisionJson, string? checklistJson, string? schemaJson)
    {
        var sb = new StringBuilder();

        sb.AppendLine("Her er vedtakets grunndata (oppdater og utvid dette dokumentet):");
        sb.AppendLine();
        sb.AppendLine("```json");
        sb.AppendLine(decisionJson);
        sb.AppendLine("```");

        if (checklistJson != null)
        {
            sb.AppendLine();
            sb.AppendLine("Her er den evaluerte sjekklisten med status og merknader for hvert kontrollpunkt:");
            sb.AppendLine();
            sb.AppendLine("```json");
            sb.AppendLine(checklistJson);
            sb.AppendLine("```");
        }

        if (schemaJson != null)
        {
            sb.AppendLine();
            sb.AppendLine("Her er JSON-schemaet for vedtaket (alle tilgjengelige felter og enum-verdier):");
            sb.AppendLine();
            sb.AppendLine("```json");
            sb.AppendLine(schemaJson);
            sb.AppendLine("```");
        }

        return sb.ToString();
    }

    private static async Task<string?> LoadSchemaAsync(CancellationToken cancellationToken)
    {
        var fullPath = Path.Combine(AppContext.BaseDirectory, SchemaPath);
        if (!File.Exists(fullPath))
            return null;

        return await File.ReadAllTextAsync(fullPath, cancellationToken);
    }

    private JsonDocument? ParseAgentResponse(string response)
    {
        var json = response.Trim();

        if (json.StartsWith("```"))
        {
            logger.LogDebug("Stripping leading markdown fence from agent response");
            var firstNewline = json.IndexOf('\n');
            if (firstNewline >= 0)
                json = json[(firstNewline + 1)..];
        }

        if (json.EndsWith("```"))
        {
            logger.LogDebug("Stripping trailing markdown fence from agent response");
            json = json[..^3].TrimEnd();
        }

        try
        {
            var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("vedtak", out _))
            {
                var actualKeys = string.Join(", ", doc.RootElement.EnumerateObject().Select(p => p.Name));
                logger.LogWarning(
                    "Agent response JSON is missing 'vedtak' property. Actual top-level keys: [{Keys}]",
                    actualKeys);
                doc.Dispose();
                return null;
            }

            return doc;
        }
        catch (JsonException ex)
        {
            var preview = json.Length > 500 ? json[..500] : json;
            logger.LogWarning(ex, "Failed to parse agent response as JSON. First 500 chars:\n{Preview}", preview);
            return null;
        }
    }

    private async Task<GeneratedPdf> GenerateFallbackPdf(
        JsonDocument data,
        CancellationToken cancellationToken)
    {
        if (cancellationToken.IsCancellationRequested)
        {
            using var fallbackCts = new CancellationTokenSource(TimeSpan.FromSeconds(60));
            var pdfBytes = await pdfGenerator.GeneratePdfAsync(data, TemplatePath, fallbackCts.Token);
            return new GeneratedPdf("vedtak.pdf", pdfBytes);
        }

        var bytes = await pdfGenerator.GeneratePdfAsync(data, TemplatePath, cancellationToken);
        return new GeneratedPdf("vedtak.pdf", bytes);
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
