using System;
using System.Collections.Generic;
using System.Text;

namespace Storage.Interface.Clients
{
    class StorageClientException : Exception
    {

        public StorageClientException(string message) : base(message)
        {
        }

        public StorageClientException(string message, Exception inner) : base(message, inner)
        {
        }
    }
}
