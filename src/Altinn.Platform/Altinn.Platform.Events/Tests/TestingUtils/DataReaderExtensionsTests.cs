using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Altinn.Platform.Events.Extensions;

using Xunit;

namespace Altinn.Platform.Events.Tests.TestingUtils
{
    public class DataReaderExtensionsTests
    {
        public enum TestNum
        {
            Default,
            Firsted,
            Seconded,
            Thirded
        }

        [Fact]
        public void GetValue_ColumnIsInt()
        {
            // Arrange
            const int testValue = 1337;
            var reader = GetDataReader(testValue);
            reader.Read();

            // Act
            var actual = reader.GetValue<int>("Column");

            // Assert
            Assert.Equal(testValue, actual);
        }

        [Fact]
        public void GetValue_ColumnIsInt_ReadAsNullable_ReturnsValue()
        {
            // Arrange
            const int testValue = 1337;
            var reader = GetDataReader(testValue);
            reader.Read();

            // Act
            var actual = reader.GetValue<int?>("Column");

            // Assert
            Assert.Equal(testValue, actual);
        }

        [Fact]
        public void GetValue_ColumnIsInt_ReadAsEnum_ReturnsEnumValue()
        {
            // Arrange
            var reader = GetDataReader(1);
            reader.Read();

            // Act
            var actual = reader.GetValue<TestNum>("Column");

            // Assert
            Assert.Equal(TestNum.Firsted, actual);
        }

        [Fact]
        public void GetValue_ColumnIsInt_ValueIsDbNull_ReturnsZero()
        {
            // Arrange
            var reader = GetDataReader<int>();
            reader.Read();

            // Act
            var actual = reader.GetValue<int>("Column");

            // Assert
            Assert.Equal(0, actual);
        }

        [Fact]
        public void GetValue_ColumnIsInt_ValueIsDbNull_ReadAsNullable_ReturnsZero()
        {
            // Arrange
            var reader = GetDataReader<int>();
            reader.Read();

            // Act
            var actual = reader.GetValue<int?>("Column");

            // Assert
            Assert.Null(actual);
        }

        [Fact]
        public void GetValue_ColumnIsString()
        {
            // Arrange
            const string testValue = "hello";
            var reader = GetDataReader(testValue);
            reader.Read();

            // Act
            var actual = reader.GetValue<string>("Column");

            // Assert
            Assert.Equal(testValue, actual);
        }

        [Fact]
        public void GetValue_ColumnIsString_ValueIsDbNull_ReturnsNull()
        {
            // Arrange
            var reader = GetDataReader<string>();
            reader.Read();

            // Act
            var actual = reader.GetValue<string>("Column");

            // Assert
            Assert.Null(actual);
        }

        [Fact]
        public void GetValue_ColumnIsString_ReadAsEnum_ReturnsEnumValue()
        {
            // Arrange
            var reader = GetDataReader("Thirded");
            reader.Read();

            // Act
            var actual = reader.GetValue<TestNum>("Column");

            // Assert
            Assert.Equal(TestNum.Thirded, actual);
        }

        [Fact]
        public void GetValue_ColumnIsDateTime()
        {
            // Arrange
            var testValue = DateTime.Parse("2021-02-13T12:33:12.2313Z");
            var reader = GetDataReader(testValue);
            reader.Read();

            // Act
            var actual = reader.GetValue<DateTime>("Column");

            // Assert
            Assert.Equal(testValue, actual);
        }

        [Fact]
        public void GetValue_ColumnIsDateTime_ReadAsNullable_ReturnsValue()
        {
            // Arrange
            var testValue = DateTime.Parse("2021-02-13T12:33:12.2313Z");
            var reader = GetDataReader(testValue);
            reader.Read();

            // Act
            var actual = reader.GetValue<DateTime?>("Column");

            // Assert
            Assert.Equal(testValue, actual);
        }

        [Fact]
        public void GetValue_ColumnIsDateTime_ValueIsDbNull_ReturnsDateTimeMinValue()
        {
            // Arrange
            var reader = GetDataReader<DateTime>();
            reader.Read();

            // Act
            var actual = reader.GetValue<DateTime>("Column");

            // Assert
            Assert.Equal(DateTime.MinValue, actual);
        }

        private IDataReader GetDataReader<T>()
        {
            DataTable table = new DataTable();
            table.Columns.Add(new DataColumn("Column", typeof(T)));

            DataRow row = table.NewRow();
            row["Column"] = DBNull.Value;
            table.Rows.Add(row);

            return new DataTableReader(table);
        }

        private IDataReader GetDataReader<T>(T value)
        {
            DataTable table = new DataTable();
            table.Columns.Add(new DataColumn("Column", typeof(T)));

            DataRow row = table.NewRow();
            row["Column"] = value;
            table.Rows.Add(row);

            return new DataTableReader(table);
        }
    }
}
