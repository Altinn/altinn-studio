using System;
using System.ComponentModel.DataAnnotations;
using System.Text;

using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Register.Models
{
    /// <summary>
    /// Represents the input parameters for the Person lookup endpoint.
    /// </summary>
    public class PersonLookupIdentifiers
    {
        private string _lastName;

        /// <summary>
        /// The unique national identity number of the person.
        /// </summary>
        [FromHeader(Name = "X-Ai-NationalIdentityNumber")]
        [Required]
        public string NationalIdentityNumber { get; set; }

        /// <summary>
        /// The last name of the person. This must match the last name of the identified person.
        /// The value is assumed to be base64 encoded from an UTF-8 string.
        /// </summary>
        [FromHeader(Name = "X-Ai-LastName")]
        [Required]
        public string LastName
        {
            get
            {
                if (_lastName is null)
                {
                    return null;
                }

                Span<byte> buffer = stackalloc byte[_lastName.Length];
                bool success = Convert.TryFromBase64String(_lastName, buffer, out int bytesParsed);
                return success ? Encoding.UTF8.GetString(buffer[..bytesParsed]) : _lastName;
            }

            set
            {
                _lastName = value;
            }
        }
    }
}
