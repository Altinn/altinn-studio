using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Exceptions.CustomTemplate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using CustomTemplateCtrl = Altinn.Studio.Designer.Controllers.CustomTemplateController;

namespace Designer.Tests.Controllers.CustomTemplateController;

public class CustomTemplateControllerTests
{
    private readonly Mock<ICustomTemplateService> _templateServiceMock;

    public CustomTemplateControllerTests()
    {
        _templateServiceMock = new Mock<ICustomTemplateService>();
    }

    [Fact]
    public async Task GetCustomTemplateList_ReturnsOkWithTemplates()
    {
        // Arrange
        var templates = new List<CustomTemplateListObject>
        {
            new() { Id = "template1", Owner = "als", Name = "Template 1" },
            new() { Id = "template2", Owner = "als", Name = "Template 2" }
        };

        _templateServiceMock
            .Setup(x => x.GetCustomTemplateList())
            .ReturnsAsync(templates);

        var controller = CreateController();

        // Act
        var result = await controller.GetCustomTemplateList();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var templateList = Assert.IsType<CustomTemplateList>(okResult.Value);
        Assert.Equal(2, templateList.Templates.Count);
    }

    [Fact]
    public async Task GetCustomTemplateById_ValidTemplate_ReturnsOkWithTemplate()
    {
        // Arrange
        string owner = "als";
        string templateId = "test-template";

        var template = new CustomTemplate
        {
            Id = templateId,
            Owner = owner,
            Name = "Test Template",
            Description = "A test template"
        };

        _templateServiceMock
            .Setup(x => x.GetCustomTemplateById(owner, templateId))
            .ReturnsAsync(template);

        var controller = CreateController();

        // Act
        var result = await controller.GetCustomTemplateById(owner, templateId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedTemplate = Assert.IsType<CustomTemplate>(okResult.Value);
        Assert.Equal(templateId, returnedTemplate.Id);
        Assert.Equal(owner, returnedTemplate.Owner);
        Assert.Equal("Test Template", returnedTemplate.Name);
    }

    [Fact]
    public async Task GetCustomTemplateById_TemplateNotFound_ReturnsNotFound()
    {
        // Arrange
        string owner = "als";
        string templateId = "missing-template";

        _templateServiceMock
            .Setup(x => x.GetCustomTemplateById(owner, templateId))
            .ThrowsAsync(CustomTemplateException.NotFound($"Template '{templateId}' not found"));

        var controller = CreateController();

        // Act
        var result = await controller.GetCustomTemplateById(owner, templateId);

        // Assert
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result.Result);
        Assert.NotNull(notFoundResult.Value);

        var errorObj = notFoundResult.Value;
        var errorProp = errorObj.GetType().GetProperty("error");
        var messageProp = errorObj.GetType().GetProperty("message");

        Assert.Equal("NotFound", errorProp?.GetValue(errorObj)?.ToString());
        Assert.Contains(templateId, messageProp?.GetValue(errorObj)?.ToString());
    }

    [Fact]
    public async Task GetCustomTemplateById_DeserializationFailed_ReturnsInternalServerError()
    {
        // Arrange
        string owner = "als";
        string templateId = "broken-template";

        _templateServiceMock
            .Setup(x => x.GetCustomTemplateById(owner, templateId))
            .ThrowsAsync(CustomTemplateException.DeserializationFailed("Deserialization failed", "Invalid JSON"));

        var controller = CreateController();

        // Act
        var result = await controller.GetCustomTemplateById(owner, templateId);

        // Assert
        var statusCodeResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusCodeResult.StatusCode);

        var errorObj = statusCodeResult.Value;
        var errorProp = errorObj.GetType().GetProperty("error");
        var detailProp = errorObj.GetType().GetProperty("detail");

        Assert.Equal("DeserializationFailed", errorProp?.GetValue(errorObj)?.ToString());
        Assert.Equal("Invalid JSON", detailProp?.GetValue(errorObj)?.ToString());
    }

    [Fact]
    public async Task GetCustomTemplateById_ServiceCallsCorrectly_VerifiesParameters()
    {
        // Arrange
        string owner = "custom-org";
        string templateId = "specific-template";

        var template = new CustomTemplate
        {
            Id = templateId,
            Owner = owner,
            Name = "Specific Template",
            Description = "Template with specific owner"
        };

        _templateServiceMock
            .Setup(x => x.GetCustomTemplateById(owner, templateId))
            .ReturnsAsync(template);

        var controller = CreateController();

        // Act
        await controller.GetCustomTemplateById(owner, templateId);

        // Assert
        _templateServiceMock.Verify(
            x => x.GetCustomTemplateById(owner, templateId),
            Times.Once);
    }

    [Fact]
    public async Task GetCustomTemplateById_TemplateWithComplexData_ReturnsAllData()
    {
        // Arrange
        string owner = "als";
        string templateId = "complex-template";

        var template = new CustomTemplate
        {
            Id = templateId,
            Owner = owner,
            Name = "Complex Template",
            Description = "Template with all fields",
            Remove = new List<string> { "file.txt" },
            PackageReferences = new List<PackageReference>
            {
                new() { Include = "Newtonsoft.Json", Version = "13.0.1", Project = "App.csproj" }
            },
            NextSteps = new List<NextStep>
            {
                new()
                {
                    Title = "Configure",
                    Description = "Configuration step",
                    Type = NextStepType.Configuration
                }
            }
        };

        _templateServiceMock
            .Setup(x => x.GetCustomTemplateById(owner, templateId))
            .ReturnsAsync(template);

        var controller = CreateController();

        // Act
        var result = await controller.GetCustomTemplateById(owner, templateId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedTemplate = Assert.IsType<CustomTemplate>(okResult.Value);

        Assert.NotNull(returnedTemplate.Remove);
        Assert.Single(returnedTemplate.Remove);
        Assert.NotNull(returnedTemplate.PackageReferences);
        Assert.Single(returnedTemplate.PackageReferences);
        Assert.NotNull(returnedTemplate.NextSteps);
        Assert.Single(returnedTemplate.NextSteps);
    }

    private CustomTemplateCtrl CreateController()
    {
        return new CustomTemplateCtrl(_templateServiceMock.Object);
    }
}
