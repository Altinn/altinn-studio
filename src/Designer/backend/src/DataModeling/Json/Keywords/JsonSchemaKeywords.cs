using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// Manage custom keywords for the data modeling module
    /// </summary>
    public static class JsonSchemaKeywords
    {
        private static readonly object s_lock = new object();

        private static volatile bool s_keywordsRegistered;

        private static Dialect s_dialect;

        /// <summary>
        /// Register custom keywords by extending the default dialect.
        /// </summary>
        public static void RegisterXsdKeywords()
        {
            if (!s_keywordsRegistered)
            {
                lock (s_lock)
                {
                    if (!s_keywordsRegistered)
                    {
                        IKeywordHandler[] customHandlers =
                        [
                            // Draft-06 keywords not included in Draft-2020-12
                            global::Json.Schema.Keywords.Draft06.DefinitionsKeyword.Instance,
                            // Custom XSD/format keywords
                            FormatExclusiveMaximumKeyword.Instance,
                            FormatExclusiveMinimumKeyword.Instance,
                            FormatMaximumKeyword.Instance,
                            FormatMinimumKeyword.Instance,
                            InfoKeyword.Instance,
                            XsdAnyKeyword.Instance,
                            XsdAnyAttributeKeyword.Instance,
                            XsdAttributeKeyword.Instance,
                            XsdMaxOccursKeyword.Instance,
                            XsdMinOccursKeyword.Instance,
                            XsdNamespacesKeyword.Instance,
                            XsdNillableKeyword.Instance,
                            XsdRestrictionsKeyword.Instance,
                            XsdRootElementKeyword.Instance,
                            XsdSchemaAttributesKeyword.Instance,
                            XsdStructureKeyword.Instance,
                            XsdTextKeyword.Instance,
                            XsdTotalDigitsKeyword.Instance,
                            XsdTypeKeyword.Instance,
                            XsdUnhandledAttributesKeyword.Instance,
                            XsdUnhandledEnumAttributesKeyword.Instance,
                        ];

                        s_dialect = Dialect.Draft202012.With(
                            customHandlers,
                            id: Dialect.Draft202012.Id,
                            allowUnknownKeywords: true
                        );
                        Dialect.Default = s_dialect;

                        s_keywordsRegistered = true;
                    }
                }
            }
        }

        /// <summary>
        /// Gets fresh build options configured with the custom dialect.
        /// A new instance is created each time to avoid schema registry conflicts.
        /// </summary>
        public static BuildOptions GetBuildOptions()
        {
            RegisterXsdKeywords();
            var dialectRegistry = new DialectRegistry();
            dialectRegistry.Register(s_dialect);
            return new BuildOptions
            {
                Dialect = s_dialect,
                SchemaRegistry = new SchemaRegistry(),
                DialectRegistry = dialectRegistry,
            };
        }
    }
}
