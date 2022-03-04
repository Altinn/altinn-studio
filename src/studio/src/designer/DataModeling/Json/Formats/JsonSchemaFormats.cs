namespace Altinn.Studio.DataModeling.Json.Formats
{
    /// <summary>
    /// Helper class for registering custom formats.
    /// </summary>
    public static class JsonSchemaFormats
    {
        private static readonly object Lock = new object();

        private static volatile bool _formatsRegistered;

        /// <summary>
        /// Register all custom format keywords.
        /// </summary>
        public static void RegisterFormats()
        {
            // Basic double checked locking pattern
            if (!_formatsRegistered)
            {
                lock (Lock)
                {
                    if (!_formatsRegistered)
                    {
                        global::Json.Schema.Formats.Register(CustomFormats.Year);
                        global::Json.Schema.Formats.Register(CustomFormats.YearMonth);

                        _formatsRegistered = true;
                    }
                }
            }
        }
    }
}
