namespace Altinn.App.Integration.Tests;

internal static class TestApps
{
    public const string Basic = "basic";

    /// <summary>
    /// A data + confirmation app on a released v8 version of the app libraries, for the v8 -> v9 upgrade tests.
    /// </summary>
    public const string UpgradeV8 = "upgrade-v8";

    /// <summary>
    /// <see cref="UpgradeV8"/> after <c>studioctl app upgrade v9</c>, running the libraries from the current commit.
    /// </summary>
    public const string UpgradeV9 = "upgrade-v9";

    /// <summary>
    /// The ttd/service-task app from altinn.studio on v8: two data tasks, two PDF service tasks, an app-implemented
    /// service task that can fail, and an eFormidling service task.
    /// </summary>
    public const string ServiceTaskV8 = "service-task-v8";

    /// <summary>
    /// <see cref="ServiceTaskV8"/> after <c>studioctl app upgrade v9</c> and the follow-ups it reported.
    /// </summary>
    public const string ServiceTaskV9 = "service-task-v9";

    /// <summary>
    /// The ttd/signering-brukerstyrt app from altinn.studio on v8: a data task followed by signing tasks whose
    /// signees come from the form, with an app-implemented gateway between them.
    /// </summary>
    public const string SigneringBrukerstyrtV8 = "signering-brukerstyrt-v8";

    /// <summary>
    /// <see cref="SigneringBrukerstyrtV8"/> after <c>studioctl app upgrade v9</c> and the follow-ups it reported.
    /// </summary>
    public const string SigneringBrukerstyrtV9 = "signering-brukerstyrt-v9";
}
