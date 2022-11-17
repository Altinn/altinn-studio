using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Core.Features.DataLists;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.DataLists
{
    public class NullDataListProviderTest
    {
        [Fact]
        public void Constructor_InitializedWithEmptyValues()
        {
            var provider = new NullDataListProvider();

            provider.Id.Should().Be(string.Empty);
            provider.GetDataListAsync("nb", new Dictionary<string, string>()).Result.ListItems.Should().BeNull();
        }
    }
}