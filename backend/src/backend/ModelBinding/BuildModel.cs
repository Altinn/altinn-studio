using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.ModelBinding
{
    /// <summary>
    /// Build a model
    /// </summary>
    public class BuildModel
    {
        /// <summary>
        /// id
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// status
        /// </summary>
        public string Status { get; set; }

        /// <summary>
        /// result
        /// </summary>
        public string Result { get; set; }

        /// <summary>
        /// start time
        /// </summary>
        public string StartTime { get; set; }

        /// <summary>
        /// finish time
        /// </summary>
        public string FinishTime { get; set; }
    }
}
