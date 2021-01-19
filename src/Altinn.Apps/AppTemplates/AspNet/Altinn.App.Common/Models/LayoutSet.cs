using System.Collections.Generic;

namespace Altinn.App.Common.Models
{
    /// <summary>
    /// A specific layoutset 
    /// </summary>
    public class LayoutSet
    {
        /// <summary>
        /// LayoutsetId for layout. This is the foldername
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// DataType for layout
        /// </summary>
        public string DataType { get; set; }

        /// <summary>
        /// List of task where layuout should be used
        /// </summary>
        public List<string> Task { get; set; }
    }
}
