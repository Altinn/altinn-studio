using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Profile.Services.Implementation;
using Altinn.Platform.Profile.Tests.Mocks;
using Altinn.Platform.Profile.Tests.Testdata;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;

using Xunit;

namespace Altinn.Platform.Profile.Tests.UnitTests
{
    public class UserProfilesWrapperTest
    {
        private readonly Mock<IOptions<GeneralSettings>> generalSettingsOptions;
        private readonly Mock<ILogger<UserProfilesWrapper>> logger;

        public UserProfilesWrapperTest()
        {
            generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();

            GeneralSettings generalSettings = new GeneralSettings { BridgeApiEndpoint = "http://localhost/" };
            generalSettingsOptions.Setup(s => s.Value).Returns(generalSettings);

            logger = new Mock<ILogger<UserProfilesWrapper>>();
        }

        /// <summary>
        /// Tests that a language string is mapped to it's orginial value.
        /// </summary>
        [Fact]
        public async Task GetUserFromId_TC01()
        {
            // Arrange
            const int UserId = 2001607;

            HttpRequestMessage sblRequest = null;
            DelegatingHandlerStub messageHandler = new(async (HttpRequestMessage request, CancellationToken token) =>
            {
                sblRequest = request;

                UserProfile userProfile = await TestDataLoader.Load<UserProfile>(UserId.ToString());
                return new HttpResponseMessage() { Content = JsonContent.Create(userProfile) };
            });

            HttpClient httpClient = new HttpClient(messageHandler);
            UserProfilesWrapper target = new UserProfilesWrapper(httpClient, logger.Object, generalSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUser(UserId);

            // Assert
            Assert.NotNull(sblRequest);
            Assert.Equal(HttpMethod.Get, sblRequest.Method);
            Assert.EndsWith($"users/{UserId}", sblRequest.RequestUri.ToString());

            Assert.Equal("ru", actual.ProfileSettingPreference.Language);
        }

        /// <summary>
        /// Tests that the SBL notation for norsk bokmål is mapped to "nb"
        /// </summary>
        [Fact]
        public async Task GetUserFromId_TC02()
        {
            // Arrange
            const int UserId = 2001606;

            HttpRequestMessage sblRequest = null;
            DelegatingHandlerStub messageHandler = new(async (HttpRequestMessage request, CancellationToken token) =>
            {
                sblRequest = request;

                UserProfile userProfile = await TestDataLoader.Load<UserProfile>(UserId.ToString());
                return new HttpResponseMessage() { Content = JsonContent.Create(userProfile) };
            });

            HttpClient httpClient = new HttpClient(messageHandler);
            UserProfilesWrapper target = new UserProfilesWrapper(httpClient, logger.Object, generalSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUser(UserId);

            // Assert
            Assert.NotNull(sblRequest);
            Assert.Equal(HttpMethod.Get, sblRequest.Method);
            Assert.EndsWith($"users/{UserId}", sblRequest.RequestUri.ToString());

            Assert.Equal("nb", actual.ProfileSettingPreference.Language);
        }
    }
}
