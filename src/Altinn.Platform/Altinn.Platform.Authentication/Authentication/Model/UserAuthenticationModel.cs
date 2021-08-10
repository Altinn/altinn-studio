using System;
using Altinn.Platform.Authentication.Enum;

namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// The information about the authenticated user
    /// </summary>
    public class UserAuthenticationModel
    {
        /// <summary>
        /// Gets or sets the user id
        /// </summary>
        public int UserID { get; set; }

        /// <summary>
        /// Gets or sets the username
        /// </summary>
        public string Username { get; set; }

        /// <summary>
        /// Gets or sets the SSN
        /// </summary>
        public string SSN { get; set; }

        /// <summary>
        /// Gets or sets the PartyId
        /// </summary>
        public int PartyID { get; set; }

        /// <summary>
        /// Gets or sets the authentication method
        /// </summary>
        public AuthenticationMethod AuthenticationMethod { get; set; }

        /// <summary>
        /// Gets or sets the authentication level
        /// </summary>
        public SecurityLevel AuthenticationLevel { get; set; }

        /// <summary>
        /// Gets or sets a flag stating if the user is authenticated
        /// </summary>
        public bool IsAuthenticated { get; set; }

        /// <summary>
        /// Gets or sets the encrypted ticket
        /// </summary>
        public string EncryptedTicket { get; set; }

        /// <summary>
        /// Gets or sets a flag stating if the ticket is updated or not
        /// </summary>
        public bool TicketUpdated { get; set; }

        /// <summary>
        /// Nonce used for OIDC requests
        /// </summary>
        public string Nonce { get; set; }
    }
}
