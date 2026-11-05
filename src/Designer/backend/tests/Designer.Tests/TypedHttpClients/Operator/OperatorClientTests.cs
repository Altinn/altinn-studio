#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.Operator;
using Altinn.Studio.Designer.TypedHttpClients.Operator.Models;
using Xunit;

namespace Designer.Tests.TypedHttpClients.Operator;

public class OperatorClientTests
{
    private const string BaseUrl = "http://core-operator.core-operator.svc.cluster.local:8080/";
    private const string Commit = "0123456789abcdef0123456789abcdef01234567";
    private static readonly Guid s_runId = Guid.Parse("0b6f6c4e-2b8f-5d4a-9a51-6f3c2f7e8d10");

    // A copy of ttd/my-app in a user's own repositories, so the owner of the repository is not the app's org.
    private static readonly RunSource s_source = new("ttd", "my-app", "testuser", "my-app", Commit);

    private const string QueuedRun = $$"""
        {
            "id": "0b6f6c4e-2b8f-5d4a-9a51-6f3c2f7e8d10",
            "kind": "upgrade-v9",
            "source": { "org": "ttd", "app": "my-app", "repoOwner": "testuser", "repo": "my-app", "commit": "{{Commit}}" },
            "status": "queued",
            "queuePosition": 2,
            "createdAt": "2026-11-03T10:00:00.123456789Z",
            "startedAt": null,
            "finishedAt": null,
            "resultExpiresAt": null,
            "error": null
        }
        """;

    [Fact]
    public async Task ListKinds_GetsTheKindsAndReadsThem()
    {
        using var handler = new FakeOperatorHandler(
            HttpStatusCode.OK,
            """
            {"kinds":[{
                "name":"upgrade-v9","args":["targetVersion"],
                "queueTimeoutSeconds":900,"uploadTimeoutSeconds":300,"runTimeoutSeconds":1200,
                "resultTimeoutSeconds":3600,"maxDurationSeconds":2700
            }]}
            """
        );

        var kinds = await CreateClient(handler).ListKinds();

        Assert.Equal(HttpMethod.Get, handler.Method);
        Assert.Equal(new Uri($"{BaseUrl}api/v1/kinds"), handler.RequestUri);
        var kind = Assert.Single(kinds);
        Assert.Equal("upgrade-v9", kind.Name);
        Assert.Equal(900, kind.QueueTimeoutSeconds);
        Assert.Equal(300, kind.UploadTimeoutSeconds);
        Assert.Equal(1200, kind.RunTimeoutSeconds);
        Assert.Equal(3600, kind.ResultTimeoutSeconds);
        Assert.Equal(2700, kind.MaxDurationSeconds);
        Assert.Equal(["targetVersion"], kind.Args);
    }

    [Fact]
    public async Task ListKinds_ReadsAnEmptyCatalog()
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.OK, """{"kinds":[]}""");

        var kinds = await CreateClient(handler).ListKinds();

        Assert.Empty(kinds);
    }

    [Fact]
    public async Task CreateRun_PostsTheKindAndTheSourceAsJson()
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.Accepted, QueuedRun);

        await CreateClient(handler).CreateRun("upgrade-v9", s_source);

        Assert.Equal(HttpMethod.Post, handler.Method);
        Assert.Equal(new Uri($"{BaseUrl}api/v1/runs"), handler.RequestUri);
        Assert.Equal("application/json", handler.ContentType?.ToString());
        using var body = JsonDocument.Parse(handler.Body);
        var root = body.RootElement;
        Assert.Equal(["kind", "source"], root.EnumerateObject().Select(property => property.Name));
        Assert.Equal("upgrade-v9", root.GetProperty("kind").GetString());
        var source = root.GetProperty("source");
        Assert.Equal(
            ["org", "app", "repoOwner", "repo", "commit"],
            source.EnumerateObject().Select(property => property.Name)
        );
        Assert.Equal(s_source, source.Deserialize<RunSource>(JsonSerializerOptions.Web));
    }

    [Fact]
    public async Task CreateRun_SendsTheArgs()
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.Accepted, QueuedRun);

        await CreateClient(handler)
            .CreateRun("upgrade-v9", s_source, new Dictionary<string, string> { ["targetVersion"] = "9.0.0" });

        using var body = JsonDocument.Parse(handler.Body);
        var args = body.RootElement.GetProperty("args");
        Assert.Equal("9.0.0", args.GetProperty("targetVersion").GetString());
    }

    [Fact]
    public async Task CreateRun_WithEmptyArgs_LeavesThemOut()
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.Accepted, QueuedRun);

        await CreateClient(handler).CreateRun("upgrade-v9", s_source, new Dictionary<string, string>());

        using var body = JsonDocument.Parse(handler.Body);
        Assert.False(body.RootElement.TryGetProperty("args", out _));
    }

    [Theory]
    [InlineData(HttpStatusCode.Accepted, true)]
    [InlineData(HttpStatusCode.OK, false)]
    public async Task CreateRun_SaysWhetherTheOperatorCreatedTheRunOrFoundTheOneInProgress(
        HttpStatusCode statusCode,
        bool expectedCreated
    )
    {
        using var handler = new FakeOperatorHandler(statusCode, QueuedRun);

        var (run, created) = await CreateClient(handler).CreateRun("upgrade-v9", s_source);

        Assert.Equal(expectedCreated, created);
        Assert.Equal(s_runId, run.Id);
        Assert.Equal("upgrade-v9", run.Kind);
        Assert.Equal(s_source, run.Source);
        Assert.Equal(RunStatus.Queued, run.Status);
        Assert.Equal(2, run.QueuePosition);
        // Go writes nanoseconds, which .NET keeps to the tick.
        Assert.Equal(new DateTimeOffset(2026, 11, 3, 10, 0, 0, TimeSpan.Zero).AddTicks(1234567), run.CreatedAt);
        Assert.Null(run.FinishedAt);
        Assert.Null(run.ResultExpiresAt);
        Assert.Null(run.Error);
    }

    [Fact]
    public async Task FindRuns_SendsTheFilterInTheQueryAndReadsTheRunsInOrder()
    {
        string newerRun = QueuedRun.Replace("\"queued\"", "\"running\"");
        string olderRun = QueuedRun.Replace("\"queued\"", "\"failed\"");
        using var handler = new FakeOperatorHandler(HttpStatusCode.OK, $$"""{"runs":[{{newerRun}},{{olderRun}}]}""");

        var runs = await CreateClient(handler)
            .FindRuns(
                new RunFilter
                {
                    RepoOwner = "testuser",
                    Repo = "my-app",
                    Commit = Commit,
                    Kind = "upgrade-v9",
                }
            );

        Assert.Equal(HttpMethod.Get, handler.Method);
        Assert.Equal(
            new Uri($"{BaseUrl}api/v1/runs?repoOwner=testuser&repo=my-app&commit={Commit}&kind=upgrade-v9"),
            handler.RequestUri
        );
        Assert.Equal([RunStatus.Running, RunStatus.Failed], runs.Select(run => run.Status));
        Assert.All(runs, run => Assert.Equal(s_source, run.Source));
    }

    [Fact]
    public async Task FindRuns_LeavesTheValuesThatAreNotSetOutOfTheQuery()
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.OK, """{"runs":[]}""");

        await CreateClient(handler).FindRuns(new RunFilter { Org = "ttd", App = "" });

        Assert.Equal(new Uri($"{BaseUrl}api/v1/runs?org=ttd"), handler.RequestUri);
    }

    [Fact]
    public async Task FindRuns_ReadsAnEmptyList()
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.OK, """{"runs":[]}""");

        var runs = await CreateClient(handler).FindRuns(new RunFilter { Org = "ttd" });

        Assert.Empty(runs);
    }

    [Fact]
    public async Task FindRuns_WithoutAFilter_ThrowsWithoutCallingTheOperator()
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.OK, """{"runs":[]}""");

        await Assert.ThrowsAsync<ArgumentException>(() => CreateClient(handler).FindRuns(new RunFilter()));
        Assert.Null(handler.Method);
    }

    [Fact]
    public async Task GetRun_WithoutWait_GetsTheRunWithoutAQuery()
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.OK, QueuedRun);

        await CreateClient(handler).GetRun(s_runId);

        Assert.Equal(HttpMethod.Get, handler.Method);
        Assert.Equal(new Uri($"{BaseUrl}api/v1/runs/{s_runId}"), handler.RequestUri);
    }

    [Fact]
    public async Task GetRun_WithWait_SendsTheWaitInSeconds()
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.OK, QueuedRun);

        await CreateClient(handler).GetRun(s_runId, waitSeconds: 20);

        Assert.Equal(new Uri($"{BaseUrl}api/v1/runs/{s_runId}?wait=20"), handler.RequestUri);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(OperatorClient.MaxWaitSeconds + 1)]
    public async Task GetRun_WithAWaitOutsideTheContract_ThrowsWithoutCallingTheOperator(int waitSeconds)
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.OK, QueuedRun);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => CreateClient(handler).GetRun(s_runId, waitSeconds));
        Assert.Null(handler.Method);
    }

    [Fact]
    public async Task GetRun_ReadsACompletedRunWithTheExpiryOfItsResult()
    {
        using var handler = new FakeOperatorHandler(
            HttpStatusCode.OK,
            QueuedRun
                .Replace("\"queued\"", "\"completed\"")
                .Replace("\"queuePosition\": 2", "\"queuePosition\": null")
                .Replace("\"startedAt\": null", "\"startedAt\": \"2026-11-03T10:01:00Z\"")
                .Replace("\"finishedAt\": null", "\"finishedAt\": \"2026-11-03T10:05:00Z\"")
                .Replace("\"resultExpiresAt\": null", "\"resultExpiresAt\": \"2026-11-03T11:05:00Z\"")
        );

        var run = await CreateClient(handler).GetRun(s_runId);

        Assert.Equal(RunStatus.Completed, run.Status);
        Assert.Null(run.QueuePosition);
        Assert.Equal(new DateTimeOffset(2026, 11, 3, 10, 1, 0, TimeSpan.Zero), run.StartedAt);
        Assert.Equal(new DateTimeOffset(2026, 11, 3, 10, 5, 0, TimeSpan.Zero), run.FinishedAt);
        Assert.Equal(new DateTimeOffset(2026, 11, 3, 11, 5, 0, TimeSpan.Zero), run.ResultExpiresAt);
        Assert.Null(run.Error);
    }

    [Fact]
    public async Task GetRun_ReadsARunThatFailedWithoutAnArchive()
    {
        using var handler = new FakeOperatorHandler(
            HttpStatusCode.OK,
            QueuedRun
                .Replace("\"queued\"", "\"failed\"")
                .Replace("\"queuePosition\": 2", "\"queuePosition\": null")
                .Replace("\"finishedAt\": null", "\"finishedAt\": \"2026-11-03T10:05:00+01:00\"")
                .Replace(
                    "\"error\": null",
                    "\"error\": { \"reason\": \"archive-timeout\", \"detail\": \"No archive arrived.\" }"
                )
        );

        var run = await CreateClient(handler).GetRun(s_runId);

        Assert.Equal(RunStatus.Failed, run.Status);
        Assert.Null(run.StartedAt);
        Assert.Equal(new DateTimeOffset(2026, 11, 3, 10, 5, 0, TimeSpan.FromHours(1)), run.FinishedAt);
        Assert.Null(run.ResultExpiresAt);
        Assert.Equal(new RunError(RunErrorReason.ArchiveTimeout, "No archive arrived."), run.Error);
    }

    [Theory]
    [InlineData("queued", nameof(RunStatus.Queued))]
    [InlineData("starting", nameof(RunStatus.Starting))]
    [InlineData("awaiting-archive", nameof(RunStatus.AwaitingArchive))]
    [InlineData("running", nameof(RunStatus.Running))]
    [InlineData("completed", nameof(RunStatus.Completed))]
    [InlineData("failed", nameof(RunStatus.Failed))]
    [InlineData("canceled", nameof(RunStatus.Canceled))]
    [InlineData("expired", nameof(RunStatus.Expired))]
    public async Task GetRun_ReadsEachStatus(string json, string expected)
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.OK, QueuedRun.Replace("\"queued\"", $"\"{json}\""));

        var run = await CreateClient(handler).GetRun(s_runId);

        Assert.Equal(Enum.Parse<RunStatus>(expected), run.Status);
    }

    [Fact]
    public async Task UploadArchive_PutsTheArchiveAsGzipAndReturnsTheRun()
    {
        using var handler = new FakeOperatorHandler(
            HttpStatusCode.Accepted,
            QueuedRun.Replace("\"queued\"", "\"awaiting-archive\"")
        );
        byte[] archiveBytes = [0x1f, 0x8b, 0x08, 0x00, 0x01, 0x02, 0x03];
        using var archive = new MemoryStream(archiveBytes);

        var run = await CreateClient(handler).UploadArchive(s_runId, archive);

        Assert.Equal(HttpMethod.Put, handler.Method);
        Assert.Equal(new Uri($"{BaseUrl}api/v1/runs/{s_runId}/archive"), handler.RequestUri);
        Assert.Equal("application/gzip", handler.ContentType?.ToString());
        Assert.Equal(archiveBytes, handler.Body);
        Assert.Equal(s_runId, run.Id);
        Assert.Equal(RunStatus.AwaitingArchive, run.Status);
    }

    [Fact]
    public async Task UploadArchive_LeavesTheArchiveStreamOpen()
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.Accepted, QueuedRun);
        using var archive = new MemoryStream([0x1f, 0x8b]);

        await CreateClient(handler).UploadArchive(s_runId, archive);

        Assert.True(archive.CanRead);
    }

    [Fact]
    public async Task GetRunResult_ReadsTheResultTheReportAndThePatch()
    {
        byte[] patch = Encoding.UTF8.GetBytes("diff --git a/App/App.csproj b/App/App.csproj\n");
        string encodedPatch = Convert.ToBase64String(patch);
        using var handler = new FakeOperatorHandler(
            HttpStatusCode.OK,
            $$"""
            {
                "status": "completed", "exitCode": 0, "timedOut": false, "stdout": "Upgraded.\n", "stderr": "",
                "report": { "exitCode": 3, "steps": [{ "name": "Project file", "messages": [{ "text": "Check it", "status": "TODO" }] }] },
                "patch": "{{encodedPatch}}"
            }
            """
        );

        var result = await CreateClient(handler).GetRunResult(s_runId);

        Assert.Equal(HttpMethod.Get, handler.Method);
        Assert.Equal(new Uri($"{BaseUrl}api/v1/runs/{s_runId}/result"), handler.RequestUri);
        Assert.Equal(0, result.ExitCode);
        Assert.False(result.TimedOut);
        Assert.Equal("Upgraded.\n", result.Stdout);
        Assert.Equal("", result.Stderr);
        Assert.Equal(patch, result.Patch);
        var report = result.ReadReport<UpgradeReport>();
        Assert.NotNull(report);
        Assert.Equal(UpgradeOutcome.UpgradedWithManualSteps, report.Outcome);
        var step = Assert.Single(report.Steps!);
        Assert.Equal("Project file", step.Name);
        Assert.Equal(new UpgradeMessage("Check it", UpgradeMessageStatus.Todo), Assert.Single(step.Messages));
    }

    [Fact]
    public async Task GetRunResult_ReadsACommandThatTimedOutWithoutAPatch()
    {
        using var handler = new FakeOperatorHandler(
            HttpStatusCode.OK,
            """{"exitCode":null,"timedOut":true,"stdout":"","stderr":"killed","report":null,"patch":null}"""
        );

        var result = await CreateClient(handler).GetRunResult(s_runId);

        Assert.Null(result.ExitCode);
        Assert.True(result.TimedOut);
        Assert.Null(result.ReadReport<UpgradeReport>());
        Assert.Null(result.Patch);
    }

    [Theory]
    [InlineData(HttpStatusCode.Accepted)]
    [InlineData(HttpStatusCode.OK)]
    public async Task CancelRun_PostsToTheRunsCancelPathAndReturnsTheRun(HttpStatusCode statusCode)
    {
        using var handler = new FakeOperatorHandler(statusCode, QueuedRun.Replace("\"queued\"", "\"canceled\""));

        var run = await CreateClient(handler).CancelRun(s_runId);

        Assert.Equal(HttpMethod.Post, handler.Method);
        Assert.Equal(new Uri($"{BaseUrl}api/v1/runs/{s_runId}/cancel"), handler.RequestUri);
        Assert.Equal(RunStatus.Canceled, run.Status);
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest, "create")]
    [InlineData(HttpStatusCode.Forbidden, "create")]
    [InlineData(HttpStatusCode.NotFound, "create")]
    [InlineData(HttpStatusCode.Conflict, "create")]
    [InlineData(HttpStatusCode.TooManyRequests, "create")]
    [InlineData(HttpStatusCode.ServiceUnavailable, "create")]
    [InlineData(HttpStatusCode.BadRequest, "find")]
    [InlineData(HttpStatusCode.ServiceUnavailable, "find")]
    [InlineData(HttpStatusCode.BadRequest, "upload")]
    [InlineData(HttpStatusCode.NotFound, "upload")]
    [InlineData(HttpStatusCode.Conflict, "upload")]
    [InlineData(HttpStatusCode.RequestEntityTooLarge, "upload")]
    [InlineData(HttpStatusCode.UnsupportedMediaType, "upload")]
    [InlineData(HttpStatusCode.ServiceUnavailable, "upload")]
    [InlineData(HttpStatusCode.NotFound, "result")]
    [InlineData(HttpStatusCode.Conflict, "result")]
    [InlineData(HttpStatusCode.Gone, "result")]
    [InlineData(HttpStatusCode.NotFound, "get")]
    [InlineData(HttpStatusCode.NotFound, "cancel")]
    [InlineData(HttpStatusCode.Unauthorized, "kinds")]
    public async Task ProblemDetails_BecomeAnOperatorExceptionWithTheirStatusAndDetail(
        HttpStatusCode statusCode,
        string call
    )
    {
        using var handler = new FakeOperatorHandler(
            statusCode,
            $$"""{"type":"about:blank","title":"Refused","status":{{(int)statusCode}},"detail":"The operator says no."}""",
            "application/problem+json"
        );
        var client = CreateClient(handler);

        var exception = await Assert.ThrowsAsync<OperatorException>(() => Call(client, call));

        Assert.Equal(statusCode, exception.StatusCode);
        Assert.Equal("Refused", exception.Title);
        Assert.Equal("The operator says no.", exception.Detail);
        Assert.Contains("The operator says no.", exception.Message);
    }

    [Fact]
    public async Task AnErrorThatIsNotProblemDetails_KeepsTheStartOfTheBodyAsDetail()
    {
        string page = "<html>" + new string('x', 5000) + "</html>";
        using var handler = new FakeOperatorHandler(HttpStatusCode.BadGateway, page, "text/html");

        var exception = await Assert.ThrowsAsync<OperatorException>(() => CreateClient(handler).GetRun(s_runId));

        Assert.Equal(HttpStatusCode.BadGateway, exception.StatusCode);
        Assert.Null(exception.Title);
        Assert.StartsWith("<html>xxx", exception.Detail);
        Assert.True(exception.Detail!.Length < page.Length);
    }

    [Fact]
    public async Task AnErrorWithoutABody_HasNoDetail()
    {
        using var handler = new FakeOperatorHandler(HttpStatusCode.ServiceUnavailable, "", "text/plain");

        var exception = await Assert.ThrowsAsync<OperatorException>(() => CreateClient(handler).GetRun(s_runId));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, exception.StatusCode);
        Assert.Null(exception.Detail);
    }

    private static Task Call(OperatorClient client, string call) =>
        call switch
        {
            "create" => client.CreateRun("upgrade-v9", s_source),
            "find" => client.FindRuns(new RunFilter { Commit = Commit }),
            "upload" => client.UploadArchive(s_runId, new MemoryStream([0x1f, 0x8b])),
            "result" => client.GetRunResult(s_runId),
            "get" => client.GetRun(s_runId),
            "cancel" => client.CancelRun(s_runId),
            "kinds" => client.ListKinds(),
            _ => throw new ArgumentOutOfRangeException(nameof(call), call, null),
        };

    private static OperatorClient CreateClient(HttpMessageHandler handler) =>
        new(new HttpClient(handler, disposeHandler: false) { BaseAddress = new Uri(BaseUrl) });

    /// <summary>
    /// Answers every request with one response, and keeps the last request, its body included, to assert on.
    /// </summary>
    private sealed class FakeOperatorHandler(
        HttpStatusCode statusCode,
        string body,
        string mediaType = "application/json"
    ) : HttpMessageHandler
    {
        public HttpMethod? Method { get; private set; }

        public Uri? RequestUri { get; private set; }

        public MediaTypeHeaderValue? ContentType { get; private set; }

        public byte[] Body { get; private set; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            Method = request.Method;
            RequestUri = request.RequestUri;
            if (request.Content is not null)
            {
                ContentType = request.Content.Headers.ContentType;
                Body = await request.Content.ReadAsByteArrayAsync(cancellationToken);
            }

            return new HttpResponseMessage(statusCode) { Content = new StringContent(body, Encoding.UTF8, mediaType) };
        }
    }
}
