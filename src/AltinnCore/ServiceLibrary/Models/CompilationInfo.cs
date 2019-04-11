namespace AltinnCore.ServiceLibrary.Models
{
    /// <summary>
    /// A entity 
    /// </summary>
    public class CompilationInfo
    {
        /// <summary>
        /// Gets or sets the Severity
        /// </summary>
        public string Severity { get; set; }

        /// <summary>
        /// Gets or sets the FilePath
        /// </summary>
        public string FilePath { get; set; }

        /// <summary>
        /// Gets or sets the FileName
        /// </summary>
        public string FileName { get; set; }

        /// <summary>
        /// Gets or sets the LineNumber
        /// </summary>
        public int LineNumber { get; set; }

        /// <summary>
        /// Gets or sets the info
        /// </summary>
        public string Info { get; set; }

        /// <summary>
        /// Gets or sets the code
        /// </summary>
        public string Code { get; set; }
        
        /// <summary>
        /// Gets or sets the Warning level
        /// </summary>
        public int WarningLevel { get; set; }
    }
}
