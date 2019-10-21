using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Controllers;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    /// Testing valid names
    /// </summary>
    public class AppMetadataTests
    {
        /// <summary>
        /// Testing valid names.
        /// </summary>
        [Fact]
        public void HasValidName()
        {
            ApplicationsController appController = new ApplicationsController(null, null);

            Assert.True(appController.IsValidAppId("test/a234"));
            Assert.True(appController.IsValidAppId("sp1/ab23"));
            Assert.True(appController.IsValidAppId("multipledash/a-b-234"));

            Assert.False(appController.IsValidAppId("2orgstartswithnumber/b234"));
            Assert.False(appController.IsValidAppId("UpperCaseOrg/x234"));
            Assert.False(appController.IsValidAppId("org-with-dash/x234"));
            Assert.False(appController.IsValidAppId("morethanoneslash/a2/34"));
            Assert.False(appController.IsValidAppId("test/UpperCaseApp"));
            Assert.False(appController.IsValidAppId("testonlynumbersinapp/42"));
        }
    }
}
