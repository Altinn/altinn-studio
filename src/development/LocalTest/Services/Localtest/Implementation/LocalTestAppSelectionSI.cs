using LocalTest.Services.Localtest.Interface;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Services.Localtest.Implementation
{
    public class LocalTestAppSelectionSI : ILocalTestAppSelection
    {
        private string _appPath;

        public string GetAppPath()
        {
            return _appPath;
        }

        public void SetAppPath(string path)
        {
            _appPath = path;
        }
    }
}
