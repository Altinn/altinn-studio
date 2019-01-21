using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Models
{
    /// <summary>
    /// The git signature
    /// </summary>
    public class Signature
    {
        /// <summary>
        /// The email adress to the user
        /// </summary>
        public string Email { get; set; }

        /// <summary>
        /// The name of the user
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// When signture was created
        /// </summary>
        public DateTimeOffset When { get; internal set; }
    }
}
