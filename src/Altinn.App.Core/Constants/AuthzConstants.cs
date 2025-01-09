namespace Altinn.App.Core.Constants;

/// <summary>
/// Constants related to authorization.
/// </summary>
public static class AuthzConstants
{
#pragma warning disable CA1707 // Identifiers should not contain underscores
    /// <summary>
    /// Policy tag for reading an instance.
    /// </summary>
    public const string POLICY_INSTANCE_WRITE = "InstanceWrite";

    /// <summary>
    /// Policy tag for writing on instance.
    /// </summary>
    public const string POLICY_INSTANCE_READ = "InstanceRead";

    /// <summary>
    /// Policy tag for writing on instance.
    /// </summary>
    public const string POLICY_INSTANCE_DELETE = "InstanceDelete";

    /// <summary>
    /// Policy tag for authorizing client scope.
    /// </summary>
    public const string POLICY_INSTANCE_COMPLETE = "InstanceComplete";

    /// <summary>
    /// Policy tag for instantiating instance.
    /// </summary>
    public const string POLICY_INSTANCE_INSTANTIATE = "InstanceInstantiate";
#pragma warning restore CA1707 // Identifiers should not contain underscores
}
