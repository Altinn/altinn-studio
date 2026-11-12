using System;
using System.Text;
using System.Text.RegularExpressions;
using Altinn.Studio.Common.App;
using Altinn.Studio.Common.App.V8;
using Xunit;

namespace Altinn.Studio.Common.Tests.App.V8;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed partial class AppFrontendVersionTests
{
    [Theory]
    [InlineData("4")]
    [InlineData("4.11")]
    [InlineData("4.11.2")]
    [InlineData("4.0.0-rc.1")]
    [InlineData("4.0.0+build.5")]
    public void Read_TakesTheVersionFromTheScript(string version)
    {
        string html = Page($"<script src=\"{Script(version)}\"></script>");

        Assert.Equal(version, AppFrontendVersionReader.Read(html)?.Value);
    }

    [Theory]
    [InlineData("latest")]
    [InlineData("4.x")]
    [InlineData("04.1.0")]
    [InlineData("")]
    public void Read_RejectsOtherScriptSegments(string version)
    {
        string html = Page($"<script src=\"{Script(version)}\"></script>");

        Assert.Null(AppFrontendVersionReader.Read(html));
    }

    [Fact]
    public void Read_PrefersTheMetaTagWhereverItIs()
    {
        string html = Page(
            $"<script src='{Script("3")}'></script><meta data-altinn-app-frontend-version=\"4.5.0-local\" />"
        );

        Assert.Equal("4.5.0-local", AppFrontendVersionReader.Read(html)?.Value);
    }

    [Fact]
    public void Read_ToleratesRazorUnquotedAndUppercaseMarkup()
    {
        string html = """
            @{ var x = 1 < 2; List<string> items = new(); }
            <!DOCTYPE html>
            <HTML><BODY data-x='a > b'>
            <SCRIPT SRC=https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.js></SCRIPT>
            """;

        Assert.Equal("4", AppFrontendVersionReader.Read(html)?.Value);
    }

    [Fact]
    public void Read_IgnoresCommentsAndScriptContent()
    {
        string html = Page(
            "<!-- <meta data-altinn-app-frontend-version=\"1\"> -->"
                + "<script>var s = '<meta data-altinn-app-frontend-version=\"2\">';</script>"
                + $"<script src=\"{Script("4")}\"></script>"
        );

        Assert.Equal("4", AppFrontendVersionReader.Read(html)?.Value);
    }

    [Theory]
    [InlineData("")]
    [InlineData("<")]
    [InlineData("<script src=\"https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.js")]
    [InlineData("<meta data-altinn-app-frontend-version")]
    [InlineData("<!-- unterminated")]
    [InlineData("<script src='https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.js")]
    [InlineData("<html><body>no frontend</body></html>")]
    public void Read_NeverThrowsOnMalformedMarkup(string html)
    {
        _ = AppFrontendVersionReader.Read(html);
        _ = AppFrontendVersionReader.Read(new ReadOnlyMemory<byte>(Encoding.UTF8.GetBytes(html)));
    }

    [Fact]
    public void Read_DecodesUtf8WithByteOrderMark()
    {
        byte[] bytes =
        [
            .. Encoding.UTF8.GetPreamble(),
            .. Encoding.UTF8.GetBytes(Page($"<script src=\"{Script("4")}\"></script>")),
        ];

        Assert.Equal("4", AppFrontendVersionReader.Read(new ReadOnlyMemory<byte>(bytes))?.Value);
    }

    // The rules Designer's AppFrontendVersionHelper checks the script's segment with.
    [Theory]
    [InlineData("1.2.3")]
    [InlineData("0.0.0")]
    [InlineData("01.2.3")]
    [InlineData("1.02.3")]
    [InlineData("1.2")]
    [InlineData("1.2.3.4")]
    [InlineData("1.2.3-alpha")]
    [InlineData("1.2.3-alpha.1")]
    [InlineData("1.2.3-0.3.7")]
    [InlineData("1.2.3-01")]
    [InlineData("1.2.3-0a")]
    [InlineData("1.2.3-x-y-z.--")]
    [InlineData("1.2.3-")]
    [InlineData("1.2.3-a..b")]
    [InlineData("1.2.3+build.01")]
    [InlineData("1.2.3-rc.1+build")]
    [InlineData("1.2.3+")]
    [InlineData("1.2.3+a+b")]
    [InlineData("1.2.3-a_b")]
    [InlineData("4")]
    [InlineData("04")]
    [InlineData("4.")]
    [InlineData(".4")]
    [InlineData("4.11")]
    [InlineData("4.11.x")]
    [InlineData("v4")]
    [InlineData("")]
    public void Read_AcceptsTheSameSegmentsAsDesigner(string version)
    {
        // A pre-release number with a leading zero is the one thing accepted here that Designer refuses.
        bool expected =
            DesignerSemanticVersion().IsMatch(version)
            || DesignerExtendedVersion().IsMatch(version)
            || version == "1.2.3-01";

        Assert.Equal(
            expected,
            AppFrontendVersionReader.Read(Page($"<script src=\"{Script(version)}\"></script>"))?.Value == version
        );
    }

    [Theory]
    [InlineData("4", 4, null)]
    [InlineData("4.11", 4, 11)]
    [InlineData("04", 4, null)]
    public void TryParse_ReadsAChannel(string value, int major, int? minor)
    {
        Assert.True(AppFrontendVersion.TryParse(value, out AppFrontendVersion? version));
        var channel = Assert.IsType<AppFrontendVersion.Channel>(version);
        Assert.Equal((major, minor), (channel.Major, channel.Minor));
        Assert.Equal(value, channel.ToString());
    }

    [Theory]
    [InlineData("4.11.2", 4)]
    [InlineData("4.24.1-pr.3311.instance-contextual-layout-settings.1d7aebf9", 4)]
    [InlineData("3.0.0-pr.1.x.01234567", 3)]
    public void TryParse_ReadsAnExactVersion(string value, int major)
    {
        Assert.True(AppFrontendVersion.TryParse(value, out AppFrontendVersion? version));
        var exact = Assert.IsType<AppFrontendVersion.Exact>(version);
        Assert.Equal(major, exact.Major);
        Assert.Equal(SemanticVersion.Parse(value), exact.Version);
        Assert.Equal(value, exact.ToString());
    }

    [Theory]
    [InlineData("latest")]
    [InlineData("4.x")]
    [InlineData("4.11.2.1")]
    [InlineData("")]
    [InlineData(null)]
    public void TryParse_RefusesWhatIsNeither(string? value)
    {
        Assert.False(AppFrontendVersion.TryParse(value, out AppFrontendVersion? version));
        Assert.Null(version);
    }

    [Fact]
    public void Read_NamesNoneWhenTheMetaTagIsNotAVersion()
    {
        string html = Page(
            $"<script src='{Script("4")}'></script><meta data-altinn-app-frontend-version=\"local build\" />"
        );

        Assert.Null(AppFrontendVersionReader.Read(html));
    }

    [GeneratedRegex(
        @"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$"
    )]
    private static partial Regex DesignerSemanticVersion();

    [GeneratedRegex(@"^(\d+)(\.\d+)?$")]
    private static partial Regex DesignerExtendedVersion();

    private static string Script(string version) =>
        $"https://altinncdn.no/toolkits/altinn-app-frontend/{version}/altinn-app-frontend.js";

    private static string Page(string body) =>
        $"<!DOCTYPE html><html><head><title>Æ</title></head><body>{body}</body></html>";
}
