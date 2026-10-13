using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Assistant.Runner.Tests;

public sealed class RunnerApiTests
{
    private const string UpgradePath = "/api/v1/upgrades/v9";
    private const string BuildPath = "/api/v1/builds";

    private static readonly byte[] _archive = [0x1f, 0x8b, 0x08, 0x00];

    [Fact]
    public async Task Health_IsOk()
    {
        await using var api = await TestRunnerApi.StartAsync();

        using var response = await api.Client.GetAsync(
            new Uri("/health", UriKind.Relative),
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData(UpgradePath, nameof(JobCommand.UpgradeToV9))]
    [InlineData(BuildPath, nameof(JobCommand.Build))]
    public async Task Route_SendsTheArchiveToItsCommand(string path, string command)
    {
        await using var api = await TestRunnerApi.StartAsync();

        using var response = await PostArchiveAsync(api, path, _archive);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var call = Assert.Single(api.Jobs.Calls);
        Assert.Equal(Enum.Parse<JobCommand>(command), call.Command);
        Assert.Equal(_archive, call.Archive);
    }

    [Fact]
    public async Task Result_HasThePatchAsBase64()
    {
        await using var api = await TestRunnerApi.StartAsync();
        api.Jobs.Run = (_, _) =>
            Task.FromResult<JobOutcome>(new JobResult(3, false, "{\"exitCode\":3}", "warning", [0xff, 0x00, 0x41]));

        using var response = await PostArchiveAsync(api, UpgradePath, _archive);

        var result = await ReadJsonAsync(response);
        Assert.Equal(3, result.GetProperty("exitCode").GetInt32());
        Assert.False(result.GetProperty("timedOut").GetBoolean());
        Assert.Equal("{\"exitCode\":3}", result.GetProperty("stdout").GetString());
        Assert.Equal("warning", result.GetProperty("stderr").GetString());
        Assert.Equal("/wBB", result.GetProperty("patch").GetString());
    }

    [Fact]
    public async Task TimedOutResult_HasNoExitCodeAndNoPatch()
    {
        await using var api = await TestRunnerApi.StartAsync();
        api.Jobs.Run = (_, _) => Task.FromResult<JobOutcome>(new JobResult(null, true, "", "", null));

        using var response = await PostArchiveAsync(api, BuildPath, _archive);

        var result = await ReadJsonAsync(response);
        Assert.Equal(JsonValueKind.Null, result.GetProperty("exitCode").ValueKind);
        Assert.True(result.GetProperty("timedOut").GetBoolean());
        Assert.Equal(JsonValueKind.Null, result.GetProperty("patch").ValueKind);
    }

    [Fact]
    public async Task InvalidArchive_IsABadRequestWithTheReason()
    {
        await using var api = await TestRunnerApi.StartAsync();
        api.Jobs.Run = (_, _) => Task.FromResult<JobOutcome>(new InvalidArchive("gzip: stdin: not in gzip format"));

        using var response = await PostArchiveAsync(api, BuildPath, _archive);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            "gzip: stdin: not in gzip format",
            (await ReadJsonAsync(response)).GetProperty("detail").GetString()
        );
    }

    [Theory]
    [InlineData("application/gzip; charset=binary")]
    [InlineData("Application/GZIP")]
    public async Task GzipContentTypeWithParametersOrOtherCase_IsAccepted(string contentType)
    {
        await using var api = await TestRunnerApi.StartAsync();
        using var content = new ByteArrayContent(_archive);
        content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);

        using var response = await api.Client.PostAsync(
            new Uri(BuildPath, UriKind.Relative),
            content,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task OtherContentType_IsRejectedWithoutAJob()
    {
        await using var api = await TestRunnerApi.StartAsync();
        using var content = new ByteArrayContent(_archive);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

        using var response = await api.Client.PostAsync(
            new Uri(BuildPath, UriKind.Relative),
            content,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
        Assert.Empty(api.Jobs.Calls);
    }

    [Fact]
    public async Task RequestWhileAJobRuns_IsUnavailableAtOnce()
    {
        await using var api = await TestRunnerApi.StartAsync();
        var jobStarted = new TaskCompletionSource();
        var jobCanEnd = new TaskCompletionSource();
        api.Jobs.Run = async (_, _) =>
        {
            jobStarted.SetResult();
            await jobCanEnd.Task;
            return new JobResult(0, false, "", "", null);
        };

        var firstRequest = PostArchiveAsync(api, UpgradePath, _archive);
        await jobStarted.Task.WaitAsync(TestContext.Current.CancellationToken);
        using var whileBusy = await PostArchiveAsync(api, BuildPath, _archive);
        jobCanEnd.SetResult();
        using var first = await firstRequest;
        api.Jobs.Run = (_, _) => Task.FromResult<JobOutcome>(new JobResult(0, false, "", "", null));
        using var afterTheJob = await PostArchiveAsync(api, BuildPath, _archive);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, whileBusy.StatusCode);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, afterTheJob.StatusCode);
    }

    [Fact]
    public async Task FailedJob_ReleasesTheJobSlot()
    {
        await using var api = await TestRunnerApi.StartAsync();
        api.Jobs.Run = (_, _) => throw new InvalidOperationException("The clean-up failed.");
        using var failed = await PostArchiveAsync(api, BuildPath, _archive);
        api.Jobs.Run = (_, _) => Task.FromResult<JobOutcome>(new JobResult(0, false, "", "", null));

        using var next = await PostArchiveAsync(api, BuildPath, _archive);

        Assert.Equal(HttpStatusCode.InternalServerError, failed.StatusCode);
        Assert.Equal(HttpStatusCode.OK, next.StatusCode);
    }

    [Fact]
    public async Task ArchiveAboveKestrelsDefaultLimit_ReachesTheJob()
    {
        await using var api = await TestRunnerApi.StartAsync();
        var archive = new byte[40 * 1024 * 1024];

        using var response = await PostArchiveAsync(api, BuildPath, archive);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(archive.Length, Assert.Single(api.Jobs.Calls).Archive.Length);
    }

    [Fact]
    public async Task ArchiveAboveTheLimit_IsRejectedWithoutAJob()
    {
        await using var api = await TestRunnerApi.StartAsync();

        var status = await api.PostAnnouncedLengthAsync(BuildPath, RunnerApi.MaxArchiveBytes + 1);

        Assert.Equal(StatusCodes.Status413PayloadTooLarge, status);
        Assert.Empty(api.Jobs.Calls);
    }

    private static async Task<HttpResponseMessage> PostArchiveAsync(TestRunnerApi api, string path, byte[] archive)
    {
        using var content = new ByteArrayContent(archive);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/gzip");
        return await api.Client.PostAsync(
            new Uri(path, UriKind.Relative),
            content,
            TestContext.Current.CancellationToken
        );
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return JsonDocument.Parse(body).RootElement;
    }
}
