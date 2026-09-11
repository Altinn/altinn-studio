using Altinn.App.Core.Features.Signing.Helpers;

namespace Altinn.App.Core.Tests.Features.Signing.Helpers;

public class SigningIdempotencyKeyTests
{
    private static readonly Guid WorkflowId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid StepId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private const string SigneeIdentity = "33333333-3333-3333-3333-333333333333";

    [Fact]
    public void ForCallToAction_EqualInputs_ProduceTheSameKey()
    {
        Guid first = SigningIdempotencyKey.ForCallToAction(WorkflowId, StepId, SigneeIdentity);
        Guid second = SigningIdempotencyKey.ForCallToAction(WorkflowId, StepId, SigneeIdentity);

        Assert.Equal(first, second);
    }

    [Fact]
    public void ForCallToAction_DifferentWorkflowId_ProducesADifferentKey()
    {
        Guid original = SigningIdempotencyKey.ForCallToAction(WorkflowId, StepId, SigneeIdentity);
        Guid changed = SigningIdempotencyKey.ForCallToAction(Guid.NewGuid(), StepId, SigneeIdentity);

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ForCallToAction_DifferentStepId_ProducesADifferentKey()
    {
        Guid original = SigningIdempotencyKey.ForCallToAction(WorkflowId, StepId, SigneeIdentity);
        Guid changed = SigningIdempotencyKey.ForCallToAction(WorkflowId, Guid.NewGuid(), SigneeIdentity);

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ForCallToAction_DifferentSigneeIdentity_ProducesADifferentKey()
    {
        Guid original = SigningIdempotencyKey.ForCallToAction(WorkflowId, StepId, SigneeIdentity);
        Guid changed = SigningIdempotencyKey.ForCallToAction(
            WorkflowId,
            StepId,
            "44444444-4444-4444-4444-444444444444"
        );

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ForCallToAction_EmptyStepId_StillDiffersFromANonEmptyStepId()
    {
        // The engine may leave stepId empty on an older version; the key must still be unique per visit because
        // workflowId is new on every visit.
        Guid withEmptyStep = SigningIdempotencyKey.ForCallToAction(WorkflowId, Guid.Empty, SigneeIdentity);
        Guid withStep = SigningIdempotencyKey.ForCallToAction(WorkflowId, StepId, SigneeIdentity);

        Assert.NotEqual(withEmptyStep, withStep);
    }

    [Fact]
    public void ForCallToAction_VersionNibbleIs8()
    {
        Guid key = SigningIdempotencyKey.ForCallToAction(WorkflowId, StepId, SigneeIdentity);

        // The version is the first hex digit of the third group (RFC 9562 section 4).
        char versionNibble = key.ToString("D").Split('-')[2][0];

        Assert.Equal('8', versionNibble);
    }

    [Theory]
    [InlineData("11111111-1111-1111-1111-111111111111")]
    [InlineData("22222222-2222-2222-2222-222222222222")]
    [InlineData("33333333-3333-3333-3333-333333333333")]
    [InlineData("44444444-4444-4444-4444-444444444444")]
    public void ForCallToAction_VariantBitsAreRfc4122(string signeeIdentity)
    {
        Guid key = SigningIdempotencyKey.ForCallToAction(WorkflowId, StepId, signeeIdentity);

        // The variant is the top two bits of the first byte of the fourth group; RFC 4122 requires "10".
        char variantHexDigit = key.ToString("D").Split('-')[3][0];
        int variantNibble = Convert.ToInt32(variantHexDigit.ToString(), 16);

        Assert.Equal(0b10, variantNibble >> 2);
    }

    /// <summary>
    /// Known-answer test pinning the exact derivation (namespace GUID, name format, SHA-256 folding). Locks the
    /// value so a change to the namespace, the name format or the hashing is caught here rather than in
    /// production: a changed key would let a retried step re-notify signees Correspondence already delivered to,
    /// because the platform would no longer recognise the retry as a duplicate of the earlier send.
    /// Computed once via a standalone script that copied <see cref="SigningIdempotencyKey"/>'s algorithm exactly,
    /// for workflowId=11111111-1111-1111-1111-111111111111, stepId=22222222-2222-2222-2222-222222222222,
    /// signeeIdentity="33333333-3333-3333-3333-333333333333".
    /// </summary>
    [Fact]
    public void ForCallToAction_KnownAnswer_MatchesPinnedValue()
    {
        Guid key = SigningIdempotencyKey.ForCallToAction(WorkflowId, StepId, SigneeIdentity);

        Assert.Equal(Guid.Parse("92569167-39aa-8625-9e98-3535885f5810"), key);
    }
}
