using Altinn.App.Api.Controllers;
using Altinn.App.Api.Models;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Primitives;
using Moq;

namespace Altinn.App.Api.Tests.Controllers;

public class InstancesController_ActiveInstancesTest
{
    [Fact]
    public async Task EmptySearchResult_ReturnsOkResult()
    {
        // Arrange
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>();
        var expected = new List<SimpleInstance>();
        using var fixture = InstancesControllerFixture.Create();

        fixture
            .Mock<IInstanceClient>()
            .Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>()))
            .ReturnsAsync(instances);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        fixture
            .Mock<IInstanceClient>()
            .Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query => query.ContainsKey("appId"))));
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UnknownUser_ReturnsEmptyString()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>()
        {
            new()
            {
                Id = $"{1234}/{Guid.NewGuid()}",
                DueBefore = DateTime.Today.AddDays(20),
                LastChanged = DateTime.Now,
                LastChangedBy = "12345",
                PresentationTexts = new() { { "periode", "1. halvår 2023" } },
            },
        };
        var expected = instances.Select(i => new SimpleInstance()
        {
            Id = i.Id,
            DueBefore = i.DueBefore,
            PresentationTexts = i.PresentationTexts,
            LastChanged = i.LastChanged,
            LastChangedBy = i.LastChangedBy switch
            {
                "12345" => "",
                // "12345" => "", // Would it be more sensible to return UserId as fallback?
                _ => throw new Exception("Unknown user"),
            },
        });

        fixture
            .Mock<IInstanceClient>()
            .Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>()))
            .ReturnsAsync(instances);
        // _profile.Setup(p=>p.GetUserProfile(12345)).ReturnsAsync(default(UserProfile)!);

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        fixture
            .Mock<IInstanceClient>()
            .Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query => query.ContainsKey("appId"))));
        fixture.Mock<IProfileClient>().Verify(p => p.GetUserProfile(12345));
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UserProfilePartyIsNull_ReturnsEmptyString()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>()
        {
            new()
            {
                Id = $"{1234}/{Guid.NewGuid()}",
                LastChanged = DateTime.Now,
                LastChangedBy = "12345",
                PresentationTexts = new() { { "periode", "1. halvår 2023" }, { "kontaktperson", "Eirk Blodøks" } },
            },
        };
        var expected = instances.Select(i => new SimpleInstance()
        {
            Id = i.Id,
            DueBefore = i.DueBefore,
            PresentationTexts = i.PresentationTexts,
            LastChanged = i.LastChanged,
            LastChangedBy = i.LastChangedBy switch
            {
                "12345" => "",
                // "12345" => "12345", // Would it be more sensible to return UserId as fallback?
                _ => throw new Exception("Unknown user"),
            },
        });

        fixture
            .Mock<IInstanceClient>()
            .Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>()))
            .ReturnsAsync(instances);
        fixture.Mock<IProfileClient>().Setup(p => p.GetUserProfile(12345)).ReturnsAsync(new UserProfile());

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        fixture
            .Mock<IInstanceClient>()
            .Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query => query.ContainsKey("appId"))));
        fixture.Mock<IProfileClient>().Verify(p => p.GetUserProfile(12345));
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task KnownUser_ReturnsUserName()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>()
        {
            new()
            {
                Id = $"{1234}/{Guid.NewGuid()}",
                LastChanged = DateTime.Now,
                LastChangedBy = "12345",
            },
        };
        var expected = instances.Select(i => new SimpleInstance()
        {
            Id = i.Id,
            DueBefore = i.DueBefore,
            PresentationTexts = i.PresentationTexts,
            LastChanged = i.LastChanged,
            LastChangedBy = i.LastChangedBy switch
            {
                "12345" => "Ola Olsen",
                _ => throw new Exception("Unknown user"),
            },
        });

        fixture
            .Mock<IInstanceClient>()
            .Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>()))
            .ReturnsAsync(instances);
        fixture
            .Mock<IProfileClient>()
            .Setup(p => p.GetUserProfile(12345))
            .ReturnsAsync(new UserProfile() { Party = new() { Name = "Ola Olsen" } });

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        fixture
            .Mock<IInstanceClient>()
            .Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query => query.ContainsKey("appId"))));
        fixture.Mock<IProfileClient>().Verify(p => p.GetUserProfile(12345));
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task LastChangedBy9digits_LooksForOrg()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>()
        {
            new()
            {
                Id = $"{1234}/{Guid.NewGuid()}",
                LastChanged = DateTime.Now,
                LastChangedBy = "123456789",
            },
        };
        var expected = instances.Select(i => new SimpleInstance()
        {
            Id = i.Id,
            DueBefore = i.DueBefore,
            PresentationTexts = i.PresentationTexts,
            LastChanged = i.LastChanged,
            LastChangedBy = i.LastChangedBy switch
            {
                "123456789" => "",
                // "123456789" => "123456789", // Would it be more sensible to return OrgNumber as fallback?
                _ => throw new Exception("Unknown user"),
            },
        });

        fixture
            .Mock<IInstanceClient>()
            .Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>()))
            .ReturnsAsync(instances);
        fixture
            .Mock<IOrganizationClient>()
            .Setup(er => er.GetOrganization("123456789"))
            .ReturnsAsync(default(Organization));

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        fixture
            .Mock<IInstanceClient>()
            .Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query => query.ContainsKey("appId"))));
        fixture.Mock<IOrganizationClient>().Verify(er => er.GetOrganization("123456789"));
        fixture.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task LastChangedBy9digits_FindsOrg()
    {
        // Arrange
        using var fixture = InstancesControllerFixture.Create();
        var org = "ttd";
        var app = "unit-app";
        var instances = new List<Instance>()
        {
            new()
            {
                Id = $"{1234}/{Guid.NewGuid()}",
                LastChanged = DateTime.Now,
                LastChangedBy = "123456789",
            },
        };
        var expected = instances.Select(i => new SimpleInstance()
        {
            Id = i.Id,
            DueBefore = i.DueBefore,
            PresentationTexts = i.PresentationTexts,
            LastChanged = i.LastChanged,
            LastChangedBy = i.LastChangedBy switch
            {
                "123456789" => "Testdepartementet",
                _ => throw new Exception("Unknown user"),
            },
        });

        fixture
            .Mock<IInstanceClient>()
            .Setup(c => c.GetInstances(It.IsAny<Dictionary<string, StringValues>>()))
            .ReturnsAsync(instances);
        fixture
            .Mock<IOrganizationClient>()
            .Setup(er => er.GetOrganization("123456789"))
            .ReturnsAsync(new Organization { Name = "Testdepartementet" });

        // Act
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        var result = await controller.GetActiveInstances(org, app, 12345);

        // Assert
        var resultValue = result.Result.Should().BeOfType<OkObjectResult>().Which.Value;
        resultValue.Should().NotBeNull();
        resultValue.Should().BeEquivalentTo(expected);

        fixture
            .Mock<IInstanceClient>()
            .Verify(c => c.GetInstances(It.Is<Dictionary<string, StringValues>>(query => query.ContainsKey("appId"))));
        fixture.Mock<IOrganizationClient>().Verify(er => er.GetOrganization("123456789"));
        fixture.VerifyNoOtherCalls();
    }
}
