using System;
using System.Collections.Generic;
using System.Text;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Controllers;
using Altinn.Platform.Authentication.Maskinporten;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.Platform.Authentication.IntegrationTests
{
    /// <summary>
    /// blblblb
    /// </summary>
    public class OrgLookupTest
    {
        /// <summary>
        /// Tests harvest orgs
        /// </summary>
        [Fact]
        public void TestHarvestOrgs_OK()
        {
            Mock<ILogger<AuthenticationController>> loggerMock = new Mock<ILogger<AuthenticationController>>();
            Mock<IOptions<GeneralSettings>> optionsMock = new Mock<IOptions<GeneralSettings>>();
            Mock<GeneralSettings> generalSettingsMock = new Mock<GeneralSettings>();
            optionsMock
                .Setup(o => o.Value)
                .Returns(generalSettingsMock.Object);

            AuthenticationController authCont = new AuthenticationController(loggerMock.Object, optionsMock.Object, null, null);

            string org = authCont.LookupOrg("974760223");

            Assert.Equal("dibk", org);
        }
    }
}
