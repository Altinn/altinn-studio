using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Models;
using Altinn.Augmenter.Agent.Services.Agent;

namespace Altinn.Augmenter.Agent.Pipelines.Checklist;

/// <summary>
/// Pipeline step that uses an AI agent to evaluate checklist items based on the application data.
/// The agent's instructions are loaded from the Skill/ folder (skill.md + referenced files).
/// </summary>
public sealed class ChecklistAgentStep(
    IChecklistDataMapper dataMapper,
    IAgentService agentService,
    IPdfGeneratorService pdfGenerator,
    ILogger<ChecklistAgentStep> logger) : IPdfGenerationStep
{
    private const string SkillFolder = "Pipelines/Checklist/Skill";
    private const string TemplatePath = "Pipelines/Checklist/Templates/sjekkliste.typ";

    public string Name => "checklist-agent";

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

        using var mappedData = dataMapper.MapToChecklist(flatData);
        var checklistJson = SerializeJson(mappedData);

        var agentRequest = new AgentRequest
        {
            SkillFolder = SkillFolder,
            UserPrompt = BuildUserPrompt(jsonString, checklistJson),
        };

        logger.LogInformation("Sending checklist to agent for evaluation");

        string agentResponse;
        try
        {
            agentResponse = await agentService.RunAsync(agentRequest, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Agent evaluation failed, falling back to unevaluated checklist");
            return await GenerateFallbackPdf(mappedData, cancellationToken);
        }

        using var evaluatedData = ParseAgentResponse(agentResponse);
        if (evaluatedData == null)
        {
            logger.LogWarning("Agent returned invalid JSON, falling back to unevaluated checklist");
            return await GenerateFallbackPdf(mappedData, cancellationToken);
        }

        var pdfBytes = await pdfGenerator.GeneratePdfAsync(evaluatedData, TemplatePath, cancellationToken);
        return new GeneratedPdf("checklist.pdf", pdfBytes);
    }

    private static string BuildUserPrompt(string rawApplicationJson, string checklistJson)
    {
        return $"""
            Her er rådata fra søknaden:

            ```json
            {rawApplicationJson}
            ```

            Her er sjekklisten som skal evalueres. Oppdater "status" og "merknad" for hvert punkt basert på søknadsdataene over:

            ```json
            {checklistJson}
            ```
            """;
    }

    private JsonDocument? ParseAgentResponse(string response)
    {
        var json = response.Trim();

        if (json.StartsWith("```"))
        {
            var firstNewline = json.IndexOf('\n');
            if (firstNewline >= 0)
                json = json[(firstNewline + 1)..];
        }

        if (json.EndsWith("```"))
        {
            json = json[..^3].TrimEnd();
        }

        try
        {
            var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("sjekkliste", out _))
            {
                logger.LogWarning("Agent response JSON is missing 'sjekkliste' property");
                doc.Dispose();
                return null;
            }

            return doc;
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to parse agent response as JSON");
            return null;
        }
    }

    /// <summary>
    /// Generates a PDF from the unevaluated checklist (all items "ikke_vurdert").
    /// Uses a fresh CancellationToken because the original may already be cancelled
    /// if we're in a fallback path after an agent timeout.
    /// </summary>
    private async Task<GeneratedPdf> GenerateFallbackPdf(
        JsonDocument data,
        CancellationToken cancellationToken)
    {
        // If the original token is still valid, use it. Otherwise use a short standalone timeout.
        if (cancellationToken.IsCancellationRequested)
        {
            using var fallbackCts = new CancellationTokenSource(TimeSpan.FromSeconds(60));
            var pdfBytes = await pdfGenerator.GeneratePdfAsync(data, TemplatePath, fallbackCts.Token);
            return new GeneratedPdf("checklist.pdf", pdfBytes);
        }

        var bytes = await pdfGenerator.GeneratePdfAsync(data, TemplatePath, cancellationToken);
        return new GeneratedPdf("checklist.pdf", bytes);
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
