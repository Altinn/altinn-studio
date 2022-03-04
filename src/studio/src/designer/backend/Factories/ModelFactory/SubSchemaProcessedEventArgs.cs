using System;
using Json.Pointer;
using Json.Schema;

namespace Altinn.Studio.Designer.Factories.ModelFactory
{
    /// <summary>
    /// Event args added when a sub schema has been processed.
    /// </summary>
    public class SubSchemaProcessedEventArgs : EventArgs
    {
        /// <summary>
        /// The path to the sub schema that was processed.
        /// </summary>
        public JsonPointer Path { get; set; }

        /// <summary>
        /// The sub schema that was processed.
        /// </summary>
        public JsonSchema SubSchema { get; set; }
    }
}
