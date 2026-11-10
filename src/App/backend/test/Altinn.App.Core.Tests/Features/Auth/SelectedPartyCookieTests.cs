using Altinn.App.Core.Features.Auth;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Core.Tests.Features.Auth;

public class SelectedPartyCookieTests
{
    private static IReadOnlyList<string> Read(string? cookieHeader)
    {
        var context = new DefaultHttpContext();
        if (cookieHeader is not null)
            context.Request.Headers.Cookie = cookieHeader;
        return AuthenticationContext.ReadSelectedPartyCookieValues(context.Request, "AltinnPartyId");
    }

    [Theory]
    [InlineData(null, "")]
    [InlineData("other=x", "")]
    [InlineData("AltinnPartyId=", "")] // dropped, as the framework does
    [InlineData("AltinnPartyId=50012345", "50012345")]
    [InlineData("other=x; AltinnPartyId=50012345; another=y", "50012345")]
    [InlineData("AltinnPartyId=; AltinnPartyId=50012345", "50012345")]
    [InlineData("AltinnPartyId=50012345; AltinnPartyId=50012345", "50012345,50012345")]
    [InlineData("AltinnPartyId=50012345; other=x; AltinnPartyId=51099999", "50012345,51099999")]
    public void Reads_Every_Copy_In_Order(string? cookieHeader, string expected)
    {
        Assert.Equal(expected, string.Join(',', Read(cookieHeader)));
    }
}
