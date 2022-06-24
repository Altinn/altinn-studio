using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using Altinn.App.Api.Controllers;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Altinn.App.Api.Tests.Controllers;

public class TextsControllerTests
{
    [Fact]
    public async Task Get_RetrunsTexts_when_found()
    {
        // Arrange
        const string org = "ttd";
        const string app = "unit-app";
        const string language = "nb";

        TextResource expected = new TextResource
        {
            Id = "test",
            Language = language,
            Org = org,
            Resources = new List<TextResourceElement>
            {
                new TextResourceElement
                {
                    Id = "test",
                    Value = "test"
                }
            }
        };
        
        var appResourceMock = new Mock<IAppResources>();
        appResourceMock.Setup(a => a.GetTexts(org, app, language))
            .Returns(Task.FromResult(expected));
        
        // Act
        var controller = new TextsController(appResourceMock.Object);
        var result = await controller.Get(org, app, language);
        
        // Assert
        var resultValue = result.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);
        appResourceMock.Verify(a => a.GetTexts(org, app, language), Times.Once);
        appResourceMock.VerifyNoOtherCalls();
    }
    
    [Fact]
    public async Task Get_checks_for_nb_text_if_language_specific_not_found_and_return_404_if_not_found()
    {
        // Arrange
        const string org = "ttd";
        const string app = "unit-app";
        const string language = "en";

        TextResource expected = new TextResource
        {
            Id = "test",
            Language = "nb",
            Org = org,
            Resources = new List<TextResourceElement>
            {
                new TextResourceElement
                {
                    Id = "test",
                    Value = "test"
                }
            }
        };
        
        var appResourceMock = new Mock<IAppResources>();
        appResourceMock.Setup(a => a.GetTexts(org, app, language))
            .Returns(Task.FromResult<TextResource>(null));
        appResourceMock.Setup(a => a.GetTexts(org, app, "nb"))
            .Returns(Task.FromResult<TextResource>(null));
        // Act
        var controller = new TextsController(appResourceMock.Object);
        var result = await controller.Get(org, app, language);
        
        // Assert
        var resultValue = result.Value;
        result.Result.Should().BeOfType<NotFoundResult>();
        resultValue.Should().BeNull();
        appResourceMock.Verify(a => a.GetTexts(org, app, language), Times.Once);
        appResourceMock.Verify(a => a.GetTexts(org, app, "nb"), Times.Once);
        appResourceMock.VerifyNoOtherCalls();
    }
    
    [Fact]
    public async Task Get_returns_bad_request_when_language_has_length_greater_than_two()
    {
        // Arrange
        const string org = "ttd";
        const string app = "unit-app";
        
        var appResourceMock = new Mock<IAppResources>();
        
        // Act
        var controller = new TextsController(appResourceMock.Object);
        var result = await controller.Get(org, app, "null");
        
        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
        var resultValue = result.Value;
        resultValue.Should().BeNull();
        appResourceMock.VerifyNoOtherCalls();
    }
}