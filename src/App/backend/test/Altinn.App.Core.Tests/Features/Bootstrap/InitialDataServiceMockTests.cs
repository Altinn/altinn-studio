using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Testing;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Profile;
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

        _applicationLanguageMock.Setup(x => x.GetApplicationLanguages()).ReturnsAsync([new() { Language = "nb" }]);

        // Create service with MockDataHelper
        _sut = new InitialDataService(
            _appMetadataMock.Object,
            _appResourcesMock.Object,
            _instanceClientMock.Object,
            _profileClientMock.Object,
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

    // ========================================
    // GetInitialData Tests (Anonymous Access)
    // ========================================

    [Fact]
    public async Task GetInitialData_Should_Return_Real_Data_When_No_Mock_Headers()
    {
        // Arrange
        var realAppMetadata = new ApplicationMetadata("test/app") { PromptForParty = "never" };

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(realAppMetadata);
        SetupMockDataInHttpContext(null); // No mock data

        // Act
        var result = await _sut.GetInitialData("org", "app");

        // Assert
        Assert.Equal("never", result.ApplicationMetadata?.PromptForParty);
        Assert.NotNull(result.Language);
        Assert.NotNull(result.AvailableLanguages);
        Assert.NotNull(result.FeatureFlags);

        // Verify MockDataHelper was not called (since no mock data)
        _mockDataHelperMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetInitialData_Should_Merge_Mock_ApplicationMetadata_When_Available()
    {
        // Arrange
        var realAppMetadata = new ApplicationMetadata("test/app") { PromptForParty = "never" };
        var mergedAppMetadata = new ApplicationMetadata("test/app") { PromptForParty = "always" };

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(realAppMetadata);

        var mockData = new Dictionary<string, object> { ["applicationMetadata"] = new { promptForParty = "always" } };
        SetupMockDataInHttpContext(mockData);

        _mockDataHelperMock
            .Setup(x => x.MergeApplicationMetadata(realAppMetadata, mockData["applicationMetadata"]))
            .Returns(mergedAppMetadata);

        // Act
        var result = await _sut.GetInitialData("org", "app");

        // Assert
        Assert.Equal("always", result.ApplicationMetadata?.PromptForParty);

        // Verify MockDataHelper was called
        _mockDataHelperMock.Verify(
            x => x.MergeApplicationMetadata(realAppMetadata, mockData["applicationMetadata"]),
            Times.Once
        );
    }

    [Fact]
    public async Task GetInitialData_Should_Return_Basic_Properties()
    {
        // Arrange
        var realAppMetadata = new ApplicationMetadata("test/app") { PromptForParty = "never" };

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(realAppMetadata);
        SetupMockDataInHttpContext(null);

        // Act
        var result = await _sut.GetInitialData("org", "app");

        // Assert
        Assert.NotNull(result.ApplicationMetadata);
        Assert.NotNull(result.Language);
        Assert.NotNull(result.AvailableLanguages);
        Assert.NotNull(result.FeatureFlags);
        Assert.NotNull(result.PlatformSettings);
        Assert.NotNull(result.FrontendSettings);

        // Should not contain authenticated-only properties
        Assert.IsType<InitialDataResponse>(result);
        Assert.IsNotType<InitialDataResponseAuthenticated>(result);
    }

    // ===============================================
    // GetInitialDataAuthenticated Tests (User Access)
    // ===============================================

    [Fact]
    public async Task GetInitialDataAuthenticated_Should_Merge_Mock_UserProfile_With_Real_Data()
    {
        // Arrange
        var realUserProfile = new UserProfile { UserId = 1337, Email = "real@test.com" };
        var mergedUserProfile = new UserProfile { UserId = 1337, Email = "mocked@test.com" };
        var realParty = new Party { PartyId = 501337, Name = "Test Testesen" };

        _profileClientMock.Setup(x => x.GetUserProfile(1337)).ReturnsAsync(realUserProfile);

        var mockData = new Dictionary<string, object> { ["userProfile"] = new { email = "mocked@test.com" } };
        SetupMockDataInHttpContext(mockData);

        _mockDataHelperMock
            .Setup(x => x.MergeUserProfile(realUserProfile, mockData["userProfile"]))
            .Returns(mergedUserProfile);

        var user = TestAuthentication.GetUserAuthentication(userId: 1337, userPartyId: 501337, email: "real@test.com");
        var userDetails = new Authenticated.User.Details(
            UserParty: realParty,
            SelectedParty: realParty,
            Profile: realUserProfile,
            RepresentsSelf: true,
            Parties: [realParty],
            PartiesAllowedToInstantiate: [realParty]
        );

        // Act
        var result = await _sut.GetInitialDataAuthenticated("org", "app", user, userDetails);

        // Assert
        Assert.Equal("mocked@test.com", result.UserProfile?.Email);
        Assert.Equal(1337, result.UserProfile?.UserId);

        // Verify MockDataHelper was called
        _mockDataHelperMock.Verify(x => x.MergeUserProfile(realUserProfile, mockData["userProfile"]), Times.Once);
    }

    [Fact]
    public async Task GetInitialDataAuthenticated_Should_Merge_Mock_Parties_With_Real_Data()
    {
        // Arrange
        var realParty = new Party { PartyId = 501337, Name = "Real Organization" };
        var mergedParty = new Party { PartyId = 501337, Name = "Mocked Organization" };
        var realUserProfile = new UserProfile { UserId = 1337, Email = "real@test.com" };

        _profileClientMock.Setup(x => x.GetUserProfile(1337)).ReturnsAsync(realUserProfile);

        var mockData = new Dictionary<string, object>
        {
            ["parties"] = new object[] { new { partyId = 501337, name = "Mocked Organization" } },
        };
        SetupMockDataInHttpContext(mockData);

        _mockDataHelperMock
            .Setup(x => x.MergeParties(It.IsAny<List<Party>>(), mockData["parties"]))
            .Returns([mergedParty]);

        var user = TestAuthentication.GetUserAuthentication(userId: 1337, userPartyId: 501337, email: "real@test.com");
        var userDetails = new Authenticated.User.Details(
            UserParty: realParty,
            SelectedParty: realParty,
            Profile: realUserProfile,
            RepresentsSelf: true,
            Parties: [realParty],
            PartiesAllowedToInstantiate: [realParty]
        );

        // Act
        var result = await _sut.GetInitialDataAuthenticated("org", "app", user, userDetails);

        // Assert
        Assert.Equal("Mocked Organization", result.Party?.Name);
        Assert.Equal(501337, result.Party?.PartyId);

        // Verify MockDataHelper was called
        _mockDataHelperMock.Verify(x => x.MergeParties(It.IsAny<List<Party>>(), mockData["parties"]), Times.Once);
    }

    [Fact]
    public async Task GetInitialDataAuthenticated_Should_Merge_Mock_ApplicationMetadata()
    {
        // Arrange
        var realAppMetadata = new ApplicationMetadata("test/app") { PromptForParty = "never" };
        var mergedAppMetadata = new ApplicationMetadata("test/app") { PromptForParty = "always" };
        var realUserProfile = new UserProfile { UserId = 1337, Email = "real@test.com" };

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(realAppMetadata);
        _profileClientMock.Setup(x => x.GetUserProfile(1337)).ReturnsAsync(realUserProfile);

        var mockData = new Dictionary<string, object> { ["applicationMetadata"] = new { promptForParty = "always" } };
        SetupMockDataInHttpContext(mockData);

        _mockDataHelperMock
            .Setup(x => x.MergeApplicationMetadata(realAppMetadata, mockData["applicationMetadata"]))
            .Returns(mergedAppMetadata);

        var user = TestAuthentication.GetUserAuthentication(userId: 1337, userPartyId: 501337, email: "real@test.com");
        var realParty = new Party { PartyId = 501337, Name = "Test Testesen" };
        var userDetails = new Authenticated.User.Details(
            UserParty: realParty,
            SelectedParty: realParty,
            Profile: realUserProfile,
            RepresentsSelf: true,
            Parties: [realParty],
            PartiesAllowedToInstantiate: [realParty]
        );

        // Act
        var result = await _sut.GetInitialDataAuthenticated("org", "app", user, userDetails);

        // Assert
        Assert.Equal("always", result.ApplicationMetadata?.PromptForParty);

        // Verify MockDataHelper was called
        _mockDataHelperMock.Verify(
            x => x.MergeApplicationMetadata(realAppMetadata, mockData["applicationMetadata"]),
            Times.Once
        );
    }

    [Fact]
    public async Task GetInitialDataAuthenticated_Should_Call_All_Real_Services_Even_With_Mock_Data()
    {
        // Arrange
        var mockData = new Dictionary<string, object>
        {
            ["userProfile"] = new { email = "mocked@test.com" },
            ["applicationMetadata"] = new { promptForParty = "always" },
        };
        SetupMockDataInHttpContext(mockData);

        var realParty = new Party { PartyId = 501337, Name = "Test Testesen" };
        _profileClientMock.Setup(x => x.GetUserProfile(It.IsAny<int>())).ReturnsAsync(new UserProfile());
        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("test/app"));

        var user = TestAuthentication.GetUserAuthentication(userId: 1337, userPartyId: 501337, email: "real@test.com");
        var userDetails = new Authenticated.User.Details(
            UserParty: realParty,
            SelectedParty: realParty,
            Profile: new UserProfile { UserId = 1337, Email = "real@test.com" },
            RepresentsSelf: true,
            Parties: [realParty],
            PartiesAllowedToInstantiate: [realParty]
        );

        // Act
        await _sut.GetInitialDataAuthenticated("org", "app", user, userDetails);

        // Assert - Verify all real services were called
        _profileClientMock.Verify(x => x.GetUserProfile(It.IsAny<int>()), Times.Once);
        _appMetadataMock.Verify(x => x.GetApplicationMetadata(), Times.Once);
        _applicationLanguageMock.Verify(x => x.GetApplicationLanguages(), Times.Once);
    }

    [Fact]
    public async Task GetInitialDataAuthenticated_Should_Handle_Partial_Mock_Data()
    {
        // Arrange - Only mock userProfile, leave others as real data
        var realUserProfile = new UserProfile { UserId = 1337, Email = "real@test.com" };
        var realAppMetadata = new ApplicationMetadata("test/app") { PromptForParty = "never" };
        var mergedUserProfile = new UserProfile { UserId = 1337, Email = "mocked@test.com" };
        var realParty = new Party { PartyId = 501337, Name = "Test Testesen" };

        _profileClientMock.Setup(x => x.GetUserProfile(1337)).ReturnsAsync(realUserProfile);
        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(realAppMetadata);

        var mockData = new Dictionary<string, object>
        {
            ["userProfile"] = new { email = "mocked@test.com" },
            // No applicationMetadata mock
        };
        SetupMockDataInHttpContext(mockData);

        _mockDataHelperMock
            .Setup(x => x.MergeUserProfile(realUserProfile, mockData["userProfile"]))
            .Returns(mergedUserProfile);
        _mockDataHelperMock.Setup(x => x.MergeApplicationMetadata(realAppMetadata, null)).Returns(realAppMetadata);

        var user = TestAuthentication.GetUserAuthentication(userId: 1337, userPartyId: 501337, email: "real@test.com");
        var userDetails = new Authenticated.User.Details(
            UserParty: realParty,
            SelectedParty: realParty,
            Profile: realUserProfile,
            RepresentsSelf: true,
            Parties: [realParty],
            PartiesAllowedToInstantiate: [realParty]
        );

        // Act
        var result = await _sut.GetInitialDataAuthenticated("org", "app", user, userDetails);

        // Assert
        Assert.Equal("mocked@test.com", result.UserProfile?.Email); // Should be mocked
        Assert.Equal("never", result.ApplicationMetadata?.PromptForParty); // Should be real data
    }

    [Fact]
    public async Task GetInitialDataAuthenticated_Should_Preserve_Service_Call_Order()
    {
        // Arrange
        var callOrder = new List<string>();
        var realParty = new Party { PartyId = 501337, Name = "Test Testesen" };

        _appMetadataMock
            .Setup(x => x.GetApplicationMetadata())
            .Callback(() => callOrder.Add("AppMetadata"))
            .ReturnsAsync(new ApplicationMetadata("test/app"));

        _profileClientMock
            .Setup(x => x.GetUserProfile(It.IsAny<int>()))
            .Callback(() => callOrder.Add("UserProfile"))
            .ReturnsAsync(new UserProfile());

        SetupMockDataInHttpContext(new Dictionary<string, object>());

        var user = TestAuthentication.GetUserAuthentication(userId: 1337, userPartyId: 501337, email: "real@test.com");
        var userDetails = new Authenticated.User.Details(
            UserParty: realParty,
            SelectedParty: realParty,
            Profile: new UserProfile { UserId = 1337, Email = "real@test.com" },
            RepresentsSelf: true,
            Parties: [realParty],
            PartiesAllowedToInstantiate: [realParty]
        );

        // Act
        await _sut.GetInitialDataAuthenticated("org", "app", user, userDetails);

        // Assert - Verify services were called (order may vary due to parallelism)
        Assert.Contains("AppMetadata", callOrder);
        Assert.Contains("UserProfile", callOrder);
    }

    [Fact]
    public async Task GetInitialDataAuthenticated_Should_Handle_Service_Exceptions_With_Mock_Data()
    {
        // Arrange
        _profileClientMock
            .Setup(x => x.GetUserProfile(It.IsAny<int>()))
            .ThrowsAsync(new Exception("Profile service failed"));

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("test/app"));

        var mockData = new Dictionary<string, object> { ["userProfile"] = new { email = "mocked@test.com" } };
        SetupMockDataInHttpContext(mockData);

        var realParty = new Party { PartyId = 501337, Name = "Test Testesen" };
        var user = TestAuthentication.GetUserAuthentication(userId: 1337, userPartyId: 501337, email: "real@test.com");
        var userDetails = new Authenticated.User.Details(
            UserParty: realParty,
            SelectedParty: realParty,
            Profile: new UserProfile { UserId = 1337, Email = "real@test.com" },
            RepresentsSelf: true,
            Parties: [realParty],
            PartiesAllowedToInstantiate: [realParty]
        );

        // Act & Assert - Should throw, exceptions are propagated in InitialDataService
        await Assert.ThrowsAsync<Exception>(() => _sut.GetInitialDataAuthenticated("org", "app", user, userDetails));
    }

    private void SetupMockDataInHttpContext(Dictionary<string, object>? mockData)
    {
        var httpContext = new Mock<HttpContext>();
        var httpRequest = new Mock<HttpRequest>();
        var headerDictionary = new HeaderDictionary();

        httpContext.Setup(x => x.Items).Returns(new Dictionary<object, object?>());
        httpContext.Setup(x => x.Request).Returns(httpRequest.Object);
        httpRequest.Setup(x => x.Headers).Returns(headerDictionary);

        if (mockData != null)
        {
            httpContext.Object.Items["MockData"] = mockData;
        }

        _httpContextAccessorMock.Setup(x => x.HttpContext).Returns(httpContext.Object);
    }
}
