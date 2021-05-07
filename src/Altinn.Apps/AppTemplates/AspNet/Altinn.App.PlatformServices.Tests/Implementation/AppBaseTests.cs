using System;
using Altinn.App.Services.Implementation;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation
{
    public class AppBaseTests
    {
        [Fact]
        public void InstanceId_Valid_ShouldParseCorrect()
        {
            var expectedInstanceOwnerPartyId = 123456;
            var expectedInstanceGuid = Guid.NewGuid();
            var instanceId = $"{expectedInstanceOwnerPartyId}/{expectedInstanceGuid}";

            var (actualPartyId, actualInstaceGuid) = AppBase.DeconstructInstanceId(instanceId);

            Assert.Equal(expectedInstanceOwnerPartyId, actualPartyId);
            Assert.Equal(expectedInstanceGuid, actualInstaceGuid);
        }

        [Fact]
        public void InstanceId_Invalid_ShouldThrowException()
        {
            var expectedInstanceOwnerPartyId = "a123456";
            var expectedInstanceGuid = "invalid-guid-12345-6789";
            var instanceId = $"{expectedInstanceOwnerPartyId}/{expectedInstanceGuid}";

            Assert.Throws<FormatException>(() => { (int actualInstanceOwnerPartyId, Guid actualInstaceGuid) = AppBase.DeconstructInstanceId(instanceId); });
        }
    }
}
