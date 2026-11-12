using Altinn.Studio.Common.App;
using Xunit;

namespace Altinn.Studio.Common.Tests.App;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed class CommitShaTests
{
    [Theory]
    [InlineData("99762623050c7f285f63a62600e71a24f9c8c704", "99762623050c7f285f63a62600e71a24f9c8c704")]
    [InlineData("99762623050C7F285F63A62600E71A24F9C8C704", "99762623050c7f285f63a62600e71a24f9c8c704")]
    [InlineData("99762623050c7f285f63a62600e71a24f9c8c70", null)]
    [InlineData("99762623050c7f285f63a62600e71a24f9c8c7044", null)]
    [InlineData("g9762623050c7f285f63a62600e71a24f9c8c704", null)]
    [InlineData("../../../../../../../../../../../etc/pas", null)]
    [InlineData("1234567890123456789012345678901234567890123456789012345678901234", null)]
    [InlineData("main", null)]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void TryParse_IsFortyHexDigitsInLowerCase(string? value, string? expected)
    {
        Assert.Equal(expected is not null, CommitSha.TryParse(value, out CommitSha commit));
        Assert.Equal(expected ?? string.Empty, commit.ToString());
        if (expected is not null)
        {
            Assert.Equal(expected, commit.Value);
            Assert.Equal(expected.Substring(0, 7), commit.Abbreviated);
        }
    }

    [Fact]
    public void Parse_ThrowsOnAnythingElse()
    {
        Assert.Throws<System.ArgumentException>(() => CommitSha.Parse("main"));
    }
}
