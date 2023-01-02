namespace Altinn.Studio.Designer.Constants
{
    /// <summary>
    /// Contains constants related to service code generation
    /// </summary>
    public static class CodeGeneration
    {
        /// <summary>
        /// Template constant for the namespace for a service
        /// </summary>
        public const string AppNamespaceTemplate = "Altinn.App";

        /// <summary>
        /// Default constant for the namespace for a service
        /// </summary>
        public const string ServiceNamespaceTemplateDefault = "AltinnCoreServiceImplementation.Template";

        /// <summary>
        /// The name of the service model used in the service implementation template. This constant
        /// can be used for replacing the name when generating a new service model.
        /// </summary>
        public const string DefaultServiceModelName = "SERVICE_MODEL_NAME";
    }
}
