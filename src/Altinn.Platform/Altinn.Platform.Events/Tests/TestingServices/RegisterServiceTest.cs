using Altinn.Platform.Events.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;
using System.Net.Http;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Platform.Events.Tests.TestingServices
{
    public class RegisterServiceTest
    {
        private readonly Mock<IOptions<PlatformSettings>> _platformSettingsOptions;
        private readonly Mock<IOptions<GeneralSettings>> _generalSettingsOptions;
        private readonly Mock<HttpMessageHandler> _handlerMock;
        private readonly Mock<IHttpContextAccessor> _contextAccessor;

        public RegisterServiceTest()
        {
            _platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
            _generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();
            _handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            _contextAccessor = new Mock<IHttpContextAccessor>();
        }

        [Fact]
        public async Task PartyLookup_MatchFound_IdReturned()
        {
            // Arrange

            // Act

            // Assert
        }

        [Fact]
        public async Task PartyLookup_ResponseIsNotSuccessful_PlatformExceptioThrown()
        {
        }
    }
}
