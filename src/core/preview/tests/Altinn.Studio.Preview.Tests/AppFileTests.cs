using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Tests;

public sealed class AppFileTests : IDisposable
{
    private const string Logo = "<svg xmlns=\"http://www.w3.org/2000/svg\"/>";

    private readonly PreviewApplicationFactory _factory = new();
    private readonly string _workingCopy;

    public AppFileTests()
    {
        _workingCopy = _factory.Root.AddWorkingCopy("developer", "ttd", "my-app");
        RepositoryRoot.AddFile(_workingCopy, "App/wwwroot/images/logo.svg", Logo);
        RepositoryRoot.AddFile(_workingCopy, "App/config/applicationmetadata.json", "{}");
        string otherApp = _factory.Root.AddWorkingCopy("developer", "ttd", "other-app");
        RepositoryRoot.AddFile(otherApp, "App/wwwroot/images/logo.svg", Logo);
    }

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task AppFile_IsServedFromTheWorkingCopysWwwroot()
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await _factory
            .CreatePublicClient()
            .GetAsync(new Uri(appRoot, "images/logo.svg"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/svg+xml", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(Logo, await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task AppFile_HasThePreviewResponseHeaders()
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await _factory
            .CreatePublicClient()
            .GetAsync(new Uri(appRoot, "images/logo.svg"), TestContext.Current.CancellationToken);

        Assert.Equal(
            $"frame-ancestors {PreviewApplicationFactory.StudioOrigin}",
            string.Join(",", response.Headers.GetValues("Content-Security-Policy"))
        );
        Assert.Equal("no-referrer", string.Join(",", response.Headers.GetValues("Referrer-Policy")));
        Assert.Equal("nosniff", string.Join(",", response.Headers.GetValues("X-Content-Type-Options")));
        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task AppFile_IsNotServedOnTheInternalPort()
    {
        Uri appRoot = await StartSession();

        using HttpResponseMessage response = await _factory
            .CreateInternalClient()
            .GetAsync(new Uri(appRoot, "images/logo.svg"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("{session}/ttd/my-app/images/missing.svg")]
    [InlineData("{session}/ttd/other-app/images/logo.svg")]
    [InlineData("{session}/other-org/my-app/images/logo.svg")]
    [InlineData("{session}/ttd/my-app/%2E%2E/config/applicationmetadata.json")]
    [InlineData("{session}/ttd/my-app/..%2F..%2Fother-app/App/wwwroot/images/logo.svg")]
    [InlineData("{session}/ttd/my-app/")]
    [InlineData("0123456789abcdef0123456789abcdef/ttd/my-app/images/logo.svg")]
    [InlineData("not-a-session/ttd/my-app/images/logo.svg")]
    public async Task AppFile_IsNotFoundOutsideTheSessionsWwwroot(string pathTemplate)
    {
        ArgumentNullException.ThrowIfNull(pathTemplate);
        Uri appRoot = await StartSession();
        string sessionId = appRoot.Segments[1].TrimEnd('/');

        using HttpResponseMessage response = await _factory
            .CreatePublicClient()
            .GetAsync(
                new Uri(
                    $"{PreviewApplicationFactory.PublicBaseUrl}/{pathTemplate.Replace("{session}", sessionId, StringComparison.Ordinal)}"
                ),
                TestContext.Current.CancellationToken
            );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Traces_DoNotRecordTheSessionId()
    {
        Uri appRoot = await StartSession();
        string sessionId = appRoot.Segments[1].TrimEnd('/');
        var paths = new List<string>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == "Microsoft.AspNetCore",
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity =>
            {
                lock (paths)
                {
                    paths.Add(activity.GetTagItem("url.path") as string ?? string.Empty);
                }
            },
        };
        ActivitySource.AddActivityListener(listener);

        using HttpResponseMessage response = await _factory
            .CreatePublicClient()
            .GetAsync(new Uri(appRoot, "images/logo.svg"), TestContext.Current.CancellationToken);

        string recorded = await WaitForPath(paths, path => path.EndsWith("/images/logo.svg", StringComparison.Ordinal));
        Assert.Equal("/{sessionId}/ttd/my-app/images/logo.svg", recorded);
        Assert.DoesNotContain(sessionId, recorded, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AppFile_IsServedForHead()
    {
        Uri appRoot = await StartSession();

        using var request = new HttpRequestMessage(HttpMethod.Head, new Uri(appRoot, "images/logo.svg"));
        using HttpResponseMessage response = await _factory
            .CreatePublicClient()
            .SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("iframe", HttpStatusCode.OK)]
    [InlineData("image", HttpStatusCode.OK)]
    [InlineData("document", HttpStatusCode.NotFound)]
    public async Task AppFile_OpensOnlyInAFrame(string fetchDestination, HttpStatusCode expected)
    {
        Uri appRoot = await StartSession();

        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(appRoot, "images/logo.svg"));
        request.Headers.Add("Sec-Fetch-Dest", fetchDestination);
        using HttpResponseMessage response = await _factory
            .CreatePublicClient()
            .SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(expected, response.StatusCode);
    }

    [Fact]
    public async Task Error_HasThePreviewResponseHeaders()
    {
        using var factory = new PreviewApplicationFactory(new UnavailableCache());

        using HttpResponseMessage response = await factory
            .CreatePublicClient()
            .GetAsync(
                new Uri($"{PreviewApplicationFactory.PublicBaseUrl}/{SessionId.New()}/ttd/my-app/images/logo.svg"),
                TestContext.Current.CancellationToken
            );

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(
            $"frame-ancestors {PreviewApplicationFactory.StudioOrigin}",
            string.Join(",", response.Headers.GetValues("Content-Security-Policy"))
        );
        Assert.Equal("nosniff", string.Join(",", response.Headers.GetValues("X-Content-Type-Options")));
    }

    [Theory]
    [InlineData("/health/live")]
    [InlineData("/health/ready")]
    public async Task Health_IsServedOnBothPorts(string path)
    {
        using HttpResponseMessage publicResponse = await _factory
            .CreatePublicClient()
            .GetAsync(new Uri(path, UriKind.Relative), TestContext.Current.CancellationToken);
        using HttpResponseMessage internalResponse = await _factory
            .CreateInternalClient()
            .GetAsync(new Uri(path, UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, publicResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, internalResponse.StatusCode);
    }

    private async Task<Uri> StartSession()
    {
        using HttpResponseMessage response = await SessionApiTests.Start(
            _factory.CreateInternalClient(),
            "developer",
            "ttd",
            "my-app"
        );
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<StartSessionResponse>(
            TestContext.Current.CancellationToken
        );
        return body?.Url ?? throw new InvalidOperationException("No session URL.");
    }

    /// <summary>
    /// The first recorded path that matches. The server stops a request's activity as it finishes the request, which
    /// can be just after the client has the response.
    /// </summary>
    private static async Task<string> WaitForPath(List<string> paths, Func<string, bool> matches)
    {
        for (int attempt = 0; attempt < 50; attempt++)
        {
            lock (paths)
            {
                if (paths.FirstOrDefault(matches) is { } path)
                {
                    return path;
                }
            }

            await Task.Delay(TimeSpan.FromMilliseconds(100), TestContext.Current.CancellationToken);
        }

        throw new InvalidOperationException("The request's activity was not recorded.");
    }
}
