using System.Security.Claims;

namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Contains information about a user context
    /// </summary>
    public class UserContext
    {
        /// <summary>
        /// Gets or sets the social security number
        /// </summary>
        public string SocialSecurityNumber { get; set; }

        /// <summary>
        /// Gets or sets the username
        /// </summary>
        public string UserName { get; set; }

        /// <summary>
        /// Gets or sets the reportee
        /// </summary>
        public Party Reportee { get; set; }

        /// <summary>
        /// Gets or sets the party of the user
        /// </summary>
        public Party UserParty { get; set; }

        /// <summary>
        /// Gets or sets the claims principal for the user
        /// </summary>
        public ClaimsPrincipal User { get; set; }

        /// <summary>
        /// Gets or sets the ID of the user
        /// </summary>
        public int UserId { get; set; }

        /// <summary>
        /// Gets or sets the party ID
        /// </summary>
        public int PartyId { get; set; }

        /// <summary>
        /// Gets or sets the reportee ID
        /// </summary>
        public int ReporteeId { get; set; }

        /// <summary>
        /// Gets or sets the current 
        /// </summary>
        public int AuthenticationLevel { get; set; }
    }
}
