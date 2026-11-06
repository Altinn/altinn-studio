using System.Security.Cryptography;
using System.Text;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Tests.Sessions;

public sealed class SessionIdTests
{
    [Fact]
    public void New_Makes128BitsOfLowercaseHex()
    {
        SessionId sessionId = SessionId.New();

        Assert.Matches("^[0-9a-f]{32}$", sessionId.Value);
        Assert.NotEqual(sessionId, SessionId.New());
    }

    [Fact]
    public void TryParse_AcceptsWhatNewMakes()
    {
        SessionId sessionId = SessionId.New();

        Assert.True(SessionId.TryParse(sessionId.Value, out SessionId parsed));
        Assert.Equal(sessionId, parsed);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("0123456789abcdef0123456789abcde")]
    [InlineData("0123456789abcdef0123456789abcdef0")]
    [InlineData("0123456789ABCDEF0123456789ABCDEF")]
    [InlineData("0123456789abcdef0123456789abcdeg")]
    [InlineData("01234567-89ab-cdef-0123-456789abcd")]
    public void TryParse_RefusesAnythingElse(string? value)
    {
        Assert.False(SessionId.TryParse(value, out _));
    }

    [Fact]
    public void StorageKey_IsAHashOfTheId()
    {
        SessionId sessionId = SessionId.New();

        string expected = Convert.ToHexStringLower(SHA256.HashData(Encoding.ASCII.GetBytes(sessionId.Value)));
        Assert.Equal(expected, sessionId.StorageKey);
        Assert.DoesNotContain(sessionId.Value, sessionId.StorageKey, StringComparison.Ordinal);
    }
}
