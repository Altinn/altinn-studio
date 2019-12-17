namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Constants related to authorization.
    /// </summary>
    public static class AuthzConstants
    {
        /// <summary>
        /// Policy tag for reading an instance.
        /// </summary>
        public const string POLICY_INSTANCE_WRITE = "InstanceWrite";

        /// <summary>
        /// Policy tag for writing on instance.
        /// </summary>
        public const string POLICY_INSTANCE_READ = "InstanceRead";

        /// <summary>
        /// Policy tag for authorizing client scope.
        /// </summary>
        public const string POLICY_SCOPE_APPDEPLOY = "ScopeAppDeploy";
    }
}
