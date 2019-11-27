using Altinn.Platform.Storage.Repository;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Services.Storage.Implementation
{
    public class DataRepository : IDataRepository

    {
        public Task<bool> DeleteDataInStorage(string fileName)
        {
            throw new NotImplementedException();
        }

        public Task<Stream> ReadDataFromStorage(string fileName)
        {
            throw new NotImplementedException();
        }

        public Task<long> WriteDataToStorage(Stream fileStream, string fileName)
        {
            throw new NotImplementedException();
        }
    }
}
