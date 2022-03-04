using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Profile.Services.Decorators;
using Altinn.Platform.Profile.Services.Interfaces;
using Altinn.Platform.Profile.Tests.Testdata;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

using Moq;

using Xunit;

namespace Altinn.Platform.Profile.Tests.UnitTests
{
    public class UserProfileCachingDecoratorTest
    {
        private readonly Mock<IUserProfiles> _decoratedServiceMock = new();
        private readonly Mock<IOptions<GeneralSettings>> generalSettingsOptions;

        public UserProfileCachingDecoratorTest()
        {
            generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();
            generalSettingsOptions.Setup(s => s.Value).Returns(new GeneralSettings { ProfileCacheLifetimeSeconds = 600 });
        }

        /// <summary>
        /// Tests that the userprofile available in the cache is returned to the caller without forwarding request to decorated service.
        /// </summary>
        [Fact]
        public async Task GetUserUserId_UserInCache_decoratedServiceNotCalled()
        {
            // Arrange
            const int UserId = 2001607;
            MemoryCache memoryCache = new(new MemoryCacheOptions());

            var userProfile = await TestDataLoader.Load<UserProfile>(UserId.ToString());
            memoryCache.Set("User_UserId_2001607", userProfile);
            var target = new UserProfileCachingDecorator(_decoratedServiceMock.Object, memoryCache, generalSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUser(UserId);

            // Assert
            _decoratedServiceMock.Verify(service => service.GetUser(It.IsAny<int>()), Times.Never());
            Assert.NotNull(actual);
            Assert.Equal(UserId, actual.UserId);
        }

        /// <summary>
        /// Tests that the userprofile available in the cache is returned to the caller without forwarding request to decorated service.
        /// </summary>
        [Fact]
        public async Task GetUserUserId_UserNotInCache_decoratedServiceCalledMockPopulated()
        {
            // Arrange
            const int UserId = 2001607;
            MemoryCache memoryCache = new(new MemoryCacheOptions());

            var userProfile = await TestDataLoader.Load<UserProfile>(UserId.ToString());
            _decoratedServiceMock.Setup(service => service.GetUser(It.IsAny<int>())).ReturnsAsync(userProfile);
            var target = new UserProfileCachingDecorator(_decoratedServiceMock.Object, memoryCache, generalSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUser(UserId);

            // Assert
            _decoratedServiceMock.Verify(service => service.GetUser(It.IsAny<int>()), Times.Once());

            Assert.NotNull(actual);
            Assert.Equal(UserId, actual.UserId);
            Assert.True(memoryCache.TryGetValue("User_UserId_2001607", out UserProfile _));
        }

        /// <summary>
        /// Tests that if the result from decorated service is null, nothing is stored in cache and the null object returned to caller.
        /// </summary>
        [Fact]
        public async Task GetUserUserUserId_NullFromDecoratedService_CacheNotPopulated()
        {
            // Arrange
            const int UserId = 2001607;
            MemoryCache memoryCache = new(new MemoryCacheOptions());

            _decoratedServiceMock.Setup(service => service.GetUser(It.IsAny<int>())).ReturnsAsync((UserProfile)null);
            var target = new UserProfileCachingDecorator(_decoratedServiceMock.Object, memoryCache, generalSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUser(UserId);

            // Assert
            _decoratedServiceMock.Verify(service => service.GetUser(It.IsAny<int>()), Times.Once());
            Assert.Null(actual);
            Assert.False(memoryCache.TryGetValue("User_UserId_2001607", out UserProfile _));
        }

        /// <summary>
        /// Tests that the userprofile available in the cache is returned to the caller without forwarding request to decorated service.
        /// </summary>
        [Fact]
        public async Task GetUserUserSSN_UserInCache_decoratedServiceNotCalled()
        {
            // Arrange
            const string Ssn = "01025101037";
            MemoryCache memoryCache = new(new MemoryCacheOptions());

            var userProfile = await TestDataLoader.Load<UserProfile>("2001607");
            memoryCache.Set("User_SSN_01025101037", userProfile);
            var target = new UserProfileCachingDecorator(_decoratedServiceMock.Object, memoryCache, generalSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUser(Ssn);

            // Assert
            _decoratedServiceMock.Verify(service => service.GetUser(It.IsAny<string>()), Times.Never());
            Assert.NotNull(actual);
            Assert.Equal(Ssn, actual.Party.SSN);
        }

        /// <summary>
        /// Tests that the userprofile available in the cache is returned to the caller without forwarding request to decorated service.
        /// </summary>
        [Fact]
        public async Task GetUserUserSSN_UserNotInCache_decoratedServiceCalledMockPopulated()
        {
            // Arrange
            const string Ssn = "01025101037";
            MemoryCache memoryCache = new(new MemoryCacheOptions());

            var userProfile = await TestDataLoader.Load<UserProfile>("2001607");
            _decoratedServiceMock.Setup(service => service.GetUser(It.IsAny<string>())).ReturnsAsync(userProfile);

            var target = new UserProfileCachingDecorator(_decoratedServiceMock.Object, memoryCache, generalSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUser(Ssn);

            // Assert
            _decoratedServiceMock.Verify(service => service.GetUser(It.IsAny<string>()), Times.Once());
            Assert.NotNull(actual);
            Assert.Equal(Ssn, actual.Party.SSN);
            Assert.True(memoryCache.TryGetValue("User_SSN_01025101037", out UserProfile _));
        }

        /// <summary>
        /// Tests that if the result from decorated service is null, nothing is stored in cache and the null object returned to caller.
        /// </summary>
        [Fact]
        public async Task GetUserUserSSN_NullFromDecoratedService_CacheNotPopulated()
        {
            // Arrange
            const string Ssn = "01025101037";
            MemoryCache memoryCache = new(new MemoryCacheOptions());

            _decoratedServiceMock.Setup(service => service.GetUser(It.IsAny<string>())).ReturnsAsync((UserProfile)null);

            var target = new UserProfileCachingDecorator(_decoratedServiceMock.Object, memoryCache, generalSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUser(Ssn);

            // Assert
            _decoratedServiceMock.Verify(service => service.GetUser(It.IsAny<string>()), Times.Once());
            Assert.Null(actual);
            Assert.False(memoryCache.TryGetValue("User_UserId_2001607", out UserProfile _));
        }
    }
}
