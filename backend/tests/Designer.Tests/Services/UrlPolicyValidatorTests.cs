using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Implementation;
using Xunit;

namespace Designer.Tests.Services
{
    public class UrlPolicyValidatorTests
    {
        [Fact]
        public void IsAllowed_WhenBlockedDomainButWildcardAllowListMatches_ShouldReturnTrue()
        {
            var validator = new UrlPolicyValidator(new UrlValidationSettings
            {
                AllowedList = ["example.com/repos/*/wwwroot/*"],
                BlockedList = ["example.com"]
            });

            bool isAllowed = validator.IsAllowed("https://example.com/repos/org-name/app-name/src/branch/master/App/wwwroot/the-image.png");

            Assert.True(isAllowed);
        }

        [Fact]
        public void IsAllowed_WhenBlockedDomainAndNoAllowList_ShouldReturnFalse()
        {
            var validator = new UrlPolicyValidator(new UrlValidationSettings
            {
                AllowedList = [],
                BlockedList = ["blocked.com"]
            });

            bool isAllowed = validator.IsAllowed("https://blocked.com/image.png");

            Assert.False(isAllowed);
        }

        [Fact]
        public void IsAllowed_WhenBlockedDomainButExplicitPathAllowed_ShouldReturnTrue()
        {
            var validator = new UrlPolicyValidator(new UrlValidationSettings
            {
                AllowedList = ["blocked.com/allowedpath"],
                BlockedList = ["blocked.com"]
            });

            bool isAllowed = validator.IsAllowed("https://blocked.com/allowedpath");

            Assert.True(isAllowed);
        }

        [Fact]
        public void IsAllowed_WhenDomainIsNotBlocked_ShouldReturnTrue()
        {
            var validator = new UrlPolicyValidator(new UrlValidationSettings
            {
                AllowedList = [],
                BlockedList = ["blocked.com"]
            });

            bool isAllowed = validator.IsAllowed("https://otherdomain.com/image.png");

            Assert.True(isAllowed);
        }

        [Fact]
        public void IsAllowed_WhenNoBlockedOrAllowedDomains_ShouldReturnTrueForAnyDomain()
        {
            var validator = new UrlPolicyValidator(new UrlValidationSettings
            {
                AllowedList = [],
                BlockedList = []
            });

            bool isAllowed = validator.IsAllowed("https://anydomain.com/image.png");

            Assert.True(isAllowed);
        }

        [Fact]
        public void IsAllowed_WhenWildcardAllowListMatchesPath_ShouldRespectWildcard()
        {
            var validator = new UrlPolicyValidator(new UrlValidationSettings
            {
                AllowedList = ["example.com/wwwroot*"],
                BlockedList = ["example.com"]
            });

            bool isAllowedForAllowedPath = validator.IsAllowed("https://example.com/wwwroot/file1.png");
            bool isAllowedForBlockedPath = validator.IsAllowed("https://example.com/other/file2.png");

            Assert.True(isAllowedForAllowedPath);
            Assert.False(isAllowedForBlockedPath);
        }

        [Fact]
        public void IsAllowed_WhenSubdomainOfBlockedDomain_ShouldBeBlocked()
        {
            var validator = new UrlPolicyValidator(new UrlValidationSettings
            {
                AllowedList = [],
                BlockedList = ["example.com"]
            });

            bool isAllowed = validator.IsAllowed("https://sub.example.com/image.png");

            Assert.False(isAllowed);
        }

        [Fact]
        public void IsAllowed_WhenSubdomainIsExplicitlyAllowed_ShouldReturnTrue()
        {
            var validator = new UrlPolicyValidator(new UrlValidationSettings
            {
                AllowedList = ["sub.example.com/allowedpath*"],
                BlockedList = ["example.com"]
            });

            bool isAllowed = validator.IsAllowed("https://sub.example.com/allowedpath/image.png");

            Assert.True(isAllowed);
        }
    }
}
