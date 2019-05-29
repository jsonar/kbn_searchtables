/**
 * Filters a table or table group based on a search string.
 *
 * @param {TableGroup|Table} table The table or table group to filter.
 * @param {String} search The string to search for (case-insensitive).
 *
 * @return Nothing (filtering is in-place).
 */
export function filterTableBySearch(table, search) {
  const filter = makeTableFilter(search);
  filterTable(table, filter);
}

function makeTableFilter(search) {
  const fieldsMatch = makeFieldMatcher(search);
  return row => Object.values(row).some(fieldsMatch);
}

function makeFieldMatcher(search) {
  return field => isBucket(field) && fieldMatches(field, search);
}

function isBucket(field) {
  return field.type === 'bucket';
}

function fieldMatches(field, search) {
  const fieldFormatter = field.aggConfig.fieldFormatter('text');
  const fieldLower = fieldFormatter(field.value).toLowerCase();
  const searchLower = search.toLowerCase();
  return fieldLower.includes(searchLower);
}

function filterTable(table, filter) {
  if (table.tables) {
    table.tables.forEach(subtable => filterTable(subtable, filter));
  } else if (table.rows) {
    table.rows = table.rows.filter(filter);
  }
}
