using System.ComponentModel.DataAnnotations;

using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Models
{
    /// <summary>
    /// Represents the input parameters for the Person lookup endpoint.
    /// </summary>
    public class PersonLookupIdentifiers
    {
        /// <summary>
        /// The unique national identity number of the person.
        /// </summary>
        [FromHeader(Name = "X-Ai-NationalIdentityNumber")]
        [Required]
        public string NationalIdentityNumber { get; set; }

        /// <summary>
        /// The last name of the person. This must match.
        /// </summary>
        [FromHeader(Name = "X-Ai-LastName")]
        [Required]
        public string LastName { get; set; }
    }
}
