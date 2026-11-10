using Altinn.Studio.Designer.Hubs;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Designer.Tests.Hubs;

public class HubsEndpointExtensionsTests
{
    [Theory]
    [InlineData("/hubs/preview", true)]
    [InlineData("/hubs/assistant", true)]
    [InlineData("/hubs/preview/negotiate", false)]
    [InlineData("/hubs/preview/Negotiate", false)]
    [InlineData("/hubsx/preview", false)]
    [InlineData("/designer/api/environments", false)]
    public void IsHubConnection_OnlyForHubConnectionRequests(string path, bool expected)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Path = path;

        Assert.Equal(expected, HubsEndpointExtensions.IsHubConnection(httpContext.Request));
    }
}
