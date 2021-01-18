using System.Collections.Generic;

namespace Altinn.App.Common.Models
{
    /// <summary>
    /// Defines the layout settings
    /// </summary>
    public class LayoutSettings
    {
        /// <summary>
        /// Pages
        /// </summary>
        public Pages Pages { get; set; }

        /// <summary>
        /// Components
        /// </summary>
        public Components Components { get; set; }
    }

     /// <summary>
    /// Pages
    /// </summary>
    public class Pages
    {
        /// <summary>
        /// Order
        /// </summary>
        public List<string> Order { get; set; }

        /// <summary>
        /// Exclude from pdf
        /// </summary>
        public List<string> ExcludeFromPdf { get; set; }
    }

    /// <summary>
    /// Components
    /// </summary>
    public class Components
    {
        /// <summary>
        /// Exclude from pdf
        /// </summary>
        public List<string> ExcludeFromPdf { get; set; }
    }

    /// <summary>
    /// Layoutset
    /// </summary>
    public class LayoutSets
    {
        /// <summary>
        /// Sets
        /// </summary>
        public List<LayoutSet> Sets { get; set; } 
    }

    /// <summary>
    /// The layoutset
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
