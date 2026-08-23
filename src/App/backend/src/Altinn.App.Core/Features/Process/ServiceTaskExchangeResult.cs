namespace Altinn.App.Core.Features.Process;

/// <summary>
/// What a multi-message exchange's reply handler may answer: anything a service task concludes with
/// (<see cref="ServiceTaskResult"/>, the whole vocabulary below this type) plus
/// <see cref="AwaitNextReply"/>, which concludes nothing and waits for the next message.
/// </summary>
/// <remarks>
/// The split is what makes "await the next message" unrepresentable where there is no next message to await:
/// only <see cref="ServiceTaskPipelineBuilder.ConcludeOnReplies"/>'s <c>onMessage</c> returns this type —
/// every other handler returns <see cref="ServiceTaskResult"/>, so the compiler rejects
/// <see cref="AwaitNextReply"/> there.
/// </remarks>
public abstract record ServiceTaskExchangeResult
{
    /// <summary>
    /// Declares no constructor an app can call, so this vocabulary is closed to ordinary derivation — as
    /// <see cref="ServiceTaskStageResult"/> is. The answers below are the whole set, and the runtime maps each
    /// to a workflow-engine outcome by its type; it has nothing to give a subtype it does not know. Should one
    /// reach it anyway, the task fails permanently naming the type rather than being concluded on a guess.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <strong>No test holds this property, and one artifact does.</strong> <c>Altinn.App.Core.Tests</c> is an
    /// <c>InternalsVisibleTo</c> friend, so a probe written there derives from this root perfectly legally and
    /// proves nothing about what an app can do. The only thing that would notice this constructor being widened
    /// is the committed public-API approval file
    /// (<c>PublicApiTests.PublicApi_ShouldNotChange_Unintentionally.verified.txt</c>) — <em>and only in CI</em>,
    /// because that project's module initializer calls Verify's <c>AutoVerify(includeBuildServer: false)</c>, so
    /// a local run silently rewrites the file and still reports green. If you touch the accessibility of this
    /// constructor, or of <see cref="ServiceTaskResult"/>'s or <see cref="ServiceTaskStageResult"/>'s, read that
    /// file's diff by hand.
    /// </para>
    /// <para>
    /// What does fail loudly is the hole this does not close: a record's synthesized <em>copy</em> constructor
    /// is <c>protected</c> and C# forbids narrowing it on an unsealed record, so an app can still chain it.
    /// Three tests derive that way — one per root — to pin that the runtime converges on such a value instead of
    /// throwing into a retry ladder. They are self-cleaning: close the hole properly (which means moving these
    /// roots off records) and <c>base(original)</c> stops compiling, taking those tests with it.
    /// </para>
    /// </remarks>
    private protected ServiceTaskExchangeResult() { }

    /// <summary>
    /// This message is handled; the exchange is not over. Returnable only from a multi-message exchange's
    /// message handler.
    /// </summary>
    /// <remarks>
    /// An ordinary successful completion: data changes are saved, and the state travels on — publish what the
    /// next message should see. The task stays unconcluded until a later message answers with
    /// <see cref="ServiceTaskResult.Success"/>/<see cref="ServiceTaskResult.FailedPermanent"/> or the
    /// mailbox's timeout runs out.
    /// </remarks>
    public static ServiceTaskAwaitNextReplyResult AwaitNextReply() => ServiceTaskAwaitNextReplyResult.Instance;
}

/// <summary>A reply handler finished its message while the exchange stays open.</summary>
public sealed record ServiceTaskAwaitNextReplyResult : ServiceTaskExchangeResult
{
    internal static readonly ServiceTaskAwaitNextReplyResult Instance = new();

    internal ServiceTaskAwaitNextReplyResult() { }
}
