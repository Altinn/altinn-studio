using Altinn.Studio.Designer.Hosting;
using Microsoft.AspNetCore.Routing.Patterns;
using Xunit;

namespace Designer.Tests.Hosting;

public class TelemetryRouteTests
{
    [Theory]
    [InlineData(
        "/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/validation",
        "/designer/api/{org}/{app}/validation"
    )]
    [InlineData(
        "designer/api/{org}/{repository:regex(^[[a-z0-9-]]+$)}/branches",
        "/designer/api/{org}/{repository}/branches"
    )]
    [InlineData("designer/api/{id:int?}", "/designer/api/{id?}")]
    [InlineData("designer/api/{version=1}", "/designer/api/{version}")]
    [InlineData("designer/api/files/{*path}", "/designer/api/files/{*path}")]
    [InlineData("designer/api/{name}.{extension:alpha}", "/designer/api/{name}.{extension}")]
    [InlineData("/health", "/health")]
    public void Template_LeavesOutConstraintsAndDefaults(string rawTemplate, string expected)
    {
        Assert.Equal(expected, TelemetryRoute.Template(RoutePatternFactory.Parse(rawTemplate)));
    }
}
