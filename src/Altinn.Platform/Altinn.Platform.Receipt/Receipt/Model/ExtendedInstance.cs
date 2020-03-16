using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Receipt.Model
{
    /// <summary>
    /// Extended instance object which holds instance metadata and instance owner party object
    /// </summary>
    public class ExtendedInstance
    {
        /// <summary>
        /// The instance object
        /// </summary>
        public Instance Instance { get; set; }

        /// <summary>
        /// The party object related to the instance owner
        /// </summary>
        public Party Party { get; set; }
    }
}
