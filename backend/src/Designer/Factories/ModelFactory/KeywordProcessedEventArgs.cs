using System;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.Designer.Factories.ModelFactory
{
    /// <summary>
    /// Event args added when a keyword has been processed.
    /// </summary>
    public class KeywordProcessedEventArgs : EventArgs
    {
        /// <summary>
        /// The path to the keyword that was processed.
        /// </summary>
        public JsonPointer Path { get; set; }

        /// <summary>
        /// The keyword that was processed.
        /// </summary>
        public IJsonSchemaKeyword Keyword { get; set; }
    }
}
