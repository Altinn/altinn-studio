using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.ScoreImport;
using Altinn.App.Ai.Enrichment.Telemetry;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

// Washes caseworker verdicts back onto the traces the ai process task produced.
//
// The connecting thread is the instance id: it is the Langfuse session id, so a
// spreadsheet of instance ids plus a judgement is enough to find the runs and
// score them. Score ids are derived from the instance id and the score name, so
// re-running a corrected file overwrites rather than duplicates.

if (args.Length is 0 or > 2 || args[0] is "-h" or "--help")
{
    Console.Error.WriteLine(
        """
        Usage: langfuse-score-import <file.csv> [score-name]

          file.csv     Header row required. Columns: instanceId, value[, comment]
                       value is 1/0, true/false, ja/nei, or any number.
          score-name   Defaults to "saksbehandler_vurdering".

        Environment:
          LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY
        """);
    return 2;
}

var path = args[0];
var scoreName = args.Length > 1 ? args[1] : "saksbehandler_vurdering";

var host = Environment.GetEnvironmentVariable("LANGFUSE_BASE_URL");
var publicKey = Environment.GetEnvironmentVariable("LANGFUSE_PUBLIC_KEY");
var secretKey = Environment.GetEnvironmentVariable("LANGFUSE_SECRET_KEY");

if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(publicKey) || string.IsNullOrWhiteSpace(secretKey))
{
    Console.Error.WriteLine("LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must all be set.");
    return 2;
}

if (!File.Exists(path))
{
    Console.Error.WriteLine($"No such file: {path}");
    return 2;
}

List<ScoreRow> rows;
try
{
    rows = ScoreCsv.Read(File.ReadLines(path)).ToList();
}
catch (FormatException ex)
{
    Console.Error.WriteLine(ex.Message);
    return 2;
}

if (rows.Count == 0)
{
    Console.Error.WriteLine("The file has a header but no rows.");
    return 2;
}

using var loggerFactory = LoggerFactory.Create(builder => builder
    .AddSimpleConsole(o => o.SingleLine = true)
    .SetMinimumLevel(LogLevel.Warning));

var options = Options.Create(new LangfuseOptions
{
    Host = host,
    PublicKey = publicKey,
    SecretKey = secretKey,
});

var client = new LangfuseScoreClient(
    new SingleClientFactory(),
    options,
    new ConfigurationLangfuseKeyProvider(options),
    loggerFactory.CreateLogger<LangfuseScoreClient>());

int scored = 0, notFound = 0, failed = 0;

foreach (var row in rows)
{
    var traceIds = await client.FindTraceIdsBySession(row.InstanceId);
    if (traceIds.Count == 0)
    {
        Console.Error.WriteLine($"{row.InstanceId}: no trace found");
        notFound++;
        continue;
    }

    // A submission can have several traces — a retry, a replay. The verdict is about
    // the submission, so it goes on all of them rather than on an arbitrary one.
    foreach (var traceId in traceIds)
    {
        var ok = await client.CreateScore(new LangfuseScore
        {
            Id = ScoreCsv.DeterministicScoreId(row.InstanceId, scoreName, traceId),
            TraceId = traceId,
            Name = scoreName,
            Value = row.Value,
            DataType = row.Value is 0 or 1 ? "BOOLEAN" : "NUMERIC",
            Comment = row.Comment,
        });

        if (ok)
            scored++;
        else
            failed++;
    }
}

Console.WriteLine($"{scored} scored, {notFound} without a trace, {failed} rejected.");
return failed > 0 ? 1 : 0;

/// <summary>
/// The score client expects a factory because it lives in an app; here one plain
/// client for the whole run is enough.
/// </summary>
internal sealed class SingleClientFactory : IHttpClientFactory
{
    public HttpClient CreateClient(string name) => new();
}
