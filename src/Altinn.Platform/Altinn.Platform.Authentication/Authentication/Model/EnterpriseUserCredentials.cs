using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// Handles credentials for an enterprise user.
    /// </summary>
    public class EnterpriseUserCredentials
    {
        /// <summary>
        /// Gets or sets the user name
        /// </summary>
        public string UserName { get; set; }

        /// <summary>
        /// Gets or sets the password
        /// </summary>
        public string Password { get; set; }

        /// <summary>
        /// Gets or sets the organization number
        /// </summary>
        public string OrganizationNumber { get; set; }
    }
}
