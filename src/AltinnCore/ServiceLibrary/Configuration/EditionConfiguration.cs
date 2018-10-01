using System.ComponentModel.DataAnnotations;

namespace AltinnCore.ServiceLibrary.Configuration
{
    /// <summary>
    /// Class containing details about a service edition
    /// </summary>
    public class EditionConfiguration
    {
        /// <summary>
        /// Gets or sets the name of the service implementation
        /// </summary>
        public string ServiceImplementation { get; set; }
        
        /// <summary>
        /// Gets or sets the edition code
        /// </summary>
        [RegularExpression("[1-9][0-9]{0,3}", ErrorMessage = "Må være et tall mellom 1 og 9999")]
        public string Code { get; set; }
        
    }
}
