using System.Diagnostics;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Services.Agent;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Endpoints;

public static class AgentTestEndpoints
{
    public static void MapAgentTestEndpoints(this WebApplication app)
    {
        // GET /agent-test — simple ping that asserts the configured agent
        // provider is reachable and returns a string. Carries no domain
        // vocabulary so the public image stays neutral.
        app.MapGet("/agent-test", async (
            IAgentService agentService,
            IOptions<AgentOptions> options,
            ILogger<Program> logger,
            CancellationToken ct) =>
        {
            var opts = options.Value;
            logger.LogInformation("[AGENT-TEST] === ping === provider={Provider}, model={Model}",
                opts.Provider, opts.Model ?? "default");

            var skillDir = CreateTempSkill();
            var agentRequest = new AgentRequest
            {
                SkillFolder = skillDir,
                UserPrompt = "Reply with exactly the text: PONG",
            };

            var sw = Stopwatch.StartNew();
            try
            {
                var result = await agentService.RunAsync(agentRequest, ct);
                sw.Stop();
                var trimmed = result.Trim();
                logger.LogInformation("[AGENT-TEST] OK in {Elapsed}s ({Length} chars): {Response}",
                    sw.Elapsed.TotalSeconds.ToString("F1"), trimmed.Length, trimmed);
                return Results.Ok(new
                {
                    status = "ok",
                    elapsedSeconds = sw.Elapsed.TotalSeconds,
                    provider = opts.Provider,
                    model = opts.Model ?? "default",
                    response = trimmed,
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                logger.LogError(ex, "[AGENT-TEST] FAILED after {Elapsed}s", sw.Elapsed.TotalSeconds.ToString("F1"));
                return Results.Json(new
                {
                    status = "error",
                    elapsedSeconds = sw.Elapsed.TotalSeconds,
                    provider = opts.Provider,
                    model = opts.Model ?? "default",
                    error = ex.Message,
                }, statusCode: 500);
            }
            finally
            {
                try { Directory.Delete(skillDir, recursive: true); } catch { /* best-effort cleanup */ }
            }
        });
    }

    private static string CreateTempSkill()
    {
        var absDir = Path.Combine(Path.GetTempPath(), "augmenter-agent-test-skills", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(absDir);
        File.WriteAllText(
            Path.Combine(absDir, "skill.md"),
            "You are a test assistant. Reply briefly and exactly as requested.");
        return absDir;
    }
}
