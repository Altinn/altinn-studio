using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Services.Localtest.Interface
{
    public interface ILocalTestAppSelection
    {

        public void SetAppPath(string path);

        public string GetAppPath();
    }
}
