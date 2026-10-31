using System.IO;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Infrastructure.Authorization;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace Designer.Tests.Infrastructure.Authorization;

public class GiteaDeployPermissionHandlerTests
{
    private const string Org = "ttd";

    [Theory]
    [InlineData("""{"environment":"tt02"}""")]
    [InlineData("""{"Environment":"tt02"}""")]
    [InlineData("""{"envName":"tt02","tagName":"1"}""")]
    [InlineData("""{"EnvName":"tt02","tagName":"1"}""")]
    public async Task Succeeds_ForAnEnvironmentTheUserMayDeployTo(string body)
    {
        (AuthorizationHandlerContext context, _) = await Authorize(body);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task Forbids_AnEnvironmentTheUserMayNotDeployTo()
    {
        (AuthorizationHandlerContext context, HttpContext httpContext) = await Authorize(
            """{"environment":"production"}"""
        );

        Assert.False(context.HasSucceeded);
        Assert.Equal((int)HttpStatusCode.Forbidden, httpContext.Response.StatusCode);
    }

    // Model binding accepts each of these and acts on one of the environments, which need not be the one checked.
    [Theory]
    [InlineData("""{"environment":"tt02","Environment":"production"}""")]
    [InlineData("""{"environment":"tt02","environment":"production"}""")]
    [InlineData("""{"environment":"production","envName":"tt02"}""")]
    public async Task Rejects_ABodyThatNamesTheEnvironmentMoreThanOnce(string body)
    {
        (AuthorizationHandlerContext context, HttpContext httpContext) = await Authorize(body);

        Assert.False(context.HasSucceeded);
        Assert.Equal((int)HttpStatusCode.BadRequest, httpContext.Response.StatusCode);
    }

    private static async Task<(AuthorizationHandlerContext, HttpContext)> Authorize(string body)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.RouteValues["org"] = Org;
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));

        var giteaClient = new Mock<IGiteaClient>();
        giteaClient
            .Setup(client => client.GetTeams())
            .ReturnsAsync([
                new Team
                {
                    Name = "Deploy-tt02",
                    Organization = new Organization { Username = Org },
                },
            ]);

        var handler = new GiteaDeployPermissionHandler(
            giteaClient.Object,
            new HttpContextAccessor { HttpContext = httpContext }
        );
        var context = new AuthorizationHandlerContext(
            [new GiteaDeployPermissionRequirement()],
            new ClaimsPrincipal(),
            resource: null
        );

        await handler.HandleAsync(context);
        return (context, httpContext);
    }
}
