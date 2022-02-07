using System;
using Altinn.App.PlatformServices.Helpers;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Helpers
{
    public class InstanceHelperTests
    {
        [Theory]
        [InlineData("/yabbin/hvem-er-hvem/instances/512345/2539cacc-1f49-4852-907b-d184e7285a60/process/next", 512345, "2539cacc-1f49-4852-907b-d184e7285a60")]
        [InlineData(@"https://www.altinn.no/yabbin/hvem-er-hvem/instances/512345/2539cacc-1f49-4852-907b-d184e7285a60/process/next", 512345, "2539cacc-1f49-4852-907b-d184e7285a60")]
        public void Url_DecomposeInstanceParts_ShouldReturnOwnerIdAndInstaceGuid(string url, int expectedInstanceOwnerId, string expectedInstanceGuid)
        {
            var (instanceOwnerId, instanceGuid) = InstanceHelper.DeconstructInstanceIdFromUrl(url);
            Assert.Equal(expectedInstanceOwnerId, instanceOwnerId);
            Assert.Equal(expectedInstanceGuid, instanceGuid.ToString());
        }
    }
}
