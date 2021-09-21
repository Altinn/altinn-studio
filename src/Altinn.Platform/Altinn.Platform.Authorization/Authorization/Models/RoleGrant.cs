namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes a role which a particular action is given to.
    /// example: RoleGrant { "RoleTypeCode": "DAGL", "IsDelegable": true }
    /// </summary>
    public class RoleGrant
    {
        /// <summary>
        /// Gets or sets role type code the grant is for.
        /// </summary>
        public string RoleTypeCode { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the having the specified role also permits the user to delegate the right specified by the ResourceAction to other recipients (if the receiver of the role also have administrative rights).
        /// </summary>
        public bool IsDelegable { get; set; }
    }
}
