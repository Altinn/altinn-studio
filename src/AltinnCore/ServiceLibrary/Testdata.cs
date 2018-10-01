namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Contains details about a test data set
    /// </summary>
    public class Testdata
    {
        /// <summary>
        /// Gets or sets the test data ID
        /// </summary>
        public int DataId { get; set; }

        /// <summary>
        /// Gets or sets a description of the test data
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Gets or sets the title of the test data
        /// </summary>
        public string Title { get; set;  }
    }
}
