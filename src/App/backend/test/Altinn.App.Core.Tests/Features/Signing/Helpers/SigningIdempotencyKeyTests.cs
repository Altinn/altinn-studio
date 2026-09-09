using Altinn.App.Core.Features.Signing.Helpers;

namespace Altinn.App.Core.Tests.Features.Signing.Helpers;

public class SigningIdempotencyKeyTests
{
    private static readonly Guid StateElementId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid SigneeId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public void ForCallToAction_EqualTaskEntryAndRecipient_ProduceTheSameKey()
    {
        Guid first = SigningIdempotencyKey.ForCallToAction(StateElementId, SigneeId);
        Guid second = SigningIdempotencyKey.ForCallToAction(StateElementId, SigneeId);
        Assert.Equal(first, second);
    }

    [Fact]
    public void ForCallToAction_TaskReentry_ProducesADifferentKey()
    {
        Guid original = SigningIdempotencyKey.ForCallToAction(StateElementId, SigneeId);
        Guid changed = SigningIdempotencyKey.ForCallToAction(Guid.NewGuid(), SigneeId);
        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ForCallToAction_DifferentRecipient_ProducesADifferentKey()
    {
        Guid original = SigningIdempotencyKey.ForCallToAction(StateElementId, SigneeId);
        Guid changed = SigningIdempotencyKey.ForCallToAction(StateElementId, Guid.NewGuid());
        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ForCallToAction_KnownAnswer_PinsVersionVariantAndDerivation()
    {
        Guid key = SigningIdempotencyKey.ForCallToAction(StateElementId, SigneeId);
        // Independently calculated from namespace bytes plus the UTF-8 entry/recipient name and SHA-256.
        Assert.Equal(Guid.Parse("693cbddb-5253-88e6-a794-7342a8abe3b9"), key);
    }
}
