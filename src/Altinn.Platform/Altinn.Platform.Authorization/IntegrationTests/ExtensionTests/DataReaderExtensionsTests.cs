using System;
using System.Data;

using Altinn.Platform.Authorization.Extensions;

using Xunit;

namespace Altinn.Platform.Authorization.Tests.ExtensionTests
{
    public class DataReaderExtensionsTests
    {
        private const string ColumnName = "Column";

        public enum TestNum
        {
            Default,
            Firsted,
            Seconded,
            Thirded
        }

        [Fact]
        public void GetValue_ColumnIsInt_ColumnHasValue_ReadAsInt_ReturnsValue()
        {
            // Arrange
            const int testValue = 1337;
            var reader = GetDataReader(ColumnName, typeof(int), testValue);
            reader.Read();

            // Act
            var actual = reader.GetValue<int>(ColumnName);

            // Assert
            Assert.Equal(testValue, actual);
        }

        [Fact]
        public void GetValue_ColumnIsInt_ColumnHasValue_ReadAsNullableInt_ReturnsValue()
        {
            // Arrange
            const int testValue = 1337;
            var reader = GetDataReader(ColumnName, typeof(int), testValue);
            reader.Read();

            // Act
            var actual = reader.GetValue<int?>(ColumnName);

            // Assert
            Assert.Equal(testValue, actual);
        }

        [Fact]
        public void GetValue_ColumnIsInt_ColummnHasDbNull_ReadAsInt_ReturnsZero()
        {
            // Arrange
            var reader = GetDataReader(ColumnName, typeof(int), DBNull.Value);
            reader.Read();

            // Act
            var actual = reader.GetValue<int>(ColumnName);

            // Assert
            Assert.Equal(0, actual);
        }

        [Fact]
        public void GetValue_ColumnIsInt_ColummnHasDbNull_ReadAsNullableInt_ReturnsNull()
        {
            // Arrange
            var reader = GetDataReader(ColumnName, typeof(int), DBNull.Value);
            reader.Read();

            // Act
            var actual = reader.GetValue<int?>(ColumnName);

            // Assert
            Assert.Null(actual);
        }

        [Fact]
        public void GetValue_ColumnIsInt_ColumnHasValue_ReadAsEnum_ReturnsEnumValue()
        {
            // Arrange
            var reader = GetDataReader(ColumnName, typeof(int), 1);
            reader.Read();

            // Act
            var actual = reader.GetValue<TestNum>(ColumnName);

            // Assert
            Assert.Equal(TestNum.Firsted, actual);
        }

        [Fact]
        public void GetValue_ColumnIsInt_ColumnHasDbNull_ReadAsEnum_ReturnsEnumDefaultValue()
        {
            // Arrange
            var reader = GetDataReader(ColumnName, typeof(int), DBNull.Value);
            reader.Read();

            // Act
            var actual = reader.GetValue<TestNum>(ColumnName);

            // Assert
            Assert.Equal(TestNum.Default, actual);
        }

        [Fact]
        public void GetValue_ColumnIsLong_ColumnHasValueTooLarge_ReadAsInt_ThrowsException()
        {
            // Arrange
            IDataReader reader = GetDataReader(ColumnName, typeof(long), 1000000L * 1000000L);
            reader.Read();

            InvalidCastException actual = null;

            // Act
            try
            {
                _ = reader.GetValue<int>(ColumnName);
            }
            catch (InvalidCastException icex)
            {
                actual = icex;
            }

            // Assert
            Assert.NotNull(actual);
            Assert.Contains("Error trying to interpret data in column", actual.Message);
        }

        [Fact]
        public void GetValue_ColumnIsString_ColumnHasValue_ReadAsString_ReturnsValue()
        {
            // Arrange
            const string testValue = "hello";
            var reader = GetDataReader(ColumnName, typeof(string), testValue);
            reader.Read();

            // Act
            var actual = reader.GetValue<string>(ColumnName);

            // Assert
            Assert.Equal(testValue, actual);
        }

        [Fact]
        public void GetValue_ColumnIsString_ColumnHasDbNull_ReadAsString_ReturnsNull()
        {
            // Arrange
            var reader = GetDataReader(ColumnName, typeof(string), DBNull.Value);
            reader.Read();

            // Act
            var actual = reader.GetValue<string>(ColumnName);

            // Assert
            Assert.Null(actual);
        }

        [Fact]
        public void GetValue_ColumnIsString_ColumnHasValue_ReadAsEnum_ReturnsEnumValue()
        {
            // Arrange
            var reader = GetDataReader(ColumnName, typeof(string), "Thirded");
            reader.Read();

            // Act
            var actual = reader.GetValue<TestNum>(ColumnName);

            // Assert
            Assert.Equal(TestNum.Thirded, actual);
        }

        [Fact]
        public void GetValue_ColumnIsString_ColumnHasInvalidValue_ReadAsEnum_ThrowsException()
        {
            // Arrange
            var reader = GetDataReader(ColumnName, typeof(string), "NotValid");
            reader.Read();

            InvalidCastException actual = null;

            // Act
            try
            {
                _ = reader.GetValue<TestNum>(ColumnName);
            }
            catch (InvalidCastException icex)
            {
                actual = icex;
            }

            // Assert
            Assert.NotNull(actual);
            Assert.Contains("Error trying to interpret data in column", actual.Message);
        }

        [Fact]
        public void GetValue_ColumnIsDateTime_ColumnHasValue_ReadAsDateTime_ReturnsValue()
        {
            // Arrange
            var testValue = DateTime.Parse("2021-02-13T12:33:12.2313Z");
            var reader = GetDataReader(ColumnName, typeof(DateTime), testValue);
            reader.Read();

            // Act
            var actual = reader.GetValue<DateTime>(ColumnName);

            // Assert
            Assert.Equal(testValue, actual);
        }

        [Fact]
        public void GetValue_ColumnIsDateTime_ColumnHasValue_ReadAsNullableDateTime_ReturnsValue()
        {
            // Arrange
            var testValue = DateTime.Parse("2021-02-13T12:33:12.2313Z");
            var reader = GetDataReader(ColumnName, typeof(DateTime), testValue);
            reader.Read();

            // Act
            var actual = reader.GetValue<DateTime?>(ColumnName);

            // Assert
            Assert.Equal(testValue, actual);
        }

        [Fact]
        public void GetValue_ColumnIsDateTime_ColumnsHasDbNull_ReturnsDateTimeMinValue()
        {
            // Arrange
            var reader = GetDataReader(ColumnName, typeof(DateTime), DBNull.Value);
            reader.Read();

            // Act
            var actual = reader.GetValue<DateTime>(ColumnName);

            // Assert
            Assert.Equal(DateTime.MinValue, actual);
        }

        private static IDataReader GetDataReader(string columnName, Type type, object value)
        {
            DataTable table = GetDataTableWithColumnOfType(columnName, type);
            AddRowWithValue(table, columnName, value);
            return new DataTableReader(table);
        }

        private static DataTable GetDataTableWithColumnOfType(string columnName, Type type)
        {
            DataTable table = new DataTable();
            table.Columns.Add(new DataColumn(columnName, type));
            return table;
        }

        private static void AddRowWithValue(DataTable table, string columnName, object value)
        {
            DataRow row = table.NewRow();
            row[columnName] = value;
            table.Rows.Add(row);
        }
    }
}
