using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.App.PlatformServices.Models
{
    /// <summary>
    /// Process change info containing information passed around between process engine componentes
    /// </summary>
    public class ProcessChangeInfo
    {
        /// <summary>
        /// Type message
        /// </summary>
        public string Type { get; set; }

        /// <summary>
        /// The message itself
        /// </summary>
        public string Message { get; set; }
    }
}
