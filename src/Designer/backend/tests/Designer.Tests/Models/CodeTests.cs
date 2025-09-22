#nullable enable
using Altinn.Studio.Designer.Models;
using Xunit;

namespace Designer.Tests.Models;

public class CodeTests
{
    [Fact]
    public void Equals_BothAreNull_ReturnsTrue()
    {
        // Arrange
        Code? code1 = null;
        Code? code2 = null;

        // Act
        bool result = Equals(code1, code2);
        bool result2 = code1 == code2;
        bool? result3 = code1?.Equals(code2);

        // Assert
        Assert.True(result);
        Assert.True(result2);
        Assert.Null(result3);
    }
}
