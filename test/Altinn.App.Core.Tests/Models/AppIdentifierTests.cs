using System;
using Altinn.App.Core.Models;
using FluentAssertions;
using Xunit;

#pragma warning disable CA1806 // Do not ignore method results

namespace Altinn.App.PlatformServices.Tests.Models
{
    public class AppIdentifierTests
    {
        [Fact]
        public void Constructor_AppId_ShouldReturnValidInstance()
        {
            var org = "ttd";
            var app = "test-app";
            var appId = $"{org}/{app}";
            
            var appIdentifier = new AppIdentifier(appId);

            appIdentifier.Org.Should().Be(org);
            appIdentifier.App.Should().Be(app);
            appIdentifier.ToString().Should().Be(appId);
        }

        [Theory]
        [InlineData("ttd//test-app")]
        [InlineData("ttd\\test-app")]
        [InlineData("test-app")]
        public void Constructor_AppId_ShouldThrowException(string appId)
        {
            Action action = () => new AppIdentifier(appId);

            action.Should().Throw<ArgumentException>();
        }

        [Fact]
        public void Constructor_OrgApp_ShouldReturnValidInstance()
        {
            var org = "ttd";
            var app = "test-app";
            var appId = $"{org}/{app}";

            var appIdentifier = new AppIdentifier(org, app);

            appIdentifier.Org.Should().Be(org);
            appIdentifier.App.Should().Be(app);
            appIdentifier.ToString().Should().Be(appId);
        }

        [Theory]
        [InlineData("ttd", null)]
        [InlineData(null, "test-app")]
        public void Constructor_Null_ShouldThrowException(string org, string app)
        {
            Action action = () => new AppIdentifier(org, app);

            action.Should().Throw<ArgumentNullException>();
        }

        [Fact]
        public void Constructor_NullAppId_ShouldThrowException()
        {
            Action action = () => new AppIdentifier(null);

            action.Should().Throw<ArgumentNullException>();
        }

        [Fact]
        public void Constructor_Equals_ShouldBeEqual()
        {
            var org = "ttd";
            var app = "test-app";

            var appIdentifier1 = new AppIdentifier(org, app);
            var appIdentifier2 = new AppIdentifier(org, app);

            appIdentifier1.Should().BeEquivalentTo(appIdentifier2);
            appIdentifier1.GetHashCode().Should().Be(appIdentifier2.GetHashCode());
        }
    }

    #pragma warning restore CA1806 // Do not ignore method results
}
