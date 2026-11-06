using Altinn.Studio.Preview.Apps;
using Altinn.Studio.Preview.Files;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Tests.Apps;

public sealed class PreviewUrlsTests
{
    private const string SessionIdValue = "0123456789abcdef0123456789abcdef";

    [Theory]
    [InlineData("https://preview.example")]
    [InlineData("https://preview.example/")]
    public void AppRoot_PutsTheSessionIdBeforeTheAppPath(string baseAddress)
    {
        Assert.True(SessionId.TryParse(SessionIdValue, out SessionId sessionId));
        Assert.True(WorkingCopy.TryCreate("developer", "ttd", "my-app", out WorkingCopy? workingCopy));

        Uri url = PreviewUrls.AppRoot(new Uri(baseAddress), sessionId, workingCopy);

        Assert.Equal($"https://preview.example/{SessionIdValue}/ttd/my-app/", url.AbsoluteUri);
    }

    [Theory]
    [InlineData($"/{SessionIdValue}", "/{sessionId}")]
    [InlineData($"/{SessionIdValue}/", "/{sessionId}/")]
    [InlineData($"/{SessionIdValue}/ttd/my-app/logo.svg", "/{sessionId}/ttd/my-app/logo.svg")]
    public void WithoutSessionId_ReplacesTheSessionId(string path, string expected)
    {
        Assert.Equal(expected, PreviewUrls.WithoutSessionId(path));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("/health/live")]
    [InlineData("/sessions")]
    [InlineData($"/{SessionIdValue}0/ttd")]
    [InlineData($"{SessionIdValue}/ttd")]
    public void WithoutSessionId_LeavesOtherPathsAlone(string? path)
    {
        Assert.Null(PreviewUrls.WithoutSessionId(path));
    }
}
