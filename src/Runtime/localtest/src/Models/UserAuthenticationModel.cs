using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Models
{
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
        /// Gets or sets a flag stating if the user is authenticated
        /// </summary>
        public bool IsAuthenticated { get; set; }
    }
}
