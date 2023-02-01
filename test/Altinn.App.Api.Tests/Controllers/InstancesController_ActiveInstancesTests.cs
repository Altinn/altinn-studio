using Microsoft.Extensions.Primitives;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.AppModel;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using Altinn.App.Api.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Api.Tests.Controllers;

public class InstancesController_ActiveInstancesTest
{
    private readonly Mock<ILogger<InstancesController>> _logger = new();
    private readonly Mock<IRegister> _registrer = new();
    private readonly Mock<IInstance> _instanceClient = new();
    private readonly Mock<IData> _data = new();
    private readonly Mock<IAppResources> _appResources = new();
    private readonly Mock<IAppModel> _appModel = new();
    private readonly Mock<IInstantiationProcessor> _instantiationProcessor = new();
    private readonly Mock<IInstantiationValidator> _instantiationValidator = new();
    private readonly Mock<IPDP> _pdp = new();
    private readonly Mock<IEvents> _eventsService = new();
    private readonly IOptions<AppSettings> _appSettings = Options.Create<AppSettings>(new());
    private readonly Mock<IPrefill> _prefill = new();
    private readonly Mock<IProfile> _profile = new();
    private readonly Mock<IProcessEngine> _processEngine = new();

    private InstancesController SUT => new InstancesController(
        _logger.Object,
        _registrer.Object,
        _instanceClient.Object,
        _data.Object,
        _appResources.Object,
        _appModel.Object,
        _instantiationProcessor.Object,
        _instantiationValidator.Object,
        _pdp.Object,
        _eventsService.Object,
        _appSettings,
        _prefill.Object,
        _profile.Object,
        _processEngine.Object);

    private void VerifyNoOtherCalls()
    {
        // _logger.VerifyNoOtherCalls();
        _registrer.VerifyNoOtherCalls();
        _instanceClient.VerifyNoOtherCalls();
        _data.VerifyNoOtherCalls();
        _appResources.VerifyNoOtherCalls();
        _appModel.VerifyNoOtherCalls();
        _instantiationProcessor.VerifyNoOtherCalls();
        _instantiationValidator.VerifyNoOtherCalls();
        _pdp.VerifyNoOtherCalls();
        _eventsService.VerifyNoOtherCalls();
        // _appSettings,
        _prefill.VerifyNoOtherCalls();
        _profile.VerifyNoOtherCalls();
        _processEngine.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task EmptySearchResult_ReturnsOkResult()
    {
        // Arrange
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>();
        var expected = new List<SimpleInstance>();

        _instanceClient.Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>())).ReturnsAsync(instances);

        // Act
        var controller = SUT;
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        _instanceClient.Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query =>
            query.ContainsKey("appId")
        )));
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UnknownUser_ReturnsEmptyString()
    {
        // Arrange
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>()
        {
            new()
            {
                Id = $"{1234}/{Guid.NewGuid()}",
                LastChanged = DateTime.Now,
                LastChangedBy = "12345",
                PresentationTexts = new()
                {
                    {"periode","1. halvår 2023"}
                }
            }
        };
        var expected = instances.Select(i => new SimpleInstance()
        {
            Id = i.Id,
            PresentationTexts = i.PresentationTexts,
            LastChanged = i.LastChanged,
            LastChangedBy = i.LastChangedBy switch
            {
                "12345" => "",
                // "12345" => "", // Would it be more sensible to return UserId as fallback?
                _ => throw new Exception("Unknown user"),
            }
        });

        _instanceClient.Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>())).ReturnsAsync(instances);
        // _profile.Setup(p=>p.GetUserProfile(12345)).ReturnsAsync(default(UserProfile)!);

        // Act
        var controller = SUT;
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        _instanceClient.Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query =>
            query.ContainsKey("appId")
        )));
        _profile.Verify(p => p.GetUserProfile(12345));
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UserProfilePartyIsNull_ReturnsEmptyString()
    {
        // Arrange
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>()
        {
            new()
            {
                Id = $"{1234}/{Guid.NewGuid()}",
                LastChanged = DateTime.Now,
                LastChangedBy = "12345",
                PresentationTexts = new()
                {
                    {"periode","1. halvår 2023"},
                    {"kontaktperson","Eirk Blodøks"}
                }
            }
        };
        var expected = instances.Select(i => new SimpleInstance()
        {
            Id = i.Id,
            PresentationTexts = i.PresentationTexts,
            LastChanged = i.LastChanged,
            LastChangedBy = i.LastChangedBy switch
            {
                "12345" => "",
                // "12345" => "12345", // Would it be more sensible to return UserId as fallback?
                _ => throw new Exception("Unknown user"),
            }
        });

        _instanceClient.Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>())).ReturnsAsync(instances);
        _profile.Setup(p => p.GetUserProfile(12345)).ReturnsAsync(new UserProfile());

        // Act
        var controller = SUT;
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        _instanceClient.Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query =>
            query.ContainsKey("appId")
        )));
        _profile.Verify(p => p.GetUserProfile(12345));
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task KnownUser_ReturnsUserName()
    {
        // Arrange
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>()
        {
            new()
            {
                Id = $"{1234}/{Guid.NewGuid()}",
                LastChanged = DateTime.Now,
                LastChangedBy = "12345",
            }
        };
        var expected = instances.Select(i => new SimpleInstance()
        {
            Id = i.Id,
            PresentationTexts = i.PresentationTexts,
            LastChanged = i.LastChanged,
            LastChangedBy = i.LastChangedBy switch
            {
                "12345" => "Ola Nordmann",
                _ => throw new Exception("Unknown user"),
            }
        });

        _instanceClient.Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>())).ReturnsAsync(instances);
        _profile.Setup(p => p.GetUserProfile(12345)).ReturnsAsync(new UserProfile()
        {
            Party = new()
            {
                Name = "Ola Nordmann"
            }
        });

        // Act
        var controller = SUT;
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        _instanceClient.Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query =>
            query.ContainsKey("appId")
        )));
        _profile.Verify(p => p.GetUserProfile(12345));
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task LastChangedBy9digits_LooksForOrg()
    {
        // Arrange
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>()
        {
            new()
            {
                Id = $"{1234}/{Guid.NewGuid()}",
                LastChanged = DateTime.Now,
                LastChangedBy = "123456789",
            }
        };
        var expected = instances.Select(i => new SimpleInstance()
        {
            Id = i.Id,
            PresentationTexts = i.PresentationTexts,
            LastChanged = i.LastChanged,
            LastChangedBy = i.LastChangedBy switch
            {
                "123456789" => "",
                // "123456789" => "123456789", // Would it be more sensible to return OrgNumber as fallback?
                _ => throw new Exception("Unknown user"),
            }
        });

        _instanceClient.Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>())).ReturnsAsync(instances);
        _registrer.Setup(r => r.ER.GetOrganization("123456789")).ReturnsAsync(default(Organization));

        // Act
        var controller = SUT;
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        _instanceClient.Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query =>
            query.ContainsKey("appId")
        )));
        _registrer.Verify(r => r.ER.GetOrganization("123456789"));
        VerifyNoOtherCalls();
    }

    [Fact]
    public async Task LastChangedBy9digits_FindsOrg()
    {
        // Arrange
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>()
        {
            new()
            {
                Id = $"{1234}/{Guid.NewGuid()}",
                LastChanged = DateTime.Now,
                LastChangedBy = "123456789",
            }
        };
        var expected = instances.Select(i => new SimpleInstance()
        {
            Id = i.Id,
            PresentationTexts = i.PresentationTexts,
            LastChanged = i.LastChanged,
            LastChangedBy = i.LastChangedBy switch
            {
                "123456789" => "Testdepartementet",
                _ => throw new Exception("Unknown user"),
            }
        });

        _instanceClient.Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>())).ReturnsAsync(instances);
        _registrer.Setup(r => r.ER.GetOrganization("123456789")).ReturnsAsync(new Organization
        {
            Name = "Testdepartementet"
        });

        // Act
        var controller = SUT;
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        _instanceClient.Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query =>
            query.ContainsKey("appId")
        )));
        _registrer.Verify(r => r.ER.GetOrganization("123456789"));
        VerifyNoOtherCalls();
    }

}