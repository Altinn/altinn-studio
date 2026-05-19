using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Pipelines;
using Altinn.Augmenter.Agent.Pipelines.Generic;
using Altinn.Augmenter.Agent.Services;
using Altinn.Augmenter.Agent.Services.Agent;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Endpoints;

/// <summary>
/// Endpoints that expose the inner workings of the pipeline for experimentation.
/// <c>/experiment/dump-prompt</c> returns the exact system + user prompts the pipeline would
/// build for a given input, without invoking the agent. <c>/experiment/agent-call</c> runs
/// one raw agent invocation and returns the unfiltered stdout/stderr, bypassing PDF
/// generation and response parsing entirely.
/// </summary>
public static class ExperimentEndpoints
{
    public static void MapExperimentEndpoints(this WebApplication app)
    {
        // POST /experiment/dump-prompt?step=<step-name>
        // multipart/form-data: file=<application json>
        app.MapPost("/experiment/dump-prompt", async (
            HttpContext context,
            IMultipartParserService multipartParser,
            PipelineLoader pipelineLoader,
            IServiceProvider serviceProvider,
            IOptions<ContentPathsOptions> contentPaths,
            PipelineContext pipelineContextScope,
            CancellationToken ct) =>
        {
            var stepName = context.Request.Query["step"].ToString();
            if (string.IsNullOrEmpty(stepName))
                return Results.BadRequest(new { error = "Query param 'step' is required." });

            var pipeline = pipelineLoader.Load();
            var stepDef = pipeline.Steps.FirstOrDefault(s => s.Name == stepName);
            if (stepDef == null)
                return Results.BadRequest(new { error = $"Step '{stepName}' not found in pipeline.yaml." });
            if (stepDef.Type != "agent-pdf")
                return Results.BadRequest(new { error = $"Step '{stepName}' is type '{stepDef.Type}'; dump-prompt only supports 'agent-pdf'." });

            var parsed = await multipartParser.ParseAsync(context.Request, ct);
            if (parsed.Files.Count == 0)
                return Results.BadRequest(new { error = "No file uploaded." });

            var rawJson = Encoding.UTF8.GetString(parsed.Files[0].Data);
            var flatData = ExtractFlatData(rawJson);

            var mapper = serviceProvider.GetKeyedService<IDataMapper>(stepDef.Mapper)
                ?? throw new InvalidOperationException($"Mapper '{stepDef.Mapper}' not registered.");
            var promptBuilder = serviceProvider.GetKeyedService<IPromptBuilder>(stepDef.PromptBuilder)
                ?? throw new InvalidOperationException($"PromptBuilder '{stepDef.PromptBuilder}' not registered.");

            using var mappedDoc = mapper.Map(flatData.RootElement);

            var skillFolder = Path.Combine(contentPaths.Value.SkillsRoot, stepDef.SkillFolder ?? "");
            var systemPrompt = await SkillLoader.LoadAsync(skillFolder, ct);

            var userPrompt = await promptBuilder.BuildAsync(rawJson, mappedDoc, stepDef, pipelineContextScope, ct);

            return Results.Ok(new
            {
                step = stepName,
                model = serviceProvider.GetRequiredService<IOptions<AgentOptions>>().Value.Model,
                skillFolder,
                systemPrompt,
                userPrompt,
                mappedJson = SerializeJson(mappedDoc),
                promptLengths = new
                {
                    system = systemPrompt.Length,
                    user = userPrompt.Length,
                },
            });
        }).DisableAntiforgery();

        // POST /experiment/agent-call
        // JSON body: { skillFolder? OR systemPrompt?, userPrompt }
        app.MapPost("/experiment/agent-call", async (
            AgentCallRequest body,
            IAgentService agentService,
            IOptions<AgentOptions> options,
            IOptions<ContentPathsOptions> contentPaths,
            ILogger<Program> logger,
            CancellationToken ct) =>
        {
            if (string.IsNullOrEmpty(body.UserPrompt))
                return Results.BadRequest(new { error = "userPrompt is required." });
            if (string.IsNullOrEmpty(body.SkillFolder) && string.IsNullOrEmpty(body.SystemPrompt))
                return Results.BadRequest(new { error = "Either skillFolder or systemPrompt is required." });

            var (skillFolder, tempDir) = await ResolveSkillFolderAsync(body, ct);

            try
            {
                var request = new AgentRequest
                {
                    SkillFolder = skillFolder,
                    UserPrompt = body.UserPrompt,
                };

                var sw = Stopwatch.StartNew();
                string? stdout = null;
                string? errorMessage = null;

                try
                {
                    stdout = await agentService.RunAsync(request, ct);
                }
                catch (Exception ex)
                {
                    errorMessage = ex.Message;
                    logger.LogWarning(ex, "[EXPERIMENT] agent-call failed");
                }

                sw.Stop();

                var systemPrompt = await File.ReadAllTextAsync(Path.Combine(skillFolder, "skill.md"), ct);

                return Results.Ok(new
                {
                    success = errorMessage == null,
                    stdout = stdout ?? "",
                    errorMessage,
                    elapsedMs = sw.ElapsedMilliseconds,
                    model = options.Value.Model,
                    promptLengths = new
                    {
                        system = systemPrompt.Length,
                        user = body.UserPrompt.Length,
                    },
                });
            }
            finally
            {
                if (tempDir != null)
                {
                    try { Directory.Delete(tempDir, recursive: true); } catch { }
                }
            }
        });
    }

    private static async Task<(string skillFolder, string? tempDir)> ResolveSkillFolderAsync(
        AgentCallRequest body, CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(body.SkillFolder))
            return (body.SkillFolder, null);

        var tempDir = Path.Combine(Path.GetTempPath(), "augmenter-exp-skill", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        await File.WriteAllTextAsync(Path.Combine(tempDir, "skill.md"), body.SystemPrompt!, ct);
        return (tempDir, tempDir);
    }

    private static JsonDocument ExtractFlatData(string rawJson)
    {
        using var doc = JsonDocument.Parse(rawJson);
        if (doc.RootElement.ValueKind == JsonValueKind.Object &&
            doc.RootElement.TryGetProperty("FlatData", out var flat))
        {
            return JsonDocument.Parse(flat.GetRawText());
        }
        return JsonDocument.Parse(rawJson);
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

public sealed record AgentCallRequest
{
    public string? SkillFolder { get; init; }
    public string? SystemPrompt { get; init; }
    public string? UserPrompt { get; init; }
}
