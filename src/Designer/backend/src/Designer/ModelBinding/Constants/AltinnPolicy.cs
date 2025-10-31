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
        /// </summary>
        public const string MustBelongToOrganization = "MustBelongToOrganization";

        /// <summary>
        /// MustHaveOrganizationPermission
        /// </summary>
        public const string MustHaveOrganizationPermission = "MustHaveOrganizationPermission";
    }
}
