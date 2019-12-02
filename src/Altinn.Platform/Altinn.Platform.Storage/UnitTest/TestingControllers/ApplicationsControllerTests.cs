using Altinn.Platform.Storage.Controllers;

using Xunit;

namespace Altinn.Platform.Storage.UnitTest.TestingControllers
{
    /// <summary>
    /// Represents a collection of unit tests of the <see cref="ApplicationsController"/>.
    /// </summary>
    public class ApplicationsControllerTests
    {
        /// <summary>
        /// Testing that the <see cref="ApplicationsController.IsValidAppId"/> operation successfully identifies valid and invalid app id values.
        /// </summary>
        [Fact]
        public void IsValidAppId_SuccessfullyIdentifiesValidAndInvalidAppIdValues()
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
