namespace Altinn.Studio.DataModeling.Json.Formats
{
    /// <summary>
    /// Helper class for registering custom formats.
    /// </summary>
    public static class JsonSchemaFormats
    {
        private static readonly object s_lock = new object();

        private static volatile bool s_formatsRegistered;

        /// <summary>
        /// Register all custom format keywords.
        /// </summary>
        public static void RegisterFormats()
        {
            // Basic double checked locking pattern
            if (!s_formatsRegistered)
            {
                lock (s_lock)
                {
                    if (!s_formatsRegistered)
                    {
                        global::Json.Schema.Formats.Register(CustomFormats.Year);
                        global::Json.Schema.Formats.Register(CustomFormats.YearMonth);

                        s_formatsRegistered = true;
                    }
                }
            }
        }
    }
}
