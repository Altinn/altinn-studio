using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace KubernetesWrapper.Models
{
    /// <summary>
    /// Class describing a daemon set
    /// </summary>
    public class DaemonSet
    {
        /// <summary>
        /// Gets or sets the version of the deployment, the image tag number
        /// </summary>
        public string Version { get; set; }

        /// <summary>
        /// Gets or sets release name
        /// </summary>
        public string Release { get; set; }
    }
}
