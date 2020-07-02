using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Profile.Services.Implementation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Profile.Tests.ServiceTests
{
    public class UserProfilesWrapperTest
    {
        private readonly Mock<IOptions<GeneralSettings>> generalSettingsOptions;
        private readonly Mock<HttpMessageHandler> handlerMock;
        private readonly Mock<ILogger<UserProfilesWrapper>> logger;

        public UserProfilesWrapperTest()
        {
            generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();
            handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Loose);
            logger = new Mock<ILogger<UserProfilesWrapper>>();
        }

        /// <summary>
        /// Tests that a language string is mapped to it's orginial value.
        /// </summary>
        [Fact]
        public async Task GetUserFromId_TC01()
        {
            // Arrange
            string expectedLanguage = "ru";
            int userId = 2001607;

            HttpResponseMessage response = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(File.ReadAllText(GetUserDataPath(userId)), Encoding.UTF8, "application/json")
            };

            InitializeMocks(response);
            HttpClient httpClient = new HttpClient(handlerMock.Object);
            UserProfilesWrapper target = new UserProfilesWrapper(httpClient, logger.Object, generalSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUser(userId);

            // Assert
            handlerMock.VerifyAll();
            Assert.Equal(expectedLanguage, actual.ProfileSettingPreference.Language);
        }

        /// <summary>
        /// Tests that the SBL notation for norsk bokmål is mapped to "nb"
        /// </summary>
        [Fact]
        public async Task GetUserFromId_TC02()
        {
            // Arrange
            string expectedLanguage = "nb";
            int userId = 2001606;

            HttpResponseMessage response = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(File.ReadAllText(GetUserDataPath(userId)), Encoding.UTF8, "application/json")
            };

            InitializeMocks(response);
            HttpClient httpClient = new HttpClient(handlerMock.Object);
            UserProfilesWrapper target = new UserProfilesWrapper(httpClient, logger.Object, generalSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUser(userId);

            // Assert
            handlerMock.VerifyAll();
            Assert.Equal(expectedLanguage, actual.ProfileSettingPreference.Language);
        }

        private string GetUserDataPath(int userId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(UserProfilesWrapperTest).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @$"Testdata\Bridge\Profile\User\{userId}.json");
        }

        private void InitializeMocks(HttpResponseMessage httpResponseMessage)
        {
            GeneralSettings generalSettings = new GeneralSettings { BridgeApiEndpoint = "http://localhost/" };
            generalSettingsOptions.Setup(s => s.Value).Returns(generalSettings);

            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(httpResponseMessage)
                .Verifiable();

        }
    }
}
