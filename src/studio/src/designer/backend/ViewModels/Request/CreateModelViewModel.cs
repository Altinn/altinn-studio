namespace Altinn.Studio.Designer.ViewModels.Request
{
    /// <summary>
    /// Model used when creating a new model
    /// </summary>
    public class CreateModelViewModel
    {
        /// <summary>
        /// The logical name of the model, without any file extensions.
        /// </summary>
        public string ModelName { get; set; }

        /// <summary>
        /// Relative path where the model should be stored. Applies only when creating
        /// models in a data models repository. For app repositories the path is determined
        /// within the app.
        /// </summary>
        public string RelativeDirectory { get; set; }

        /// <summary>
        /// Determines if the model should be created as an Altinn 2/Seres model,
        /// as opposed to the default which is Altinn 3 or plain Json Schema.
        /// </summary>
        public bool Altinn2Compatible { get; set; } = false;
    }
}
