using System.Net;
using Altinn.App.Tests.Common.Mocks;

namespace Altinn.App.Api.Tests.Mocks;

public class AltinnPartyClientInterceptorTests
{
    [Fact]
    public async Task GetParty_AllowsConcurrentReads()
    {
        using var client = new HttpClient(new AltinnPartyClientInterceptor())
        {
            BaseAddress = new Uri("https://platform.altinn.no/"),
        };

        using var firstResponse = await client.GetAsync(
            "register/api/v1/parties/500600",
            HttpCompletionOption.ResponseHeadersRead
        );
        var firstResponseStream = await firstResponse.Content.ReadAsStreamAsync();
        using var secondResponse = await client.GetAsync(
            "register/api/v1/parties/500600",
            HttpCompletionOption.ResponseHeadersRead
        );

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.False(firstResponseStream.CanWrite);
        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
    }
}
