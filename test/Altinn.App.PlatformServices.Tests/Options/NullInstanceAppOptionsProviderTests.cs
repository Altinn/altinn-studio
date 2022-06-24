using System;
using System.Collections.Generic;
using Altinn.App.PlatformServices.Models;
using Altinn.App.PlatformServices.Options;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Options
{
    public class NullInstanceAppOptionsProviderTests
    {
        [Fact]
        public void Constructor_InitializedWithEmptyValues()
        {
            var provider = new NullInstanceAppOptionsProvider();

            provider.Id.Should().Be(string.Empty);
            provider.GetInstanceAppOptionsAsync(new InstanceIdentifier(12345, Guid.NewGuid()), "nb", new Dictionary<string, string>()).Result.Options.Should().BeNull();
        }
    }
}
