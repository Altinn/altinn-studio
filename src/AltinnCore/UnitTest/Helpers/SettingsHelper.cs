using AltinnCore.Common.Configuration;
using Microsoft.Extensions.Options;
using Moq;

namespace AltinnCore.UnitTest.Helpers
{
    /// <summary>
    /// Helper for settings in unit tests
    /// </summary>
    public static class SettingsHelper
    {
        /// <summary>
        /// Returns a mock version of Service Repository settings
        /// </summary>
        /// <returns>The settings</returns>
        public static Moq.Mock<IOptions<ServiceRepositorySettings>> GetMoqServiceRepositorySettings()
        {
            ServiceRepositorySettings settings = new ServiceRepositorySettings();
            settings.GiteaCookieName = "i_like_gitea";
            settings.ForceGiteaAuthentication = true;
            Moq.Mock<IOptions<ServiceRepositorySettings>> moqServiceRepositorySettings = new Mock<IOptions<ServiceRepositorySettings>>();
            moqServiceRepositorySettings.Setup(r => r.Value).Returns(settings);
            return moqServiceRepositorySettings;
        }
    }
}
