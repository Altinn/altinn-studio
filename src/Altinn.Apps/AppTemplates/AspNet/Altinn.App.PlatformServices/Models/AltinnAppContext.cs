using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.App.PlatformServices.Models
{
    /// <summary>
    /// Class describing properties of Altinn App Context
    /// </summary>
    public class AltinnAppContext
    {
        /// <summary>
        /// The partyId for the given context
        /// </summary>
        public int PartyId { get; set; }

        /// <summary>
        /// The social security number for party if person
        /// </summary>
        public string PartySsn { get; set; }

        /// <summary>
        /// The organizatiton orgno for 
        /// </summary>
        public string PartyOrgNo { get; set; }
    }
}
