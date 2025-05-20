// Utility functions for SQL visualization

// Get color for different node types
export function getNodeColor(type) {
    const colors = {
        'select': '#2196F3',
        'from': '#4CAF50',
        'where': '#FF9800',
        'join': '#9C27B0',
        'table': '#F44336',
        'column': '#00BCD4',
        'condition': '#FFC107',
        'root': '#607D8B'
    };
    return colors[type.toLowerCase()] || '#607D8B';
}

// Get operation description for different SQL operations
export function getOperationDescription(type) {
    const descriptions = {
        'SELECT': 'Retrieves data from specified columns',
        'FROM': 'Specifies the source tables',
        'WHERE': 'Filters rows based on conditions',
        'JOIN': 'Combines rows from multiple tables',
        'GROUP BY': 'Groups rows with the same values',
        'HAVING': 'Filters groups based on conditions',
        'ORDER BY': 'Sorts the result set',
        'LIMIT': 'Limits the number of rows returned',
        'OFFSET': 'Skips the specified number of rows',
        'UNION': 'Combines results of multiple queries',
        'INTERSECT': 'Returns common rows between queries',
        'EXCEPT': 'Returns rows from first query not in second',
        'INSERT': 'Adds new records to a table',
        'UPDATE': 'Modifies existing records',
        'DELETE': 'Removes records from a table',
        'CREATE': 'Creates a new database object',
        'ALTER': 'Modifies an existing database object',
        'DROP': 'Removes a database object',
        'INDEX': 'Creates or modifies an index',
        'VIEW': 'Creates or modifies a view'
    };
    return descriptions[type] || 'Performs a database operation';
}

// Format SQL for display
export function formatSql(sql) {
    return sql.trim()
        .replace(/\s+/g, ' ')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .replace(/\s*,\s*/g, ', ');
}

// Create a unique ID for nodes
export function createNodeId(prefix, index) {
    return `${prefix}-${index}`;
}

// Debounce function for performance optimization
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 