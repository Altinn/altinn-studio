#nullable disable
using Altinn.App.Core.Extensions;

namespace Altinn.App.PlatformServices.Tests.Extensions;

public class StringExtensionTests
{
    [Theory]
    [InlineData(
        "http://local.altinn.cloud/dihe/redusert-foreldrebetaling-bhg/#/instance/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643",
        '/'
    )]
    [InlineData("/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '/')]
    [InlineData("510002/4fdbcec8-3e71-43de-862a-0d8098fa0643/", '/')]
    [InlineData("//", '/')]
    public void ContainsMoreThanOne_MoreThanOne_ShouldReturnTrue(string s, char c)
    {
        Assert.True(s.ContainsMoreThanOne(c));
    }

    [Theory]
    [InlineData(
        "http://local.altinn.cloud/dihe/redusert-foreldrebetaling-bhg/#/instance/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643",
        ':'
    )]
    [InlineData("/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", ':')]
    [InlineData("510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '/')]
    [InlineData("/", '/')]
    public void ContainsMoreThanOne_One_ShouldReturnFalse(string s, char c)
    {
        Assert.False(s.ContainsMoreThanOne(c));
    }

    [Theory]
    [InlineData(
        "http://local.altinn.cloud/dihe/redusert-foreldrebetaling-bhg/#/instance/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643",
        '_'
    )]
    [InlineData("/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '_')]
    [InlineData("510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '\\')]
    [InlineData("", '/')]
    public void ContainsMoreThanOne_Zero_ShouldReturnFalse(string s, char c)
    {
        Assert.False(s.ContainsMoreThanOne(c));
    }

    [Theory]
    [InlineData(
        "http://local.altinn.cloud/dihe/redusert-foreldrebetaling-bhg/#/instance/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643",
        '/'
    )]
    [InlineData("/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '/')]
    [InlineData("510002/4fdbcec8-3e71-43de-862a-0d8098fa0643/", '/')]
    [InlineData("//", '/')]
    public void ContainsExactlyOne_MoreThanOne_ShouldReturnFalse(string s, char c)
    {
        Assert.False(s.ContainsExactlyOne(c));
    }

    [Theory]
    [InlineData(
        "http://local.altinn.cloud/dihe/redusert-foreldrebetaling-bhg/#/instance/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643",
        ':'
    )]
    [InlineData("510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '/')]
    [InlineData("510002\\4fdbcec8-3e71-43de-862a-0d8098fa0643", '\\')]
    [InlineData("/", '/')]
    public void ContainsExactlyOne_One_ShouldReturnTrue(string s, char c)
    {
        Assert.True(s.ContainsExactlyOne(c));
    }

    [Theory]
    [InlineData(
        "http://local.altinn.cloud/dihe/redusert-foreldrebetaling-bhg/#/instance/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643",
        '_'
    )]
    [InlineData("/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '_')]
    [InlineData("510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '\\')]
    [InlineData("", '/')]
    public void ContainsExactlyOne_Zero_ShouldReturnFalse(string s, char c)
    {
        Assert.False(s.ContainsExactlyOne(c));
    }

    [Theory]
    [InlineData(
        "http://local.altinn.cloud/dihe/redusert-foreldrebetaling-bhg/#/instance/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643",
        '/'
    )]
    [InlineData("/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '/')]
    [InlineData("510002/4fdbcec8-3e71-43de-862a-0d8098fa0643/", '/')]
    [InlineData("//", '/')]
    public void DoesNotContain_MoreThanOne_ShouldReturnFalse(string s, char c)
    {
        Assert.False(s.DoesNotContain(c));
    }

    [Theory]
    [InlineData(
        "http://local.altinn.cloud/dihe/redusert-foreldrebetaling-bhg/#/instance/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643",
        ':'
    )]
    [InlineData("510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '/')]
    [InlineData("510002\\4fdbcec8-3e71-43de-862a-0d8098fa0643", '\\')]
    [InlineData("/", '/')]
    public void DoesNotContain_One_ShouldReturnFalse(string s, char c)
    {
        Assert.False(s.DoesNotContain(c));
    }

    [Theory]
    [InlineData(
        "http://local.altinn.cloud/dihe/redusert-foreldrebetaling-bhg/#/instance/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643",
        '_'
    )]
    [InlineData("/510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '_')]
    [InlineData("510002/4fdbcec8-3e71-43de-862a-0d8098fa0643", '\\')]
    [InlineData("", '/')]
    public void DoesNotContain_Zero_ShouldReturnTrue(string s, char c)
    {
        Assert.True(s.DoesNotContain(c));
    }
}
