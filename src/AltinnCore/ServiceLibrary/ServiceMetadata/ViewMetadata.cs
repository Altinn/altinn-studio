using System.Collections.Generic;

namespace AltinnCore.ServiceLibrary.ServiceMetadata
{
    /// <summary>
    /// Metadata class for service views
    /// </summary>
    public class ViewMetadata
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ViewMetadata"/> class
        /// </summary>
        public ViewMetadata()
        {
            CustomProperties = new Dictionary<string, string>();
        }
       
        /// <summary>
        /// Gets or sets the name of the view
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the filename of the view-file
        /// </summary>
        public string RazorViewFileName { get; set; }

        /// <summary>
        /// Gets or sets the final razor view file name.
        /// </summary>
        public string FinalRazorViewFileName { get; set; }

        /// <summary>
        /// Gets or sets the layout 
        /// </summary>
        public string Layout { get; set; }

        /// <summary>
        /// Gets or sets any custom properties associated with the view
        /// </summary>
        public Dictionary<string, string> CustomProperties { get; set; }
    }
}