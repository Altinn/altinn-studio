using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Core.Features.DataLists;
using Altinn.App.Core.Models;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.DataLists
{
    public class NullInstanceDataListProviderTest
    {
        [Fact]
        public void Constructor_InitializedWithEmptyValues()
        {
            var provider = new NullInstanceDataListProvider();

            provider.Id.Should().Be(string.Empty);
            provider.GetInstanceDataListAsync(new InstanceIdentifier(12345, Guid.NewGuid()), "nb", new Dictionary<string, string>()).Result.ListItems.Should().BeNull();
        }
    }
}
