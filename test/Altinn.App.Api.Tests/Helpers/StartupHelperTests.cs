using Altinn.App.Api.Helpers;
using Altinn.App.Api.Tests.TestStubs;
using FluentAssertions;

namespace Altinn.App.Api.Tests.Helpers;

public class StartupHelperTests
{
    [Fact]
    public void GetApplicationId_returns_id_from_applicaitonmetadata()
    {
        var appId = StartupHelper.GetApplicationId();
        appId.Should().Be("xunit/test-app");
    }

    [Fact]
    public void IncludeXmlComments_calls_delegate_function_with_expected_values()
    {
        var testDouble = new SwaggerIncludeXmlCommentsTestDouble();
        StartupHelper.IncludeXmlComments(testDouble.IncludeXmlCommentsTestDouble);
        testDouble.GetStrings().Should().HaveCount(1);
        testDouble.GetBools().Should().HaveCount(1);
        testDouble
            .GetStrings()
            .Should()
            .Equal(
                // $"{AppContext.BaseDirectory}Altinn.App.Api.Tests.xml", // Tests does not generate XML documentation
                $"{AppContext.BaseDirectory}Altinn.App.Api.xml"
            );
        testDouble.GetBools().Should().Equal(false);
    }

    [Fact]
    public void IncludeXmlComments_discards_exceptions()
    {
        var testDouble = new SwaggerIncludeXmlCommentsTestDouble();
        StartupHelper.IncludeXmlComments(testDouble.IncludeXmlCommentsFailingTestDouble);
        testDouble.GetStrings().Should().HaveCount(0);
        testDouble.GetBools().Should().HaveCount(0);
    }
}
