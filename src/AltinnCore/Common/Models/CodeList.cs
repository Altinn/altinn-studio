using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Models
{
	public class CodeList
	{
		/// <summary>
		/// The name of the code list
		/// </summary>
		public string CodeListName { get; set; }

		/// <summary>
		/// The ORG the code list belongs to
		/// </summary>
		public string Org { get; set; }

		/// <summary>
		/// The service the code list belongs to
		/// </summary>
		public string Service { get; set; }

		/// <summary>
		/// The code list id
		/// </summary>
		public int Id { get; set; }
	}
}