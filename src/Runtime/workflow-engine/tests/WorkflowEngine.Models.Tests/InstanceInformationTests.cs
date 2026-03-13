namespace WorkflowEngine.Models.Tests;

public class InstanceInformationTests
{
    private static readonly Guid _sharedGuid = Guid.NewGuid();

    [Fact]
    public void Equals_ReturnsTrue_WithCaseInsensitiveOrgAndApp()
    {
        // Arrange
        var info1 = new InstanceInformation
        {
            Org = "TTD",
            App = "MY-APP",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = _sharedGuid,
        };
        var info2 = new InstanceInformation
        {
            Org = "ttd",
            App = "my-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = _sharedGuid,
        };

        // Act & Assert
        Assert.Equal(info1, info2);
    }

    [Fact]
    public void Equals_ReturnsFalse_WithDifferentValues()
    {
        // Arrange
        var info1 = new InstanceInformation
        {
            Org = "ttd",
            App = "app-1",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.NewGuid(),
        };
        var info2 = new InstanceInformation
        {
            Org = "ttd",
            App = "app-2",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.NewGuid(),
        };

        // Act & Assert
        Assert.NotEqual(info1, info2);
    }

    [Fact]
    public void ToString_ReturnsExpectedFormat()
    {
        // Arrange
        var guid = Guid.NewGuid();
        var info = new InstanceInformation
        {
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = guid,
        };

        // Act
        var result = info.ToString();

        // Assert
        Assert.Equal($"ttd/test-app/12345/{guid}", result);
    }

    [Fact]
    public void GetHashCode_IsConsistent_WithCaseInsensitiveEquality()
    {
        // Arrange
        var info1 = new InstanceInformation
        {
            Org = "TTD",
            App = "MY-APP",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = _sharedGuid,
        };
        var info2 = new InstanceInformation
        {
            Org = "ttd",
            App = "my-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = _sharedGuid,
        };

        // Act & Assert
        Assert.Equal(info1.GetHashCode(), info2.GetHashCode());
    }
}
