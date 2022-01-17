using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// The git signature
    /// </summary>
    public class Signature
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="Signature"/> class.
        /// </summary>
        public Signature()
        {
        }

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
        public DateTimeOffset When { get; set; }
    }
}
