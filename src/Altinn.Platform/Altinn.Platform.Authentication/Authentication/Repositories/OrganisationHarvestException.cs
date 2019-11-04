using System;

namespace Altinn.Platform.Authentication.Repositories
{
    /// <summary>
    /// Exception for harvest exception.
    /// </summary>
    public class OrganisationHarvestException : Exception
    {
        /// <summary>
        /// Empty constructor.
        /// </summary>
        public OrganisationHarvestException() : base()
        {
        }

        /// <summary>
        /// With message.
        /// </summary>
        public OrganisationHarvestException(string message) : base(message)
        {
        }

        /// <summary>
        /// With message and inner exception.
        /// </summary>
        public OrganisationHarvestException(string message, Exception innerException)
                : base(message, innerException)
        {
        }        
    }
}
