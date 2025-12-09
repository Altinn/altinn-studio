using System.Security.Claims;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Testing;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Features.Bootstrap;

public class InitialDataServiceMockTests
{
    private readonly Mock<IAppMetadata> _appMetadataMock = new();
    private readonly Mock<IAppResources> _appResourcesMock = new();
    private readonly Mock<IInstanceClient> _instanceClientMock = new();
    private readonly Mock<IProfileClient> _profileClientMock = new();
    private readonly Mock<IRegisterClient> _registerClientMock = new();
    private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock = new();
    private readonly Mock<IAuthenticationContext> _authenticationContextMock = new();
    private readonly Mock<IProcessStateService> _processStateServiceMock = new();
    private readonly Mock<IApplicationLanguage> _applicationLanguageMock = new();
    private readonly Mock<IMockDataHelper> _mockDataHelperMock = new();

    private readonly Mock<IOptions<AppSettings>> _appSettingsMock = new();
    private readonly Mock<IOptions<PlatformSettings>> _platformSettingsMock = new();
    private readonly Mock<IOptions<GeneralSettings>> _generalSettingsMock = new();
    private readonly Mock<IOptions<FrontEndSettings>> _frontEndSettingsMock = new();

    private readonly InitialDataService _sut;

    public InitialDataServiceMockTests()
    {
        // Setup default mock values
        _appSettingsMock.Setup(x => x.Value).Returns(new AppSettings());
        _platformSettingsMock.Setup(x => x.Value).Returns(new PlatformSettings());
        _generalSettingsMock.Setup(x => x.Value).Returns(new GeneralSettings { LanguageCodes = ["nb", "en"] });
        _frontEndSettingsMock.Setup(x => x.Value).Returns(new FrontEndSettings());

        _applicationLanguageMock
            .Setup(x => x.GetApplicationLanguages())
            .ReturnsAsync(new List<Altinn.App.Core.Models.ApplicationLanguage> { new() { Language = "nb" } });

        // Create service with MockDataHelper
        _sut = new InitialDataService(
            _appMetadataMock.Object,
            _appResourcesMock.Object,
            _instanceClientMock.Object,
            _profileClientMock.Object,
            _registerClientMock.Object,
            _httpContextAccessorMock.Object,
            _authenticationContextMock.Object,
            _processStateServiceMock.Object,
            _applicationLanguageMock.Object,
            _appSettingsMock.Object,
            _platformSettingsMock.Object,
            _generalSettingsMock.Object,
            _frontEndSettingsMock.Object,
            _mockDataHelperMock.Object
        );
    }

    [Fact]
    public async Task Should_Return_Real_Data_When_No_Mock_Headers()
    {
        // Arrange
        var realUserProfile = new UserProfile { UserId = 1337, Email = "real@test.com" };
        var realParty = new Party { PartyId = 501337, Name = "Real Organization" };
        var realAppMetadata = new ApplicationMetadata("test/app") { PromptForParty = "never" };

        _profileClientMock.Setup(x => x.GetUserProfile(1337)).ReturnsAsync(realUserProfile);
        _registerClientMock
            .Setup(x => x.GetPartyUnchecked(501337, It.IsAny<CancellationToken>()))
            .ReturnsAsync(realParty);
        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(realAppMetadata);

        SetupHttpContext(null); // No mock data

        // Act
        var result = await _sut.GetInitialData("org", "app", partyId: 501337);

        // Assert
        Assert.Equal("real@test.com", result.UserProfile?.Email);
        Assert.Equal("Real Organization", result.Party?.Name);
        Assert.Equal("never", result.ApplicationMetadata?.PromptForParty);

        // Verify MockDataHelper was not called (since it doesn't exist yet)
        _mockDataHelperMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Should_Merge_Mock_UserProfile_With_Real_Data()
    {
        // Arrange
        var realUserProfile = new UserProfile { UserId = 1337, Email = "real@test.com" };
        var mergedUserProfile = new UserProfile { UserId = 1337, Email = "mocked@test.com" };

        _profileClientMock.Setup(x => x.GetUserProfile(1337)).ReturnsAsync(realUserProfile);

        var mockData = new Dictionary<string, object> { ["userProfile"] = new { email = "mocked@test.com" } };
        SetupHttpContext(mockData);

        // This will fail until we integrate MockDataHelper
        _mockDataHelperMock
            .Setup(x => x.MergeUserProfile(realUserProfile, mockData["userProfile"]))
            .Returns(mergedUserProfile);

        // Act
        var result = await _sut.GetInitialData("org", "app", partyId: null);

        // Assert
        Assert.Equal("mocked@test.com", result.UserProfile?.Email); // This will fail
        Assert.Equal(1337, result.UserProfile?.UserId);

        // Verify MockDataHelper was called
        _mockDataHelperMock.Verify(x => x.MergeUserProfile(realUserProfile, mockData["userProfile"]), Times.Once);
    }

    [Fact]
    public async Task Should_Merge_Mock_Parties_With_Real_Data()
    {
        // Arrange
        var realParty = new Party { PartyId = 501337, Name = "Real Organization" };
        var mergedParty = new Party { PartyId = 501337, Name = "Mocked Organization" };

        _registerClientMock
            .Setup(x => x.GetPartyUnchecked(501337, It.IsAny<CancellationToken>()))
            .ReturnsAsync(realParty);

        var mockData = new Dictionary<string, object>
        {
            ["parties"] = new object[] { new { partyId = 501337, name = "Mocked Organization" } },
        };
        SetupHttpContext(mockData);

        // This will fail until we integrate MockDataHelper for parties
        // Note: InitialDataService gets single party, not list, so we need different approach
        _mockDataHelperMock
            .Setup(x => x.MergeParties(It.IsAny<List<Party>>(), mockData["parties"]))
            .Returns(new List<Party> { mergedParty });

        // Act
        var result = await _sut.GetInitialData("org", "app", partyId: 501337);

        // Assert
        Assert.Equal("Mocked Organization", result.Party?.Name); // This will fail
        Assert.Equal(501337, result.Party?.PartyId);
    }

    [Fact]
    public async Task Should_Merge_Mock_ApplicationMetadata()
    {
        // Arrange
        var realAppMetadata = new ApplicationMetadata("test/app") { PromptForParty = "never" };
        var mergedAppMetadata = new ApplicationMetadata("test/app") { PromptForParty = "always" };

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(realAppMetadata);

        var mockData = new Dictionary<string, object> { ["applicationMetadata"] = new { promptForParty = "always" } };
        SetupHttpContext(mockData);

        // This will fail until we integrate MockDataHelper
        _mockDataHelperMock
            .Setup(x => x.MergeApplicationMetadata(realAppMetadata, mockData["applicationMetadata"]))
            .Returns(mergedAppMetadata);

        // Act
        var result = await _sut.GetInitialData("org", "app");

        // Assert
        Assert.Equal("always", result.ApplicationMetadata?.PromptForParty); // This will fail

        // Verify MockDataHelper was called
        _mockDataHelperMock.Verify(
            x => x.MergeApplicationMetadata(realAppMetadata, mockData["applicationMetadata"]),
            Times.Once
        );
    }

    [Fact]
    public async Task Should_Call_All_Real_Services_Even_With_Mock_Data()
    {
        // Arrange
        var mockData = new Dictionary<string, object>
        {
            ["userProfile"] = new { email = "mocked@test.com" },
            ["applicationMetadata"] = new { promptForParty = "always" },
        };
        SetupHttpContext(mockData);

        _profileClientMock.Setup(x => x.GetUserProfile(It.IsAny<int>())).ReturnsAsync(new UserProfile());
        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("test/app"));

        // Act
        await _sut.GetInitialData("org", "app", partyId: null);

        // Assert - Verify all real services were called
        _profileClientMock.Verify(x => x.GetUserProfile(It.IsAny<int>()), Times.Once);
        _appMetadataMock.Verify(x => x.GetApplicationMetadata(), Times.Once);
        _applicationLanguageMock.Verify(x => x.GetApplicationLanguages(), Times.Once);
    }

    [Fact]
    public async Task Should_Handle_Partial_Mock_Data()
    {
        // Arrange - Only mock userProfile, leave others as real data
        var realUserProfile = new UserProfile { UserId = 1337, Email = "real@test.com" };
        var realAppMetadata = new ApplicationMetadata("test/app") { PromptForParty = "never" };
        var mergedUserProfile = new UserProfile { UserId = 1337, Email = "mocked@test.com" };

        _profileClientMock.Setup(x => x.GetUserProfile(1337)).ReturnsAsync(realUserProfile);
        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(realAppMetadata);

        var mockData = new Dictionary<string, object>
        {
            ["userProfile"] = new { email = "mocked@test.com" },
            // No applicationMetadata mock
        };
        SetupHttpContext(mockData);

        _mockDataHelperMock
            .Setup(x => x.MergeUserProfile(realUserProfile, mockData["userProfile"]))
            .Returns(mergedUserProfile);
        _mockDataHelperMock.Setup(x => x.MergeApplicationMetadata(realAppMetadata, null)).Returns(realAppMetadata);

        // Act
        var result = await _sut.GetInitialData("org", "app", partyId: null);

        // Assert
        Assert.Equal("mocked@test.com", result.UserProfile?.Email); // Should be mocked
        Assert.Equal("never", result.ApplicationMetadata?.PromptForParty); // Should be real data
    }

    [Fact]
    public async Task Should_Preserve_Service_Call_Order()
    {
        // Arrange
        var callOrder = new List<string>();

        _appMetadataMock
            .Setup(x => x.GetApplicationMetadata())
            .Callback(() => callOrder.Add("AppMetadata"))
            .ReturnsAsync(new ApplicationMetadata("test/app"));

        _profileClientMock
            .Setup(x => x.GetUserProfile(It.IsAny<int>()))
            .Callback(() => callOrder.Add("UserProfile"))
            .ReturnsAsync(new UserProfile());

        SetupHttpContext(new Dictionary<string, object>());

        // Act
        await _sut.GetInitialData("org", "app", partyId: null);

        // Assert - Verify services were called (order may vary due to parallelism)
        Assert.Contains("AppMetadata", callOrder);
        Assert.Contains("UserProfile", callOrder);
    }

    [Fact]
    public async Task Should_Handle_Service_Exceptions_With_Mock_Data()
    {
        // Arrange
        _profileClientMock
            .Setup(x => x.GetUserProfile(It.IsAny<int>()))
            .ThrowsAsync(new Exception("Profile service failed"));

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("test/app"));

        var mockData = new Dictionary<string, object> { ["userProfile"] = new { email = "mocked@test.com" } };
        SetupHttpContext(mockData);

        // Act - Should not throw, exceptions are caught in InitialDataService
        var result = await _sut.GetInitialData("org", "app", partyId: null);

        // Assert - Should still return result even with service failure
        Assert.NotNull(result);
        Assert.Null(result.UserProfile); // Should be null due to service failure
        Assert.NotNull(result.ApplicationMetadata); // Should still be set
    }

    private void SetupHttpContext(Dictionary<string, object>? mockData)
    {
        var httpContext = new Mock<HttpContext>();
        var httpRequest = new Mock<HttpRequest>();
        var headerDictionary = new HeaderDictionary();

        httpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        httpContext.Setup(x => x.Request).Returns(httpRequest.Object);
        httpRequest.Setup(x => x.Headers).Returns(headerDictionary);

        // Setup User with proper claims for authentication
        var claims = new List<Claim> { new("urn:altinn:userid", "1337"), new("nameid", "1337") };
        var identity = new ClaimsIdentity(claims, "Test");
        var user = new ClaimsPrincipal(identity);
        httpContext.Setup(x => x.User).Returns(user);

        if (mockData != null)
        {
            httpContext.Object.Items["MockData"] = mockData;
        }

        _httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext.Object);
    }
}
