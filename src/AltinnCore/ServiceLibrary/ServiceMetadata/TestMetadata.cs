using System.Collections.Generic;
using AltinnCore.ServiceLibrary.Enums;

namespace AltinnCore.ServiceLibrary.ServiceMetadata
{
    /// <summary>
    /// Metadata class for service views
    /// </summary>
    public class TestMetadata
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="TestMetadata"/> class
        /// </summary>
        public TestMetadata()
        {
            CustomProperties = new Dictionary<string, string>();
        }
        
        /// <summary>
        /// Gets or sets the name of the test
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the type of the test
        /// </summary>
        public TestType Type { get; set; }

        /// <summary>
        /// Gets or sets the filename of the test-file
        /// </summary>
        public string FileName { get; set; }

        /// <summary>
        /// Gets or sets the test content
        /// </summary>
        public string Content { get; set; }

         /// <summary>
        /// Gets or sets the test data files
        /// </summary>
        public Dictionary<string, string> TestDataFiles { get; set; }

        /// <summary>
        /// Gets or sets any custom properties associated with the test
        /// </summary>
        public Dictionary<string, string> CustomProperties { get; set; }
    }
}
