#nullable disable
namespace Altinn.Studio.Designer.ModelBinding.Constants
{
    /// <summary>
    /// Contains constants related to Authorization policies for Altinn
    /// </summary>
    public static class AltinnPolicy
    {
        /// <summary>
        /// MustHaveGiteaPushPermission
        /// </summary>
        public const string MustHaveGiteaPushPermission = "MustHaveGiteaPushPermission";

        /// <summary>
        /// MustHaveGiteaDeployPermission
        /// </summary>
        public const string MustHaveGiteaDeployPermission = "MustHaveGiteaDeployPermission";

        /// <summary>
        /// MustHaveGiteaPublishResourcePermission
        /// </summary>
        public const string MustHaveGiteaPublishResourcePermission = "MustHaveGiteaPublishResourcePermission";

        /// <summary>
        /// MustHaveGiteaResourceAccessListPermission
        /// </summary>
        public const string MustHaveGiteaResourceAccessListPermission = "MustHaveGiteaResourceAccessListPermission";

        /// <summary>
        /// MustBelongToOrganization
        /// User must be a member of an organization.
        /// </summary>
        public const string MustBelongToOrganization = "MustBelongToOrganization";

        /// <summary>
        /// MustHaveOrganizationPermission
        /// User must have permission in the relevant organization.
        /// </summary>
        public const string MustHaveOrganizationPermission = "MustHaveOrganizationPermission";

        /// <summary>
        /// MustHaveAdminPermission
        /// </summary>
        public const string MustHaveAdminPermission = "MustHaveAdminPermission";

        /// <summary>
        /// MustHaveAiAssistantPermission
        /// User must have permission to access the AI assistant.
        /// </summary>
        public const string MustHaveAiAssistantPermission = "MustHaveAiAssistantPermission";
    }
}
