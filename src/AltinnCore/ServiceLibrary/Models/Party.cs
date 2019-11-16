using System.Collections.Generic;
using AltinnCore.ServiceLibrary.Enums;
using Newtonsoft.Json;

namespace AltinnCore.ServiceLibrary.Models
{
    /// <summary>
    /// Class representing a party
    /// </summary>
    public class Party
    {
        /// <summary>
        /// Gets or sets the ID of the party
        /// </summary>
        public int PartyId { get; set; }

        /// <summary>
        /// Gets or sets the type of party
        /// </summary>
        public PartyType PartyTypeName { get; set; }

        /// <summary>
        /// Gets the parties org number
        /// </summary>
        public string OrgNumber { get; set; }

        /// <summary>
        /// Gets the parties ssn
        /// </summary>
        public string SSN { get; set; }

        /// <summary>
        /// Gets or sets the UnitType
        /// </summary>
        public string UnitType { get; set; }

        /// <summary>
        /// Gets or sets the Name
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the IsDeleted
        /// </summary>
        public bool IsDeleted { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether if the reportee in the list is only there for showing the hierarchy (a parent unit with no access)
        /// </summary>
        public bool OnlyHierarchyElementWithNoAccess { get; set; }

        /// <summary>
        /// Gets or sets the person details for this party (will only be set if the party type is Person)
        /// </summary>
        public Person Person { get; set; }

        /// <summary>
        /// Gets or sets the organization details for this party (will only be set if the party type is Organization)
        /// </summary>
        public Organization Organization { get; set; }

        /// <summary>
        /// Gets or sets the value of ChildParties
        /// </summary>
        public List<Party> ChildParties { get; set; }
    }
}
