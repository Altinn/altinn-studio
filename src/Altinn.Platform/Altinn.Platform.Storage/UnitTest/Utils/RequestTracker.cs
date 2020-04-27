using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.UnitTest.Utils
{
    public static class RequestTracker
    {
        private static Dictionary<string, List<object>> _tracker = new Dictionary<string, List<object>>();


        public static int GetRequestCount(string requestKey)
        {
            if (_tracker.ContainsKey(requestKey))
            {
                return _tracker[requestKey].Count();
            }

            return 0;
        }


        public static void AddRequest(string requestKey, object request)
        {
            if (!_tracker.ContainsKey(requestKey))
            {
                _tracker.Add(requestKey, new List<object>());
            }

            _tracker[requestKey].Add(request);
        }

        public static void Clear()
        {
            _tracker = new Dictionary<string, List<object>>();
        }
    }
}
