using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Altinn.Studio.DataModeling.Utils
{
    /// <summary>
    /// <p>
    ///     Represents a list of items that can be handled in random order, and the remaining items can be handled by enumerating unhandled items <see cref="EnumerateUnhandledItems"/>
    /// </p>
    /// <p>
    ///     This class uses type to separate work items, and multiple instances per type are supported. When getting a work item by type it will pull the first available one.
    /// </p>
    /// </summary>
    /// <typeparam name="T">Work item base type</typeparam>
    public class WorkList<T> : IEnumerable<T>
    {
        private class WorkItem
        {
            public bool Handled { get; private set; }

            public T Value { get; }

            public WorkItem(T value)
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
        /// Create a new instance of the WorkItem class
        /// </summary>
        /// <param name="list">A list of work items to be processed</param>
        public WorkList(IEnumerable<T> list)
        {
            _list = new List<WorkItem>(list.Select(item => new WorkItem(item)));
        }

        /// <summary>
        /// Find the first work item of type <typeparamref name="TT"/> and mark it as handled.
        /// </summary>
        /// <typeparam name="TT">The type of work item to pull</typeparam>
        public void MarkAsHandled<TT>()
            where TT : T
        {
            WorkItem item = _list.SingleOrDefault(x => x.Value is TT);
            if (item == null || item.Handled)
            {
                return;
            }

            item.MarkAsHandled();
        }

        /// <summary>
        /// Get the first work item of type <typeparamref name="TT"/> and mark it as handled.
        /// </summary>
        /// <typeparam name="TT">The type of work item to pull</typeparam>
        /// <returns>The work item or default/null if no unhandled work items of the given type was found in the list</returns>
        public TT Pull<TT>()
            where TT : T
        {
            WorkItem item = _list.SingleOrDefault(x => x.Value is TT);
            if (item == null || item.Handled)
            {
                return default;
            }

            item.MarkAsHandled();
            return (TT)item.Value;
        }

        /// <summary>
        /// Get the first work item of type <typeparamref name="TT"/> and mark it as handled.
        /// </summary>
        /// <typeparam name="TT">The type of work item to pull</typeparam>
        /// <param name="result">The work item or default/null if no unhandled work items of the given type was found in the list</param>
        /// <returns><code>true</code> if an unhandled work item was found, <code>false</code> if not</returns>
        public bool TryPull<TT>(out TT result)
            where TT : T
        {
            WorkItem item = _list.SingleOrDefault(x => x.Value is TT);
            if (item == null || item.Handled)
            {
                result = default;
                return false;
            }

            item.MarkAsHandled();
            result = (TT)item.Value;
            return true;
        }

        /// <summary>
        /// Get an enumerable of all the items left in the work list that have not been marked as handled.
        /// </summary>
        /// <param name="markAsHandled">Mark the work items as handled when enumerating over them</param>
        /// <returns>Enumerable of all unhandled work items</returns>
        public IEnumerable<T> EnumerateUnhandledItems(bool markAsHandled = true)
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
        /// <returns>Enumerator for all work items, including handled items.</returns>
        public IEnumerator<T> GetEnumerator()
        {
            return _list
               .Select(item => item.Value)
               .GetEnumerator();
        }

        /// <summary>
        /// Get the enumerator for all work items in the list, including handled items.
        /// </summary>
        /// <returns>Enumerator for all work items, including handled items.</returns>
        IEnumerator IEnumerable.GetEnumerator()
        {
            return GetEnumerator();
        }
    }
}
