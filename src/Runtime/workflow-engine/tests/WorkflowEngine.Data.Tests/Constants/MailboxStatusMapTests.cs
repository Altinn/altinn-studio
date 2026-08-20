using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Tests.Constants;

/// <summary>
/// Pins the mailbox's two vocabularies together. The lowercase literals are baked into a check constraint, a
/// partial index filter and several raw SQL statements, so a rename that only reached the enum would leave the
/// engine writing values the database refuses — or worse, values it accepts and nothing reads back.
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
        // The parse is total over what the check constraint allows and deliberately not over anything else: a
        // literal the constraint would have refused reaching this code means the schema and the map diverged.
        Assert.Throws<ArgumentOutOfRangeException>(() => MailboxStatusMap.FromDbValue("closed"));
        Assert.Throws<ArgumentOutOfRangeException>(() => MailboxStatusMap.ReasonFromDbValue("timeout"));
    }
}
