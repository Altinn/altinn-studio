using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Utils
{
    /// <summary>
    /// Represents a list of keyword data items that can be handled in random order,
    /// and the remaining items can be handled by enumerating unhandled items.
    /// </summary>
    public class WorkList : IEnumerable<KeywordData>
    {
        private class WorkItem
        {
            public bool Handled { get; private set; }

            public KeywordData Value { get; }

            public WorkItem(KeywordData value)
            {
                Value = value;
            }

            public void MarkAsHandled()
            {
                Handled = true;
            }
        }

        private readonly List<WorkItem> _list;

        /// <summary>
        /// Create a new instance from a schema's keywords.
        /// </summary>
        public WorkList(JsonSchema schema)
        {
            var keywords = schema.Root?.Keywords ?? [];
            _list = new List<WorkItem>(keywords.Select(item => new WorkItem(item)));
        }

        /// <summary>
        /// Create a new instance from a list of keyword data.
        /// </summary>
        public WorkList(IEnumerable<KeywordData> keywords)
        {
            _list = new List<WorkItem>(keywords.Select(item => new WorkItem(item)));
        }

        /// <summary>
        /// Find the first work item with the given handler type and mark it as handled.
        /// </summary>
        public void MarkAsHandled<T>()
            where T : IKeywordHandler
        {
            WorkItem item = _list.SingleOrDefault(x => x.Value.Handler is T);
            if (item == null || item.Handled)
            {
                return;
            }

            item.MarkAsHandled();
        }

        /// <summary>
        /// Find the first work item with the given handler name and mark it as handled.
        /// </summary>
        public void MarkAsHandledByName(string handlerName)
        {
            WorkItem item = _list.SingleOrDefault(x => x.Value.Handler.Name == handlerName);
            if (item == null || item.Handled)
            {
                return;
            }

            item.MarkAsHandled();
        }

        /// <summary>
        /// Get the first work item with the given handler type and mark it as handled.
        /// </summary>
        public KeywordData Pull<T>()
            where T : IKeywordHandler
        {
            WorkItem item = _list.SingleOrDefault(x => x.Value.Handler is T);
            if (item == null || item.Handled)
            {
                return null;
            }

            item.MarkAsHandled();
            return item.Value;
        }

        /// <summary>
        /// Try to get the first work item with the given handler type and mark it as handled.
        /// </summary>
        public bool TryPull<T>(out KeywordData result)
            where T : IKeywordHandler
        {
            WorkItem item = _list.SingleOrDefault(x => x.Value.Handler is T);
            if (item == null || item.Handled)
            {
                result = null;
                return false;
            }

            item.MarkAsHandled();
            result = item.Value;
            return true;
        }

        /// <summary>
        /// Get an enumerable of all unhandled items.
        /// </summary>
        public IEnumerable<KeywordData> EnumerateUnhandledItems(bool markAsHandled = true)
        {
            foreach (WorkItem item in _list.Where(item => !item.Handled))
            {
                if (markAsHandled)
                {
                    item.MarkAsHandled();
                }

                yield return item.Value;
            }
        }

        /// <summary>
        /// Get the enumerator for all work items in the list, including handled items.
        /// </summary>
        public IEnumerator<KeywordData> GetEnumerator()
        {
            return _list.Select(item => item.Value).GetEnumerator();
        }

        /// <summary>
        /// Get the enumerator for all work items in the list, including handled items.
        /// </summary>
        IEnumerator IEnumerable.GetEnumerator()
        {
            return GetEnumerator();
        }

        /// <summary>
        /// Converts to JsonSchema by rebuilding from the source JSON of each keyword.
        /// </summary>
        public JsonSchema AsJsonSchema()
        {
            var builder = new JsonSchemaBuilder();
            foreach (var workItem in _list)
            {
                var name = workItem.Value.Handler.Name;
                var rawValue = workItem.Value.RawValue;

                if (workItem.Value.Subschemas is { Length: > 0 })
                {
                    // For keywords with subschemas, use the raw JSON value
                    builder.Add(name, JsonNode.Parse(rawValue.GetRawText()));
                }
                else
                {
                    builder.Add(name, JsonNode.Parse(rawValue.GetRawText()));
                }
            }

            return builder.Build(JsonSchemaKeywords.GetBuildOptions());
        }
    }
}
