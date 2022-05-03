using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using System.Linq;
using Xunit;

namespace Altinn.Platform.Storage.Interface.Tests
{
    public class ApplicationTests
    {
        [Fact]
        public void MetadataWithoutAllowAnonymous_ShouldBeFalse()
        {
            Application applicationBefore = TestdataHelper.LoadDataFromEmbeddedResourceAsType<Application>("AllowAnonymousOnStateless.applicationMetadata_beforeChange.json");

            applicationBefore.DataTypes.Where(d => d.Id == "Veileder").First().AppLogic.AllowAnonymousOnStateless.Should().BeFalse();
        }

        [Fact]
        public void MetadataWithAllowAnonymous_ShouldBeTrue()
        {
            Application applicationBefore = TestdataHelper.LoadDataFromEmbeddedResourceAsType<Application>("AllowAnonymousOnStateless.applicationMetadata_afterChange.json");

            applicationBefore.DataTypes.Where(d => d.Id == "Veileder").First().AppLogic.AllowAnonymousOnStateless.Should().BeTrue();
        }
    }
}
