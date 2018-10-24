namespace AltinnCore.Common.Configuration
{
    /// <summary>
    /// General configuration settings
    /// </summary>
    public class GeneralSettings
    {
        /// <summary>
        /// Gets or sets the location to search for templates
        /// </summary>
        public string TemplateLocation { get; set; }

        /// <summary>
        /// Gets or sets the runtime mode
        /// </summary>
        public string RuntimeMode { get; set; }

        /// <summary>
        /// Gets the path to the service implementation template
        /// </summary>
        public string ServiceImplementationTemplate
        {
            get
            {
                return TemplateLocation + "/ServiceImplementation.cs";
            }
        }

        /// <summary>
        /// Gets the path to the calculation handler template
        /// </summary>
        public string CalculateHandlerTemplate
        {
            get
            {
                return TemplateLocation + "/CalculationHandler.cs";
            }
        }

        /// <summary>
        /// Gets the path to the rule handler template
        /// </summary>
        public string RuleHandlerTemplate
        {
          get
          {
            return TemplateLocation + "/RuleHandler.js";
          }
        }

    /// <summary>
    /// Gets the path to the validation handler template
    /// </summary>
    public string ValidationHandlerTemplate
        {
            get
            {
                return TemplateLocation + "/ValidationHandler.cs";
            }
        }

        /// <summary>
        /// Gets the path to the instantiation handler template
        /// </summary>
        public string InstantiationHandlerTemplate
        {
            get
            {
                return TemplateLocation + "/InstantiationHandler.cs";
            }
        }

        /// <summary>
        /// Gets the path to the generated methods template
        /// </summary>
        public string GeneratedMethodsTemplate
        {
            get
            {
                return TemplateLocation + "/GeneratedMethods.cs";
            }
        }

        /// <summary>
        /// Gets the path to the default service layout file
        /// </summary>
        public string DefaultServiceLayout
        {
            get
            {
                return TemplateLocation + "/_ServiceLayout.cshtml";
            }
        }

        /// <summary>
        /// Gets the path to the default view start file
        /// </summary>
        public string DefaultViewStart
        {
            get
            {
                return TemplateLocation + "/_ViewStart.cshtml";
            }
        }

        /// <summary>
        /// Gets the path to the default view imports file
        /// </summary>
        public string DefaultViewImports
        {
            get
            {
                return TemplateLocation + "/_ViewImports.cshtml";
            }
        }
    }
}
