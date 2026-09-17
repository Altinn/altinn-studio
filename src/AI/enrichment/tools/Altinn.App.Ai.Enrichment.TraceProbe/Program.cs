using System.Diagnostics;
using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.DependencyInjection;
using Altinn.App.Ai.Enrichment.Telemetry;
using Altinn.App.Ai.Enrichment.TraceProbe;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

// Proves, or disproves, that this machine can get a trace into Langfuse — in about
// fifteen seconds, without an app, a localtest stack or a form submission.
//
// Everything between configuration and Langfuse is the real thing: the same DI
// registration an Altinn app calls, the same start-up preflight, the same tracer
// provider, exporter and span shapes. The only fiction is the content of the run.
//
// It then reads the trace back through Langfuse's own API, because an accepted
// export and a stored trace are not the same claim — ingestion is asynchronous, and
// the exporter is satisfied by an HTTP 200 it never re-checks.

const string ScoreNameSeparator = "----------------------------------------------------------";

var envFile = args.Length > 0 ? args[0] : ".env";
if (File.Exists(envFile))
{
    DotEnv.Load(envFile);
    Console.WriteLine($"Loaded {Path.GetFullPath(envFile)}");
}
else if (args.Length > 0)
{
    Console.Error.WriteLine($"No such file: {envFile}");
    return 2;
}

var langfuseHost = Environment.GetEnvironmentVariable("LANGFUSE_BASE_URL");
var publicKey = Environment.GetEnvironmentVariable("LANGFUSE_PUBLIC_KEY");
var secretKey = Environment.GetEnvironmentVariable("LANGFUSE_SECRET_KEY");
var langfuseEnvironment = Environment.GetEnvironmentVariable("LANGFUSE_ENVIRONMENT") ?? "local-probe";
var projectId = Environment.GetEnvironmentVariable("LANGFUSE_PROJECT_ID");

if (string.IsNullOrWhiteSpace(langfuseHost)
    || string.IsNullOrWhiteSpace(publicKey)
    || string.IsNullOrWhiteSpace(secretKey))
{
    Console.Error.WriteLine(
        """
        Usage: langfuse-trace-probe [path/to/.env]

        Emits one complete run to Langfuse and reads it back again.

        Required:
          LANGFUSE_BASE_URL     e.g. https://langfuse.digdir.cloud
          LANGFUSE_PUBLIC_KEY   pk-lf-...
          LANGFUSE_SECRET_KEY   sk-lf-...

        Optional:
          LANGFUSE_ENVIRONMENT  environment label on the trace (default: local-probe)
          LANGFUSE_PROJECT_ID   only used to print a clickable link
        """);
    return 2;
}

Console.WriteLine(ScoreNameSeparator);
Console.WriteLine($"Host        {langfuseHost}");
Console.WriteLine($"Public key  {Mask(publicKey)}");
Console.WriteLine($"Secret key  {Mask(secretKey)}");
Console.WriteLine($"Environment {langfuseEnvironment}");
Console.WriteLine(ScoreNameSeparator);

var configuration = new ConfigurationBuilder()
    .AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["AiEnrichment:Langfuse:Enabled"] = "true",
        ["AiEnrichment:Langfuse:Host"] = langfuseHost,
        ["AiEnrichment:Langfuse:PublicKey"] = publicKey,
        ["AiEnrichment:Langfuse:SecretKey"] = secretKey,
        ["AiEnrichment:Langfuse:Environment"] = langfuseEnvironment,
        ["AiEnrichment:Langfuse:ProjectId"] = projectId,

        // The whole point of the probe is to see what the exporter says.
        ["AiEnrichment:Langfuse:Diagnostics"] = "true",
    })
    .Build();

var services = new ServiceCollection();
services.AddLogging(builder => builder
    .AddSimpleConsole(o =>
    {
        o.SingleLine = true;
        o.TimestampFormat = "HH:mm:ss ";
    })
    .SetMinimumLevel(LogLevel.Debug));
services.AddAiEnrichmentCore(configuration);

await using var provider = services.BuildServiceProvider();

Console.WriteLine("[1/4] Starting tracing (validation, secret, credential preflight, provider)");
var hostedServices = provider.GetServices<IHostedService>().ToList();
foreach (var hostedService in hostedServices)
    await hostedService.StartAsync(CancellationToken.None);

var trace = provider.GetRequiredService<EnrichmentTrace>();
var sessionId = $"probe/{DateTime.UtcNow:yyyyMMdd-HHmmss}/{Guid.NewGuid():N}"[..40];

Console.WriteLine("[2/4] Emitting one run");

string traceId;
string? deepLink;

using (var run = trace.StartRun("ai-enrichment:probe", Activity.Current))
{
    if (run is null)
    {
        Console.Error.WriteLine();
        Console.Error.WriteLine(
            "FAILED: no span was created, so the tracer provider was never built. The reason "
            + "is in the log above — an invalid option, a secret that could not be resolved, "
            + "or credentials Langfuse rejected.");
        return 1;
    }

    traceId = run.TraceId.ToHexString();
    deepLink = trace.DeepLink(run);

    trace.DescribeRun(
        run,
        sessionId,
        applicationJson: """{"probe":true,"note":"synthetic run from langfuse-trace-probe"}""",
        metadata: new Dictionary<string, object?>
        {
            ["task_id"] = "probe",
            ["machine"] = Environment.MachineName,
            ["probe"] = true,
        },
        tags: ["probe"]);

    using (var step = trace.StartStep("probe-step", 0))
    using (var item = trace.StartItem("probe.rule", "A synthetic rule, so the span tree has the real shape."))
    {
        using (var generation = trace.StartGeneration("probe-model", 0, new ChatRequest
        {
            Messages = [ChatMessage.System("You are a probe."), ChatMessage.User("Say hello.")],
            Temperature = 0,
        }))
        {
            trace.CompleteGeneration(generation, new ChatResponse
            {
                Content = "hello",
                FinishReason = "tool_calls",
                Model = "probe-model",
                StatusCode = 200,
                ElapsedMs = 1,
                Usage = new Dictionary<string, object?>
                {
                    ["prompt_tokens"] = 21,
                    ["completion_tokens"] = 2,
                    ["total_tokens"] = 23,
                },
                ToolCalls = [new ToolCall { Id = "call_1", Name = "probe_tool", ArgumentsRaw = "{}" }],
            });
        }

        trace.RecordTool("probe_tool", "call_1", "{}", """{"ok":true}""", argumentsParseFailed: false);
        trace.CompleteItem(item, "ok", "probe", llmCalls: 1, toolCalls: 1, finishReason: "tool_calls");

        // Referenced so the step span is unambiguously the item's parent for a reader.
        _ = step;
    }

    trace.CompleteRun(run, "probe complete");
}

Console.WriteLine($"      trace   {traceId}");
Console.WriteLine($"      session {sessionId}");

Console.WriteLine("[3/4] Flushing the exporter");
foreach (var hostedService in hostedServices)
    await hostedService.StopAsync(CancellationToken.None);

Console.WriteLine("[4/4] Reading the trace back from Langfuse");
var scoreClient = provider.GetRequiredService<ILangfuseScoreClient>();

// Ingestion is queued, so absence is only meaningful after giving it time.
const int Attempts = 10;
for (var attempt = 1; attempt <= Attempts; attempt++)
{
    var found = await scoreClient.FindTraceIdsBySession(sessionId);
    if (found.Count > 0)
    {
        Console.WriteLine();
        Console.WriteLine($"OK: Langfuse stored the trace ({string.Join(", ", found)}).");
        if (deepLink is not null)
            Console.WriteLine(deepLink);
        else
            Console.WriteLine($"Search for session '{sessionId}' in the Langfuse UI.");
        return 0;
    }

    Console.WriteLine($"      not visible yet ({attempt}/{Attempts})");
    await Task.Delay(TimeSpan.FromSeconds(3));
}

Console.Error.WriteLine();
Console.Error.WriteLine(
    $"FAILED: the span was created and handed to the exporter, but no trace for session "
    + $"'{sessionId}' exists in Langfuse after {Attempts * 3} seconds.");
Console.Error.WriteLine(
    "The export itself is therefore what is failing. Any OpenTelemetry warning above is "
    + "the exporter's own report; if there is none, the batch was accepted and dropped "
    + "after ingestion — check that the key belongs to the project you are looking at, and "
    + "that the environment filter in the UI is not hiding it.");
return 1;

static string Mask(string value) =>
    value.Length <= 12 ? "***" : $"{value[..9]}…{value[^4..]}";
