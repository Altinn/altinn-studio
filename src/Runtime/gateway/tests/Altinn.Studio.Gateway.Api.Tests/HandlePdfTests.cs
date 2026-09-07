using Altinn.Studio.Gateway.Api.Application.Pdf;
using Altinn.Studio.Gateway.Api.Clients.Designer;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class HandlePdfTests
{
    private static readonly StudioEnvironments s_studioEnvironments = new()
    {
        ["staging"] = new StudioEnvironmentConfig { Url = "https://staging.altinn.studio/" },
        ["prod"] = new StudioEnvironmentConfig { Url = "https://altinn.studio/" },
    };

    [Theory]
    [InlineData("https://altinn.studio/admin/reports/render?token=abc&org=ttd&env=tt02")]
    [InlineData("https://staging.altinn.studio/admin/reports/render?token=abc")]
    [InlineData("HTTPS://ALTINN.STUDIO/admin/reports/render")]
    public void IsAllowedRenderUrl_WhenHttpsUrlOnConfiguredStudioHost_ReturnsTrue(string pageAddress)
    {
        Assert.True(HandlePdf.IsAllowedRenderUrl(pageAddress, s_studioEnvironments));
    }

    [Theory]
    [InlineData("http://altinn.studio/admin/reports/render")]
    [InlineData("https://evil.example/admin/reports/render")]
    [InlineData("https://altinn.studio.evil.example/")]
    [InlineData("https://10.0.0.1/")]
    [InlineData("https://localhost/")]
    [InlineData("file:///etc/passwd")]
    [InlineData("/admin/reports/render")]
    [InlineData("")]
    [InlineData(null)]
    public void IsAllowedRenderUrl_WhenUrlIsNotHttpsOnConfiguredStudioHost_ReturnsFalse(string? pageAddress)
    {
        Assert.False(HandlePdf.IsAllowedRenderUrl(pageAddress, s_studioEnvironments));
    }

    [Fact]
    public void IsAllowedRenderUrl_WhenNoStudioEnvironmentsConfigured_ReturnsFalse()
    {
        Assert.False(HandlePdf.IsAllowedRenderUrl("https://altinn.studio/", []));
    }
}
