using System;
using System.Collections.Generic;
using Authorization.Interface.Enums;
using Newtonsoft.Json;

namespace Authorization.Interface.Models
{
    /// <summary>
    /// Model for an Actor
    /// </summary>
    [Serializable]
    public class Party
    {
        /// <summary>
        /// Gets or sets PartyType
        /// </summary>
        [JsonProperty]
        public PartyType PartyTypeName { get; set; }

        /// <summary>
        /// Gets or sets OrgNumber
        /// </summary>
        [JsonProperty]
        public string OrgNumber { get; set; }

        /// <summary>
        /// Gets or sets Person
        /// </summary>
        [JsonProperty]
        public Person Person { get; set; }

        /// <summary>
        /// Gets or sets Organization
        /// </summary>
        [JsonProperty]
        public Organization Organization { get; set; }

        /// <summary>
        /// Gets or sets the PartyID
        /// </summary>
        [JsonProperty]
        public int PartyID { get; set; }

        /// <summary>
        /// Gets or sets the OrganizationNumber
        /// </summary>
        [JsonProperty]
        public string OrganizationNumber { get; set; }

        /// <summary>
        /// Gets or sets the UnitType
        /// </summary>
        [JsonProperty]
        public string UnitType { get; set; }

        /// <summary>
        /// Gets or sets the SSNNumber
        /// </summary>
        [JsonProperty]
        public string SSN { get; set; }

        /// <summary>
        /// Gets or sets the Name
        /// </summary>
        [JsonProperty]
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the IsDeleted
        /// </summary>
        [JsonProperty]
        public bool IsDeleted { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether if the reportee in the list is only there for showing the hierarchy (a parent unit with no access)
        /// </summary>
        [JsonProperty]
        public bool OnlyHiearhyElementWithNoAccess { get; set; }

        /// <summary>
        /// Gets or sets the value of ChildActors
        /// </summary>
        [JsonProperty]
        public List<Party> ChildActors { get; set; }
    }
}
