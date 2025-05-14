using FluentAssertions;

namespace Altinn.App.Core.Tests.Internal.Linq;

public class ExtensionsTest
{
    [Fact]
    public void WhereNotNull_ReturnsOnlyNonNullItems()
    {
        var source = new List<string?> { "a", null, "b", null, "c" };
        var result = source.WhereNotNull().ToList();
        result.Should().Equal(["a", "b", "c"]);
    }

    [Fact]
    public void WhereNotNull_ThrowsArgumentNullException_WhenSourceIsNull()
    {
        List<string?>? source = null;
#pragma warning disable CS8604 // Possible null reference argument.
        Assert.Throws<ArgumentNullException>(() => source.WhereNotNull().ToList());
#pragma warning restore CS8604 // Possible null reference argument.
    }

    [Fact]
    public void IsNullOrEmpty_ReturnsTrue_WhenEnumerableIsNull()
    {
        IEnumerable<string>? source = null;
        var result = source.IsNullOrEmpty();
        result.Should().BeTrue();
    }

    [Fact]
    public void IsNullOrEmpty_ReturnsTrue_WhenEnumerableIsEmpty()
    {
        var source = new List<string>();
        var result = source.IsNullOrEmpty();
        result.Should().BeTrue();
    }

    [Fact]
    public void IsNullOrEmpty_ReturnsFalse_WhenEnumerableIsNotEmpty()
    {
        var source = new List<string> { "a" };
        var result = source.IsNullOrEmpty();
        result.Should().BeFalse();
    }
}
