using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Altinn.Augmenter.Agent.Services.Agent.Chat;
using Altinn.Augmenter.Agent.Services.Agent.Tools;

namespace Altinn.Augmenter.Agent.Services.Agent.Orchestration;

/// <summary>
/// C# port of <c>orchestrate_tools.py</c>. Each punkt is one independent loop:
///   1. Send system + user (rule + application JSON) with tools array
///   2. If the model returns tool_calls, dispatch and feed results back; loop up to MaxToolIterations
///   3. Otherwise parse the final JSON {status, merknad}
/// Verdicts and (optional) per-punkt traces are produced for downstream rendering.
/// </summary>
public sealed partial class ChecklistOrchestrator(
    IChatService chatService,
    IToolRegistry toolRegistry,
    ISystemPromptProvider systemPromptProvider,
    ILogger<ChecklistOrchestrator> logger) : IChecklistOrchestrator
{

    private static readonly JsonSerializerOptions TraceJsonOptions = new() { WriteIndented = true };

    [GeneratedRegex(@"\{.*\}", RegexOptions.Singleline)]
    private static partial Regex JsonObjectRegex();

    public async Task<OrchestratorResult> RunAsync(
        JsonDocument application,
        IReadOnlyList<RuleEntry> rules,
        OrchestratorOptions options,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrEmpty(options.TraceDirAbsolutePath))
            Directory.CreateDirectory(options.TraceDirAbsolutePath);

        var wallSw = Stopwatch.StartNew();
        var sem = new SemaphoreSlim(Math.Max(1, options.Concurrency));

        var serialisedApplication = SerializeApplicationOnce(application);

        var tasks = rules.Select(async rule =>
        {
            await sem.WaitAsync(cancellationToken);
            try
            {
                return await RunSinglePunktAsync(rule, application, serialisedApplication, options, cancellationToken);
            }
            finally
            {
                sem.Release();
            }
        }).ToList();

        var traces = await Task.WhenAll(tasks);
        wallSw.Stop();

        var verdicts = traces.ToDictionary(t => t.PunktKey, t => t.Verdict, StringComparer.Ordinal);

        return new OrchestratorResult
        {
            Verdicts = verdicts,
            TotalLlmCalls = traces.Sum(t => t.LlmCallCount),
            TotalToolCalls = traces.Sum(t => t.ToolCallCount),
            WallTimeMs = wallSw.ElapsedMilliseconds,
        };
    }

    private async Task<PunktTrace> RunSinglePunktAsync(
        RuleEntry rule,
        JsonDocument application,
        string serialisedApplication,
        OrchestratorOptions options,
        CancellationToken ct)
    {
        var punktSw = Stopwatch.StartNew();
        var userPrompt =
            $"# Sjekklistepunkt: {rule.PunktKey}\n\n" +
            $"## Regelen\n\n{rule.Markdown}\n\n" +
            $"## Søknad (JSON)\n\n```json\n{serialisedApplication}\n```\n";

        var messages = new List<ChatMessage>
        {
            ChatMessage.System(systemPromptProvider.GetSystemPrompt()),
            ChatMessage.User(userPrompt),
        };

        var llmCallCount = 0;
        var toolCallCount = 0;
        string? finishReason = null;
        PunktVerdict? verdict = null;

        for (var iteration = 0; iteration < options.MaxToolIterations; iteration++)
        {
            var chatReq = new ChatRequest
            {
                Messages = messages,
                Tools = toolRegistry.Definitions,
                ToolChoice = "auto",
                MaxTokens = 2048,
                Temperature = 0.0,
            };

            var resp = await chatService.RunAsync(chatReq, ct);
            llmCallCount++;
            finishReason = resp.FinishReason;

            if (resp.Error is not null)
            {
                verdict = new PunktVerdict
                {
                    Status = "ikke_vurdert",
                    Merknad = $"HTTP/transport-feil: {resp.Error}",
                };
                logger.LogWarning("punkt {Punkt}: error from chat service: {Error}", rule.PunktKey, resp.Error);
                break;
            }

            if (resp.ToolCalls.Count == 0)
            {
                verdict = ParseFinalVerdict(resp.Content);
                messages.Add(new ChatMessage { Role = "assistant", Content = resp.Content });
                break;
            }

            // Model wants to call tools. Echo the assistant's tool_calls message, then dispatch each.
            messages.Add(ChatMessage.Assistant(
                resp.Content.Length > 0 ? resp.Content : null,
                resp.ToolCalls.Select(tc => new AssistantToolCall
                {
                    Id = tc.Id,
                    Function = new AssistantToolCallFunction
                    {
                        Name = tc.Name,
                        Arguments = tc.ArgumentsRaw,
                    },
                }).ToList()));

            foreach (var tc in resp.ToolCalls)
            {
                JsonElement parsedArgs;
                try
                {
                    parsedArgs = string.IsNullOrWhiteSpace(tc.ArgumentsRaw)
                        ? JsonDocument.Parse("{}").RootElement
                        : JsonDocument.Parse(tc.ArgumentsRaw).RootElement;
                }
                catch (JsonException)
                {
                    parsedArgs = JsonDocument.Parse("{}").RootElement;
                }

                var resultJson = toolRegistry.Dispatch(tc.Name, parsedArgs, application);
                toolCallCount++;
                messages.Add(ChatMessage.Tool(tc.Id, resultJson));
            }
        }

        // Loop exhausted without a final verdict
        verdict ??= new PunktVerdict
        {
            Status = "ikke_vurdert",
            Merknad = $"Maks antall tool-iterasjoner ({options.MaxToolIterations}) nådd uten endelig svar.",
        };

        punktSw.Stop();
        var trace = new PunktTrace
        {
            PunktKey = rule.PunktKey,
            Verdict = verdict,
            LlmCallCount = llmCallCount,
            ToolCallCount = toolCallCount,
            FinishReason = finishReason,
            TotalElapsedMs = (int)punktSw.ElapsedMilliseconds,
            Messages = messages,
        };

        if (!string.IsNullOrEmpty(options.TraceDirAbsolutePath))
            await WriteTraceAsync(options.TraceDirAbsolutePath, trace, ct);

        return trace;
    }

    internal static PunktVerdict ParseFinalVerdict(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return new PunktVerdict { Status = "ikke_vurdert", Merknad = "Tom respons fra modellen." };

        var cleaned = text.Trim();
        if (cleaned.StartsWith("```", StringComparison.Ordinal))
        {
            var nl = cleaned.IndexOf('\n');
            if (nl > 0)
                cleaned = cleaned[(nl + 1)..];
            if (cleaned.EndsWith("```", StringComparison.Ordinal))
                cleaned = cleaned[..^3];
        }

        var match = JsonObjectRegex().Match(cleaned);
        if (!match.Success)
        {
            return new PunktVerdict
            {
                Status = "ikke_vurdert",
                Merknad = $"Kunne ikke parse JSON. Råtekst: {Truncate(text, 200)}",
            };
        }

        // Some models occasionally append junk after the closing brace. Find the
        // longest valid JSON prefix of the matched substring.
        var snippet = match.Value;
        for (var end = snippet.Length; end > 0; end--)
        {
            try
            {
                using var doc = JsonDocument.Parse(snippet[..end]);
                var root = doc.RootElement;
                var status = root.TryGetProperty("status", out var s) && s.ValueKind == JsonValueKind.String
                    ? s.GetString() ?? "ikke_vurdert"
                    : "ikke_vurdert";
                var merknad = root.TryGetProperty("merknad", out var m) && m.ValueKind == JsonValueKind.String
                    ? m.GetString() ?? ""
                    : "";
                return new PunktVerdict { Status = status, Merknad = merknad };
            }
            catch (JsonException)
            {
                continue;
            }
        }
        return new PunktVerdict
        {
            Status = "ikke_vurdert",
            Merknad = $"Ugyldig JSON. Råtekst: {Truncate(text, 200)}",
        };
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];

    private static string SerializeApplicationOnce(JsonDocument application)
    {
        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = true }))
        {
            application.WriteTo(writer);
        }
        return System.Text.Encoding.UTF8.GetString(stream.ToArray());
    }

    private static async Task WriteTraceAsync(string traceDir, PunktTrace trace, CancellationToken ct)
    {
        var path = Path.Combine(traceDir, $"{trace.PunktKey}.json");
        var serialisable = new
        {
            punkt = trace.PunktKey,
            final = new { status = trace.Verdict.Status, merknad = trace.Verdict.Merknad },
            totalElapsedMs = trace.TotalElapsedMs,
            llmCallCount = trace.LlmCallCount,
            toolCallCount = trace.ToolCallCount,
            finishReason = trace.FinishReason,
            messages = trace.Messages,
        };
        var json = JsonSerializer.Serialize(serialisable, TraceJsonOptions);
        await File.WriteAllTextAsync(path, json, ct);
    }
}

internal sealed record PunktTrace
{
    public required string PunktKey { get; init; }
    public required PunktVerdict Verdict { get; init; }
    public int LlmCallCount { get; init; }
    public int ToolCallCount { get; init; }
    public string? FinishReason { get; init; }
    public int TotalElapsedMs { get; init; }
    public required IReadOnlyList<ChatMessage> Messages { get; init; }
}
