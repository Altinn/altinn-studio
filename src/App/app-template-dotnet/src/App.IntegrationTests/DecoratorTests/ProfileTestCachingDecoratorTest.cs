using System.Threading.Tasks;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Infrastructure.Clients.Profile;
using Altinn.App.Core.Interface;
using Altinn.Platform.Profile.Models;

using App.IntegrationTests.Utils;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

using Moq;

using Xunit;

namespace App.IntegrationTestsRef.DecoratorTests
{
    public class ProfileTestCachingDecoratorTest
    {
        private readonly Mock<IProfile> _decoratedServiceMock = new();
        private readonly Mock<IOptions<CacheSettings>> cacheSettingsOptions;

        public ProfileTestCachingDecoratorTest()
        {
            cacheSettingsOptions = new Mock<IOptions<CacheSettings>>();
            cacheSettingsOptions.Setup(s => s.Value).Returns(new CacheSettings { ProfileCacheLifetimeSeconds = 540 });
        }

        /// <summary>
        /// Tests that the userprofile available in the cache is returned to the caller without forwarding request to decorated service.
        /// </summary>
        [Fact]
        public async Task GetUserProfileUserId_UserInCache_decoratedServiceNotCalled()
        {
            // Arrange
            const int UserId = 12345;
            MemoryCache memoryCache = new(new MemoryCacheOptions());

            var userProfile = TestDataUtil.GetProfile(UserId);
            memoryCache.Set("User_UserId_12345", userProfile);
            var target = new ProfileClientCachingDecorator(_decoratedServiceMock.Object, memoryCache, cacheSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUserProfile(UserId);

            // Assert
            _decoratedServiceMock.Verify(service => service.GetUserProfile(It.IsAny<int>()), Times.Never());
            Assert.NotNull(actual);
            Assert.Equal(UserId, actual.UserId);
        }

        /// <summary>
        /// Tests that the userprofile available in the cache is returned to the caller without forwarding request to decorated service.
        /// </summary>
        [Fact]
        public async Task GetUserProfileUserId_UserNotInCache_decoratedServiceCalledMockPopulated()
        {
            // Arrange
            const int UserId = 12345;
            MemoryCache memoryCache = new(new MemoryCacheOptions());

            var userProfile = TestDataUtil.GetProfile(UserId);
            _decoratedServiceMock.Setup(service => service.GetUserProfile(It.IsAny<int>())).ReturnsAsync(userProfile);
            var target = new ProfileClientCachingDecorator(_decoratedServiceMock.Object, memoryCache, cacheSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUserProfile(UserId);

            // Assert
            _decoratedServiceMock.Verify(service => service.GetUserProfile(It.IsAny<int>()), Times.Once());

            Assert.NotNull(actual);
            Assert.Equal(UserId, actual.UserId);
            Assert.True(memoryCache.TryGetValue("User_UserId_12345", out UserProfile _));
        }

        /// <summary>
        /// Tests that if the result from decorated service is null, nothing is stored in cache and the null object returned to caller.
        /// </summary>
        [Fact]
        public async Task GetUserProfileUserUserId_NullFromDecoratedService_CacheNotPopulated()
        {
            // Arrange
            const int UserId = 12345;
            MemoryCache memoryCache = new(new MemoryCacheOptions());

            _decoratedServiceMock.Setup(service => service.GetUserProfile(It.IsAny<int>())).ReturnsAsync((UserProfile)null);
            var target = new ProfileClientCachingDecorator(_decoratedServiceMock.Object, memoryCache, cacheSettingsOptions.Object);

            // Act
            UserProfile actual = await target.GetUserProfile(UserId);

            // Assert
            _decoratedServiceMock.Verify(service => service.GetUserProfile(It.IsAny<int>()), Times.Once());
            Assert.Null(actual);
            Assert.False(memoryCache.TryGetValue("User_UserId_12345", out UserProfile _));
        }
    }
}
