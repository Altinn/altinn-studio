using System.Reflection;
using Altinn.App.Api.Controllers.Attributes;
using Altinn.App.Api.Controllers.Conventions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace Altinn.App.Api.Tests.Controllers.Conventions;

public class AltinnControllerConventionsTests
{
    [Fact]
    public void Apply_AddsJsonSettingsNameAttributeToControllerModel()
    {
        // Arrange
        var convention = new AltinnControllerConventions();
        var controllerType = typeof(TestController).GetTypeInfo();
        var controllerModel = new ControllerModel(controllerType, []);

        // Act
        convention.Apply(controllerModel);

        // Assert
        var attribute = controllerModel.Filters.OfType<JsonSettingsNameAttribute>().FirstOrDefault();

        Assert.NotNull(attribute);
        Assert.Equal(JsonSettingNames.AltinnApi, attribute.Name);
    }

    // Dummy controller
    private class TestController : ControllerBase { }
}
