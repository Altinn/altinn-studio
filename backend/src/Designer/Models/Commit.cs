namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Describes a 
    /// </summary>
    public class Commit
    {
        /// <summary>
        /// The commit message
        /// </summary>
        public string Message { get; set; }

        /// <summary>
        /// The author
        /// </summary>
        public Signature Author { get; set; }

        /// <summary>
        /// The comitter
        /// </summary>
        public Signature Comitter { get; set; }

        /// <summary>
        /// The Sha
        /// </summary>
        public string Sha { get; set; }

        /// <summary>
        /// Short Message
        /// </summary>
        public string MessageShort { get; set; }

        /// <summary>
        /// Encoding of Commit
        /// </summary>
        public string Encoding { get; set; }
    }
}
