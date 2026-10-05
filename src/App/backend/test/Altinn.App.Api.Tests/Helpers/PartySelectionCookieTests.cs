using Altinn.App.Api.Helpers;

namespace Altinn.App.Api.Tests.Helpers;

public class PartySelectionCookieTests
{
    [Theory]
    [InlineData("staf.apps.tt02.altinn.no", "apps.tt02.altinn.no,tt02.altinn.no,altinn.no")]
    [InlineData("tt02.altinn.no", "altinn.no")]
    [InlineData("altinn.no", "")]
    [InlineData("local.altinn.cloud", "altinn.cloud")]
    [InlineData("app.localhost", "")]
    public void ParentDomains_StopAtTwoLabels(string hostName, string expected)
    {
        Assert.Equal(expected, string.Join(',', PartySelectionCookie.ParentDomains(hostName)));
    }
}
