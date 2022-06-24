using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Altinn.App.Api.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Hosting;
using Moq;
using Xunit;

namespace Altinn.App.Api.Tests.Middleware;

public class SecurityHeadersMiddlewareTests
{
    [Fact]
    public async Task SecurityHeadersMiddleware_Adds_Security_Headers()
    {
        // Arrange
        using var host = await new HostBuilder()
            .ConfigureWebHost(webBuilder =>
            {
                webBuilder
                    .UseTestServer()
                    .Configure(app => { app.UseMiddleware<SecurityHeadersMiddleware>(); });
            })
            .StartAsync();
        // Act
        var response = await host.GetTestClient().GetAsync("/");
        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("deny", response.Headers.GetValues("X-Frame-Options").FirstOrDefault());
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").FirstOrDefault());
        Assert.Equal("0", response.Headers.GetValues("X-XSS-Protection").FirstOrDefault());
        Assert.Equal("no-referer", response.Headers.GetValues("Referer-Policy").FirstOrDefault());
    }
}