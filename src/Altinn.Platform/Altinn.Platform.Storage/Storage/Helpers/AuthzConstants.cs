namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Constants related to authorization.
    /// </summary>
    public static class AuthzConstants
    {
        /// <summary>
        /// Policy tag for writing an instance.
        /// </summary>
        public const string POLICY_INSTANCE_WRITE = "InstanceWrite";

        /// <summary>
        /// Policy tag for reading an instance.
        /// </summary>
        public const string POLICY_INSTANCE_READ = "InstanceRead";

        /// <summary>
        /// Policy tag for deleting an instance.
        /// </summary>
        public const string POLICY_INSTANCE_DELETE = "InstanceDelete";

        /// <summary>
        /// Policy tag for authorizing client scope.
        /// </summary>
        public const string POLICY_INSTANCE_COMPLETE = "InstanceComplete";

        /// <summary>
        /// Policy tag for authorizing client scope.
        /// </summary>
        public const string POLICY_SCOPE_APPDEPLOY = "ScopeAppDeploy";

        /// <summary>
        /// Policy tag for authorizing client scope.
        /// </summary>
        public const string POLICY_SCOPE_INSTANCE_READ = "ScopeInstanceRead";

        /// <summary>
        /// Policy tag for authorizing designer access
        /// </summary>
        public const string POLICY_STUDIO_DESIGNER = "StudioDesignerAccess";
    }
}
