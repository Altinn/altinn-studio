using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Tests.Constants;

/// <summary>
/// Pins the enum members to the lowercase literals baked into the check constraints, index filters and raw
/// SQL, so a rename that only reaches one side surfaces here.
/// </summary>
public class MailboxStatusMapTests
{
    [Theory]
    [InlineData(MailboxStatus.Open, "open")]
    [InlineData(MailboxStatus.Disposed, "disposed")]
    public void Status_RoundTripsThroughItsDatabaseLiteral(MailboxStatus status, string expected)
    {
        Assert.Equal(expected, MailboxStatusMap.ToDbValue(status));
        Assert.Equal(status, MailboxStatusMap.FromDbValue(expected));
    }

    [Theory]
    [InlineData(MailboxDisposedReason.Request, "request")]
    [InlineData(MailboxDisposedReason.Deadline, "deadline")]
    public void DisposedReason_RoundTripsThroughItsDatabaseLiteral(MailboxDisposedReason reason, string expected)
    {
        Assert.Equal(expected, MailboxStatusMap.ToDbValue(reason));
        Assert.Equal(reason, MailboxStatusMap.ReasonFromDbValue(expected));
    }

    [Fact]
    public void EveryStatus_HasADatabaseLiteral()
    {
        foreach (var status in Enum.GetValues<MailboxStatus>())
            Assert.False(string.IsNullOrEmpty(MailboxStatusMap.ToDbValue(status)));
    }

    [Fact]
    public void EveryDisposedReason_HasADatabaseLiteral()
    {
        foreach (var reason in Enum.GetValues<MailboxDisposedReason>())
            Assert.False(string.IsNullOrEmpty(MailboxStatusMap.ToDbValue(reason)));
    }

    [Fact]
    public void UnknownDatabaseLiteral_Throws()
    {
        // Total over what the check constraint allows, and deliberately not over anything else.
        Assert.Throws<ArgumentOutOfRangeException>(() => MailboxStatusMap.FromDbValue("closed"));
        Assert.Throws<ArgumentOutOfRangeException>(() => MailboxStatusMap.ReasonFromDbValue("timeout"));
    }
}
