using System;
using System.Collections.Generic;
using System.Text;

namespace Authorization.Interface.Enums
{
    /// <summary>
    /// Enum containing values for the different types of parties
    /// </summary>
    public enum PartyType
    {
        /// <summary>
        /// Indicates that this party is a Person
        /// </summary>
        Person = 0,

        /// <summary>
        /// Indicates that this party is an Organization
        /// </summary>
        Organization = 1,

        /// <summary>
        /// Indicates that this party is a self identified user
        /// </summary>
        SelfIdentified = 2,
    }
}
