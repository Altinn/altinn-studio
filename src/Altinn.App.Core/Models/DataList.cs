using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.App.Core.Models
{
    /// <summary>
    /// Represents values to be used in a DataList.
    /// </summary>
    public class DataList
    {
        /// <summary>
        /// Gets or sets the list of objects.
        /// </summary>
        public List<object> ListItems { get; set; } = new List<object>();

        /// <summary>
        /// Gets or sets the metadata of the DataList.
        /// </summary>
        public DataListMetadata _metaData { get; set; } = new DataListMetadata();
    }
}
