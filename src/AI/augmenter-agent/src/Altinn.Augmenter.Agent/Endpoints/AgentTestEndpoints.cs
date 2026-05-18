using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Pipelines.Generic;
using Altinn.Augmenter.Agent.Services.Agent;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Endpoints;

public static class AgentTestEndpoints
{
    // Realistic flat data input (same structure as a real form submission)
    private const string TestFlatDataJson = """
        {
          "BrukerType": "person",
          "SkalFornyeBevilling": false,
          "BevillingsType": "arrangement",
          "Kommunenummer": "4204",
          "Innsender": {
            "Fornavn": "Sophie", "Etternavn": "Salt", "FulltNavn": "Sophie Salt",
            "Foedselsnummer": "01039012345", "EPostadresse": "sophie@test.no",
            "Telefonnummer": "99887766",
            "Adresse": { "Gateadresse": "Leikanger", "Postnummer": "6863", "Poststed": "KRISTIANSAND S" }
          },
          "OrganisasjonsInformasjon": {
            "Organisasjonsnummer": null, "Navn": null
          },
          "Arrangement": {
            "VaregruppeAlkohol": "gruppeTre",
            "Navn": "Julebord Avdeling Nord",
            "ArrangementType": "julebord",
            "ArrangementPeriode": [{ "StartDato": "2026-12-12", "SluttDato": "2026-12-13", "StartTid": "19:00", "SluttTid": "02:00" }],
            "TypeDeltakere": "bestemtePersoner",
            "AntallDeltakere": "45",
            "Arrangementssted": {
              "Type": "innendoers", "StedsNavn": "Restaurant Sjøhuset",
              "StedsAdresse": { "Gateadresse": "Havnegata 15" },
              "Etasje": "2. etasje"
            }
          },
          "Bevillingsansvarlig": {
            "SkalHaFritakFraStedfortreder": false,
            "Styrer": { "Fornavn": "Sophie", "Etternavn": "Salt", "Foedselsnummer": "01039012345", "EPostadresse": "sophie@test.no", "Telefonnummer": "99887766" },
            "Stedfortreder": { "Fornavn": "Erik", "Etternavn": "Hansen", "Foedselsnummer": "15039012345", "EPostadresse": "erik@test.no", "Telefonnummer": "98765432" }
          },
          "PersonerMedInnflytelse": { "JuridiskePersoner": [], "FysiskePersoner": [] }
        }
        """;

    public static void MapAgentTestEndpoints(this WebApplication app)
    {
        // GET /agent-test/checklist — runs the checklist skill with realistic input
        app.MapGet("/agent-test/checklist", async (
            IAgentService agentService,
            [FromKeyedServices("checklist")] IDataMapper dataMapper,
            IOptions<AgentOptions> options,
            IOptions<ContentPathsOptions> contentPaths,
            ILogger<Program> logger,
            CancellationToken ct) =>
        {
            var opts = options.Value;
            LogTestStart(logger, "checklist", opts);

            using var flatData = JsonDocument.Parse(TestFlatDataJson);
            using var mappedData = dataMapper.Map(flatData.RootElement);
            var checklistJson = SerializeJson(mappedData);

            var agentRequest = new AgentRequest
            {
                SkillFolder = Path.Combine(contentPaths.Value.SkillsRoot, "checklist"),
                UserPrompt = $"""
                    Her er rådata fra søknaden:

                    ```json
                    {TestFlatDataJson}
                    ```

                    Her er sjekklisten som skal evalueres. Oppdater "status" og "merknad" for hvert punkt:

                    ```json
                    {checklistJson}
                    ```
                    """,
            };

            logger.LogInformation("[AGENT-TEST] Checklist prompt: {Length} chars", agentRequest.UserPrompt.Length);

            return await RunAgentTest(agentService, agentRequest, opts, logger, "sjekkliste", ct);
        });

        // GET /agent-test/decision — runs the decision skill with realistic input
        app.MapGet("/agent-test/decision", async (
            IAgentService agentService,
            [FromKeyedServices("decision")] IDataMapper decisionMapper,
            IOptions<AgentOptions> options,
            IOptions<ContentPathsOptions> contentPaths,
            ILogger<Program> logger,
            CancellationToken ct) =>
        {
            var opts = options.Value;
            LogTestStart(logger, "decision", opts);

            using var flatData = JsonDocument.Parse(TestFlatDataJson);

            // Build decision base data
            using var decisionData = decisionMapper.Map(flatData.RootElement);
            var decisionJson = SerializeJson(decisionData);

            // Pre-evaluated checklist example for testing
            var examplePath = Path.Combine(contentPaths.Value.TemplatesRoot, "checklist-example.json");
            var checklistJson = File.Exists(examplePath)
                ? await File.ReadAllTextAsync(examplePath, ct)
                : null;

            var schemaPath = Path.Combine(contentPaths.Value.SchemasRoot, "decision-schema.json");
            var schemaJson = File.Exists(schemaPath)
                ? await File.ReadAllTextAsync(schemaPath, ct)
                : null;

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

            var agentRequest = new AgentRequest
            {
                SkillFolder = Path.Combine(contentPaths.Value.SkillsRoot, "decision"),
                UserPrompt = sb.ToString(),
            };

            logger.LogInformation("[AGENT-TEST] Decision prompt: {Length} chars", agentRequest.UserPrompt.Length);

            return await RunAgentTest(agentService, agentRequest, opts, logger, "vedtak", ct);
        });

        // GET /agent-test — simple ping test
        app.MapGet("/agent-test", async (
            IAgentService agentService,
            IOptions<AgentOptions> options,
            ILogger<Program> logger,
            CancellationToken ct) =>
        {
            var opts = options.Value;
            LogTestStart(logger, "ping", opts);

            var skillDir = CreateTempSkill();
            var agentRequest = new AgentRequest
            {
                SkillFolder = skillDir,
                UserPrompt = "Svar med exakt teksten: PONG",
            };

            try
            {
                return await RunAgentTest(agentService, agentRequest, opts, logger, null, ct);
            }
            finally
            {
                try { Directory.Delete(skillDir, recursive: true); } catch { }
            }
        });
    }

    private static async Task<IResult> RunAgentTest(
        IAgentService agentService,
        AgentRequest request,
        AgentOptions opts,
        ILogger logger,
        string? expectedJsonKey,
        CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var result = await agentService.RunAsync(request, ct);
            sw.Stop();

            var trimmed = result.Trim();
            logger.LogInformation("[AGENT-TEST] OK in {Elapsed}s ({Length} chars)",
                sw.Elapsed.TotalSeconds.ToString("F1"), trimmed.Length);
            logger.LogInformation("[AGENT-TEST] Response:\n{Response}",
                trimmed.Length > 3000 ? trimmed[..3000] + "\n... (truncated)" : trimmed);

            // Try to validate as JSON if we expect structured output
            string? validationError = null;
            if (expectedJsonKey != null)
            {
                var json = StripMarkdownFences(trimmed);
                try
                {
                    using var doc = JsonDocument.Parse(json);
                    if (!doc.RootElement.TryGetProperty(expectedJsonKey, out _))
                        validationError = $"JSON is missing expected key '{expectedJsonKey}'";
                }
                catch (JsonException ex)
                {
                    validationError = $"Response is not valid JSON: {ex.Message}";
                }
            }

            if (validationError != null)
                logger.LogWarning("[AGENT-TEST] Validation: {Error}", validationError);

            return Results.Ok(new
            {
                status = validationError == null ? "ok" : "ok_with_warnings",
                elapsedSeconds = sw.Elapsed.TotalSeconds,
                provider = opts.UseLocalProvider ? "local" : "anthropic",
                model = opts.Model ?? "default",
                responseLength = trimmed.Length,
                validationError,
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
                provider = opts.UseLocalProvider ? "local" : "anthropic",
                model = opts.Model ?? "default",
                error = ex.Message,
            }, statusCode: 500);
        }
    }

    private static void LogTestStart(ILogger logger, string test, AgentOptions opts)
    {
        logger.LogInformation("[AGENT-TEST] === {Test} === provider={Provider}, model={Model}",
            test,
            opts.UseLocalProvider ? $"local ({opts.ApiBaseUrl})" : "anthropic",
            opts.Model ?? "default");
    }

    private static string StripMarkdownFences(string text)
    {
        var json = text;
        if (json.StartsWith("```"))
        {
            var nl = json.IndexOf('\n');
            if (nl >= 0) json = json[(nl + 1)..];
        }
        if (json.EndsWith("```"))
            json = json[..^3].TrimEnd();
        return json;
    }

    private static string CreateTempSkill()
    {
        var absDir = Path.Combine(Path.GetTempPath(), "augmenter-agent-test-skills", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(absDir);
        File.WriteAllText(
            Path.Combine(absDir, "skill.md"),
            "Du er en test-assistent. Svar kort og presist.");
        return absDir;
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
