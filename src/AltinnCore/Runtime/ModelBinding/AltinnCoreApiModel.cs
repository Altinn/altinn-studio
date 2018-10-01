
namespace AltinnCore.Runtime.ModelBinding
{
    /// <summary>
    /// This is an model special created to support both JSON and XML in the same endpoint. 
    /// It will be created by a custom Model binder created for this case
    /// </summary>
    public class AltinnCoreApiModel
    {
        /// <summary>
        /// Gets or sets the BodyContent coming from the request. Populated by the AltinnCoreApiModelBinder
        /// </summary>
        public string BodyContent { get; set; }
    }
}
