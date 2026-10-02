using System.Net;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class HomeControllerTestPartySelection : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";

    private readonly Mock<IAuthorizationClient> _authorizationClientMock = new(MockBehavior.Strict);

    public HomeControllerTestPartySelection(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_authorizationClientMock.Object);
            services.AddSingleton(
                AppFilesMutationHook.ApplicationMetadata(appMetadata =>
                {
                    appMetadata.PartyTypesAllowed = new PartyTypesAllowed
                    {
                        Person = true,
                        Organisation = true,
                        SubUnit = true,
                        BankruptcyEstate = true,
                    };
                })
            );
        };
    }

    [Fact]
    public async Task Index_InvalidParty_RedirectsToPartySelection403()
    {
        // Arrange: user 1337 with selected party 500600 that validation rejects
        int userId = 1337;
        int userPartyId = 501337;
        int selectedPartyId = 500600;

        _authorizationClientMock
            .Setup(a =>
                a.ValidateSelectedParty(
                    userId,
                    selectedPartyId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(false);
        _authorizationClientMock
            .Setup(a => a.GetPartyList(userId, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new List<Party>
                {
                    new()
                    {
                        PartyId = userPartyId,
                        PartyTypeName = PartyType.Person,
                        Name = "Sophie Salt",
                    },
                    new()
                    {
                        PartyId = selectedPartyId,
                        PartyTypeName = PartyType.Organisation,
                        Name = "Some Org",
                    },
                }
            );

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);

        // Set a selected party cookie to a party the user cannot represent
        client.DefaultRequestHeaders.Add("Cookie", $"AltinnPartyId={selectedPartyId}");

        // Act
        var response = await client.GetAsync($"{Org}/{App}/");

        // Assert
        OutputHelper.WriteLine($"Status: {response.StatusCode}");
        OutputHelper.WriteLine($"Location: {response.Headers.Location}");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Contains("party-selection/403", response.Headers.Location?.ToString() ?? "");
    }

    [Fact]
    public async Task Index_PromptForPartyAlways_MultipleParties_RedirectsToPartySelectionExplained()
    {
        // Arrange: multiple parties, promptForParty = "always"
        int userId = 1337;
        int userPartyId = 501337;

        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(
                AppFilesMutationHook.ApplicationMetadata(appMetadata =>
                {
                    appMetadata.PromptForParty = "always";
                })
            );
        };

        _authorizationClientMock
            .Setup(a =>
                a.ValidateSelectedParty(
                    userId,
                    userPartyId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);
        _authorizationClientMock
            .Setup(a => a.GetPartyList(userId, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new List<Party>
                {
                    new()
                    {
                        PartyId = userPartyId,
                        PartyTypeName = PartyType.Person,
                        Name = "Sophie Salt",
                    },
                    new()
                    {
                        PartyId = 500600,
                        PartyTypeName = PartyType.Organisation,
                        Name = "Some Org",
                    },
                }
            );

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);

        // Act
        var response = await client.GetAsync($"{Org}/{App}/");

        // Assert
        OutputHelper.WriteLine($"Status: {response.StatusCode}");
        OutputHelper.WriteLine($"Location: {response.Headers.Location}");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Contains("party-selection/explained", response.Headers.Location?.ToString() ?? "");
    }

    [Fact]
    public async Task Index_MultipleParties_NoPreference_RedirectsToPartySelectionExplained()
    {
        // Arrange: multiple parties, no promptForParty setting, user 2001 has doNotPromptForParty=false
        int userId = 2001;
        int userPartyId = 512001;

        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(
                AppFilesMutationHook.ApplicationMetadata(appMetadata =>
                {
                    // No promptForParty set (default)
                    appMetadata.PromptForParty = null;
                })
            );
        };

        _authorizationClientMock
            .Setup(a =>
                a.ValidateSelectedParty(
                    userId,
                    userPartyId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);
        _authorizationClientMock
            .Setup(a => a.GetPartyList(userId, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new List<Party>
                {
                    new()
                    {
                        PartyId = userPartyId,
                        PartyTypeName = PartyType.Person,
                        Name = "Test Bruker",
                    },
                    new()
                    {
                        PartyId = 500600,
                        PartyTypeName = PartyType.Organisation,
                        Name = "Some Org",
                    },
                }
            );

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);

        // Act
        var response = await client.GetAsync($"{Org}/{App}/");

        // Assert
        OutputHelper.WriteLine($"Status: {response.StatusCode}");
        OutputHelper.WriteLine($"Location: {response.Headers.Location}");

        // Should redirect because: multiple parties, no preference set, user 2001 has doNotPromptForParty=false
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Contains("party-selection/explained", response.Headers.Location?.ToString() ?? "");
    }

    [Fact]
    public async Task Index_SingleValidParty_NoRedirect()
    {
        // Arrange: only one valid party
        int userId = 1337;
        int userPartyId = 501337;

        SendAsync = _ =>
            Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"orgs":{}}""", System.Text.Encoding.UTF8, "application/json"),
                }
            );

        _authorizationClientMock
            .Setup(a =>
                a.ValidateSelectedParty(
                    userId,
                    userPartyId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);
        _authorizationClientMock
            .Setup(a => a.GetPartyList(userId, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new List<Party>
                {
                    new()
                    {
                        PartyId = userPartyId,
                        PartyTypeName = PartyType.Person,
                        Name = "Sophie Salt",
                    },
                }
            );

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);

        // Act
        var response = await client.GetAsync($"{Org}/{App}/");

        // Assert
        OutputHelper.WriteLine($"Status: {response.StatusCode}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Index_PromptForPartyNever_MultipleParties_NoRedirect()
    {
        // Arrange: multiple parties but promptForParty = "never"
        int userId = 1337;
        int userPartyId = 501337;

        SendAsync = _ =>
            Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"orgs":{}}""", System.Text.Encoding.UTF8, "application/json"),
                }
            );

        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(
                AppFilesMutationHook.ApplicationMetadata(appMetadata =>
                {
                    appMetadata.PromptForParty = "never";
                })
            );
        };

        _authorizationClientMock
            .Setup(a =>
                a.ValidateSelectedParty(
                    userId,
                    userPartyId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);
        _authorizationClientMock
            .Setup(a => a.GetPartyList(userId, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new List<Party>
                {
                    new()
                    {
                        PartyId = userPartyId,
                        PartyTypeName = PartyType.Person,
                        Name = "Sophie Salt",
                    },
                    new()
                    {
                        PartyId = 500600,
                        PartyTypeName = PartyType.Organisation,
                        Name = "Some Org",
                    },
                }
            );

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);

        // Act
        var response = await client.GetAsync($"{Org}/{App}/");

        // Assert
        OutputHelper.WriteLine($"Status: {response.StatusCode}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Index_DoNotPromptForPartyPreference_MultipleParties_NoRedirect()
    {
        // Arrange: multiple parties, user 1337 has doNotPromptForParty=true in profile
        int userId = 1337;
        int userPartyId = 501337;

        SendAsync = _ =>
            Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"orgs":{}}""", System.Text.Encoding.UTF8, "application/json"),
                }
            );

        _authorizationClientMock
            .Setup(a =>
                a.ValidateSelectedParty(
                    userId,
                    userPartyId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);
        _authorizationClientMock
            .Setup(a => a.GetPartyList(userId, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new List<Party>
                {
                    new()
                    {
                        PartyId = userPartyId,
                        PartyTypeName = PartyType.Person,
                        Name = "Sophie Salt",
                    },
                    new()
                    {
                        PartyId = 500600,
                        PartyTypeName = PartyType.Organisation,
                        Name = "Some Org",
                    },
                }
            );

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);

        // Act
        var response = await client.GetAsync($"{Org}/{App}/");

        // Assert
        OutputHelper.WriteLine($"Status: {response.StatusCode}");

        // User 1337 has doNotPromptForParty=true, so should not redirect
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Index_ZeroAllowedParties_RedirectsToPartySelection403()
    {
        // Arrange: user has parties but none match the app's allowed party types
        int userId = 1337;
        int userPartyId = 501337;

        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(
                AppFilesMutationHook.ApplicationMetadata(appMetadata =>
                {
                    appMetadata.PartyTypesAllowed = new PartyTypesAllowed
                    {
                        Person = false,
                        Organisation = true,
                        SubUnit = false,
                        BankruptcyEstate = false,
                    };
                })
            );
        };

        _authorizationClientMock
            .Setup(a =>
                a.ValidateSelectedParty(
                    userId,
                    userPartyId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);
        _authorizationClientMock
            .Setup(a => a.GetPartyList(userId, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new List<Party>
                {
                    new()
                    {
                        PartyId = userPartyId,
                        PartyTypeName = PartyType.Person,
                        Name = "Sophie Salt",
                    },
                }
            );

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);

        // Act
        var response = await client.GetAsync($"{Org}/{App}/");

        // Assert
        OutputHelper.WriteLine($"Status: {response.StatusCode}");
        OutputHelper.WriteLine($"Location: {response.Headers.Location}");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Contains("party-selection/403", response.Headers.Location?.ToString() ?? "");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(null)]
    public async Task Index_InstanceRoute_InvalidParty_RedirectsToPartySelection403(bool? canRepresent)
    {
        // Arrange: user 1337 opens an instance link with a selected party that validation rejects or cannot confirm
        int userId = 1337;
        int userPartyId = 501337;
        int selectedPartyId = 500600;
        SetupInvalidSelectedParty(userId, userPartyId, selectedPartyId, canRepresent);

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);
        client.DefaultRequestHeaders.Add("Cookie", $"AltinnPartyId={selectedPartyId}");

        // Act
        var response = await client.GetAsync($"{Org}/{App}/instance/{userPartyId}/{Guid.NewGuid()}/Task_1/form");

        // Assert
        OutputHelper.WriteLine($"Status: {response.StatusCode}");
        OutputHelper.WriteLine($"Location: {response.Headers.Location}");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Contains("party-selection/403", response.Headers.Location?.ToString() ?? "");
    }

    [Fact]
    public async Task Index_InstanceRoute_MultipleValidParties_NoRedirect()
    {
        // Arrange: a user with several parties opens an instance link while representing themselves
        int userId = 1337;
        int userPartyId = 501337;
        StubOrgData();

        _authorizationClientMock
            .Setup(a => a.GetPartyList(userId, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new List<Party>
                {
                    new()
                    {
                        PartyId = userPartyId,
                        PartyTypeName = PartyType.Person,
                        Name = "Sophie Salt",
                    },
                    new()
                    {
                        PartyId = 500600,
                        PartyTypeName = PartyType.Organisation,
                        Name = "Some Org",
                    },
                }
            );

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);

        // Act
        var response = await client.GetAsync($"{Org}/{App}/instance/{userPartyId}/{Guid.NewGuid()}/Task_1/form");

        // Assert: an instance already belongs to a party, so the user is not asked to choose one
        OutputHelper.WriteLine($"Status: {response.StatusCode}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(null)]
    public async Task PartySelection403_InvalidParty_DoesNotExposeSelectedParty(bool? canRepresent)
    {
        // Arrange: the party selection page is shown while the cookie still holds a party the user cannot represent
        int userId = 1337;
        int userPartyId = 501337;
        int selectedPartyId = 500600;
        StubOrgData();
        SetupInvalidSelectedParty(userId, userPartyId, selectedPartyId, canRepresent);

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);
        client.DefaultRequestHeaders.Add("Cookie", $"AltinnPartyId={selectedPartyId}");

        // Act
        var response = await client.GetAsync($"{Org}/{App}/party-selection/403");
        var html = await response.Content.ReadAsStringAsync();

        // Assert: the page renders, and carries no details of the party the user has no access to
        OutputHelper.WriteLine($"Status: {response.StatusCode}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain($"{selectedPartyId}", html);
    }

    [Fact]
    public async Task Index_StatelessAnonymousApp_InstanceRoute_InvalidParty_RedirectsToPartySelection403()
    {
        // Arrange: a stateless app that allows anonymous users, where a logged-in user opens an instance link
        // with a selected party that validation rejects
        int userId = 1337;
        int userPartyId = 501337;
        int selectedPartyId = 500600;
        OverrideServicesForThisTest = ConfigureStatelessAnonymousApp;
        SetupInvalidSelectedParty(userId, userPartyId, selectedPartyId, canRepresent: false);

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);
        client.DefaultRequestHeaders.Add("Cookie", $"AltinnPartyId={selectedPartyId}");

        // Act
        var response = await client.GetAsync($"{Org}/{App}/instance/{userPartyId}/{Guid.NewGuid()}/Task_1/form");

        // Assert
        OutputHelper.WriteLine($"Status: {response.StatusCode}");
        OutputHelper.WriteLine($"Location: {response.Headers.Location}");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Contains("party-selection/403", response.Headers.Location?.ToString() ?? "");
    }

    [Fact]
    public async Task Index_StatelessAnonymousApp_InvalidParty_NoRedirect()
    {
        // Arrange: the anonymous stateless form itself is shown without asking for a party
        int userId = 1337;
        int userPartyId = 501337;
        int selectedPartyId = 500600;
        StubOrgData();
        OverrideServicesForThisTest = ConfigureStatelessAnonymousApp;
        SetupInvalidSelectedParty(userId, userPartyId, selectedPartyId, canRepresent: false);

        using var client = GetRootedUserClient(Org, App, userId, userPartyId);
        client.DefaultRequestHeaders.Add("Cookie", $"AltinnPartyId={selectedPartyId}");

        // Act
        var response = await client.GetAsync($"{Org}/{App}/");
        var html = await response.Content.ReadAsStringAsync();

        // Assert: no redirect, and still no details of the party the user has no access to
        OutputHelper.WriteLine($"Status: {response.StatusCode}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain($"{selectedPartyId}", html);
    }

    private static void ConfigureStatelessAnonymousApp(IServiceCollection services)
    {
        services.AddSingleton(
            AppFilesMutationHook.ApplicationMetadata(appMetadata =>
            {
                appMetadata.OnEntry = new OnEntry { Show = "Task_1" };
                appMetadata.DataTypes.Find(d => d.Id == "default")!.AppLogic!.AllowAnonymousOnStateless = true;
            })
        );
    }

    private void StubOrgData()
    {
        SendAsync = _ =>
            Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"orgs":{}}""", System.Text.Encoding.UTF8, "application/json"),
                }
            );
    }

    private void SetupInvalidSelectedParty(int userId, int userPartyId, int selectedPartyId, bool? canRepresent)
    {
        _authorizationClientMock
            .Setup(a =>
                a.ValidateSelectedParty(
                    userId,
                    selectedPartyId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(canRepresent);
        _authorizationClientMock
            .Setup(a => a.GetPartyList(userId, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new List<Party>
                {
                    new()
                    {
                        PartyId = userPartyId,
                        PartyTypeName = PartyType.Person,
                        Name = "Sophie Salt",
                    },
                }
            );
    }
}
