namespace AltinnCore.Designer.Infrastructure.Models
{
    /// <summary>
    /// Settings for Azure DevOps
    /// </summary>
    public class AzureDevOpsSettings
    {
        /// <summary>
        /// Id for a definition that builds an Altinn Studio app
        /// </summary>
        public int BuildDefinitionId { get; set; }

        /// <summary>
        /// Id for a definition that deploys an Altinn Studio app to TT-environment
        /// </summary>
        public int DeployDefinitionIdTT { get; set;}

        /// <summary>
        /// Id for a definition that deploys an Altinn Studio app to AT-environment
        /// </summary>
        public int DeployDefinitionIdAT {get; set;}

        /// <summary>
        /// Id for a definition that deploys an Altinn Studio app to production-environment
        /// </summary>
        public int DeployDefinitonIdProd {get; set;}

        /// <summary>
        /// Base URI for Azure DevOps
        /// </summary>
        public string BaseUri { get; set; }
    }
}
