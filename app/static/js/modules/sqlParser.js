// SQL Parser Module
export function parseSqlQuery(query) {
    const root = {
        type: "root",
        name: "Query",
        children: []
    };

    try {
        const clauses = extractClauses(query);
        console.log('Extracted clauses:', clauses);
        
        // Process SELECT clause first
        if (clauses.SELECT) {
            const selectNode = {
                type: "select",
                name: "SELECT",
                children: []
            };

            const columns = clauses.SELECT.split(',').map(col => {
                const colParts = col.trim().split(/\s+[Aa][Ss]\s+/);
                const name = colParts[colParts.length - 1].trim();
                const expression = colParts[0].trim();
                return {
                    type: expression.toUpperCase().includes('COUNT(') || 
                          expression.toUpperCase().includes('SUM(') || 
                          expression.toUpperCase().includes('AVG(') ? 'aggregate' : 'column',
                    name: colParts.length > 1 ? `${expression} AS ${name}` : expression,
                    children: []
                };
            });
            selectNode.children = columns;
            root.children.push(selectNode);
        }

        // Process FROM and JOINs
        if (clauses.FROM) {
            const fromNode = {
                type: "from",
                name: "FROM",
                children: []
            };

            // Add base table
            const baseTableMatch = clauses.FROM.match(/(\w+)\s+(?:AS\s+)?(\w+)/i);
            if (baseTableMatch) {
                fromNode.children.push({
                    type: "table",
                    name: baseTableMatch[1],
                    alias: baseTableMatch[2],
                    children: []
                });
            }

            // Process JOINs
            if (clauses.JOINS) {
                clauses.JOINS.forEach(joinClause => {
                    const joinMatch = joinClause.match(/JOIN\s+(\w+)\s+(?:AS\s+)?(\w+)\s+ON\s+(.+)/i);
                    if (joinMatch) {
                        const [_, tableName, alias, condition] = joinMatch;
                        const joinNode = {
                            type: "join",
                            name: "JOIN",
                            children: [
                                {
                                    type: "condition",
                                    name: condition.trim(),
                                    children: []
                                },
                                {
                                    type: "table",
                                    name: tableName,
                                    alias: alias,
                                    children: []
                                }
                            ]
                        };
                        fromNode.children.push(joinNode);
                    }
                });
            }

            root.children.push(fromNode);
        }

        // Process GROUP BY clause
        if (clauses['GROUP BY']) {
            const groupNode = {
                type: "group",
                name: "GROUP BY",
                children: clauses['GROUP BY'].split(',').map(col => ({
                    type: "column",
                    name: col.trim(),
                    children: []
                }))
            };
            root.children.push(groupNode);
        }

        // Process HAVING clause
        if (clauses.HAVING) {
            const havingNode = {
                type: "having",
                name: "HAVING",
                children: clauses.HAVING.split(/\s+AND\s+/i).map(cond => ({
                    type: "condition",
                    name: cond.trim(),
                    children: []
                }))
            };
            root.children.push(havingNode);
        }

        // Process ORDER BY clause
        if (clauses['ORDER BY']) {
            const orderNode = {
                type: "orderby",
                name: "ORDER BY",
                children: clauses['ORDER BY'].split(',').map(col => ({
                    type: "column",
                    name: col.trim(),
                    children: []
                }))
            };
            root.children.push(orderNode);
        }

    } catch (error) {
        console.error('Error parsing SQL:', error);
    }

    return root;
}

function extractClauses(query) {
    const clauses = {};
    const clausePatterns = [
        { 
            key: 'SELECT', 
            pattern: /SELECT\s+([\s\S]*?)(?=\s+FROM\s+|$)/i 
        },
        { 
            key: 'FROM', 
            pattern: /FROM\s+(.*?)(?=\s+(?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)?\s*JOIN\s+|\s+WHERE\s+|\s+GROUP\s+BY\s+|\s+HAVING\s+|\s+ORDER\s+BY\s+|$)/i 
        },
        { 
            key: 'JOINS', 
            pattern: /((?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)?\s*JOIN\s+.*?(?=\s+(?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)?\s*JOIN\s+|\s+WHERE\s+|\s+GROUP\s+BY\s+|\s+HAVING\s+|\s+ORDER\s+BY\s+|$))/gi 
        },
        { 
            key: 'WHERE', 
            pattern: /WHERE\s+(.*?)(?=\s+GROUP\s+BY\s+|\s+HAVING\s+|\s+ORDER\s+BY\s+|$)/i 
        },
        { 
            key: 'GROUP BY', 
            pattern: /GROUP\s+BY\s+(.*?)(?=\s+HAVING\s+|\s+ORDER\s+BY\s+|$)/i 
        },
        { 
            key: 'HAVING', 
            pattern: /HAVING\s+(.*?)(?=\s+ORDER\s+BY\s+|$)/i 
        },
        { 
            key: 'ORDER BY', 
            pattern: /ORDER\s+BY\s+(.*?)(?=\s+LIMIT\s+|;|$)/i 
        }
    ];

    // Extract clauses using patterns
    clausePatterns.forEach(({ key, pattern }) => {
        if (key === 'JOINS') {
            // Special handling for JOINS as there can be multiple
            const matches = [...query.matchAll(pattern)];
            if (matches.length > 0) {
                clauses[key] = matches.map(match => match[1].trim());
            }
        } else {
            const match = query.match(pattern);
            if (match) {
                clauses[key] = match[1].trim();
            }
        }
    });

    console.log('Extracted clauses:', clauses);
    return clauses;
}

function parseColumns(columnsStr) {
    return columnsStr.split(',').map(col => {
        const colParts = col.trim().split(/\s+AS\s+/i);
        const name = colParts[colParts.length - 1].trim();
        return {
            type: 'column',
            name: name,
            children: []
        };
    });
}

function parseFromClause(fromStr) {
    const fromNode = {
        type: 'from',
        name: 'FROM',
        children: []
    };

    // Split on JOIN keywords, preserving the JOIN type
    const joinPattern = /\s+(LEFT|RIGHT|INNER|OUTER|CROSS|FULL)?\s*JOIN\s+/i;
    const parts = fromStr.split(joinPattern).filter(Boolean);
    
    // Process base table
    const baseTableParts = parts[0].trim().split(/\s+(?:AS\s+)?/i);
    const baseTableName = baseTableParts[0];
    const baseTableAlias = baseTableParts[1] || baseTableName;
    
    // Create the initial FROM node with the base table
    let currentNode = {
        type: 'table',
        name: baseTableName,
        alias: baseTableAlias,
        children: []
    };
    fromNode.children.push(currentNode);

    // Process joins in sequence
    for (let i = 1; i < parts.length; i += 2) {
        if (parts[i] && parts[i + 1]) {
            const joinType = parts[i].trim();
            const [tableStr, ...conditions] = parts[i + 1].split(/\s+ON\s+/i);
            
            // Parse table and alias
            const tableParts = tableStr.trim().split(/\s+(?:AS\s+)?/i);
            const tableName = tableParts[0];
            const tableAlias = tableParts[1] || tableName;

            // Create condition node if present
            let conditionNode = null;
            if (conditions.length > 0) {
                conditionNode = {
                    type: 'condition',
                    name: conditions.join(' AND '),
                    children: []
                };
            }
            
            // Create join node with table
            const joinNode = {
                type: 'join',
                name: 'JOIN',
                children: []
            };

            // Add condition above if present
            if (conditionNode) {
                joinNode.children.push(conditionNode);
            }

            // Add table node
            joinNode.children.push({
                type: 'table',
                name: tableName,
                alias: tableAlias,
                children: []
            });

            fromNode.children.push(joinNode);
        }
    }

    return fromNode;
}

function parseTable(tableStr) {
    const parts = tableStr.trim().split(/\s+AS\s+|\s+/i);
    return {
        type: 'table',
        name: parts[parts.length - 1].trim(),
        children: []
    };
}

function parseConditions(condStr) {
    return condStr.split(/\s+AND\s+|\s+OR\s+/i).map(cond => ({
        type: 'condition',
        name: cond.trim(),
        children: []
    }));
}

// Other parsing functions (parseInsert, parseUpdate, etc.) would go here...

export function createHierarchicalData(components) {
    return JSON.parse(JSON.stringify(components));
}

// Split SQL query into clauses
function splitSqlIntoClauses(query) {
    const clauses = {};
    const upperQuery = query.toUpperCase();
    
    // Extract SELECT
    const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/i);
    if (selectMatch) {
        clauses['SELECT'] = selectMatch[1].trim();
    }

    // Extract FROM and JOINs
    const fromJoinPattern = /FROM\s+(.*?)(?=\s+WHERE|\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/is;
    const fromMatch = query.match(fromJoinPattern);
    if (fromMatch) {
        const fromSection = fromMatch[1].trim();
        
        // Find the base table (everything before the first JOIN)
        const joinIndex = fromSection.toUpperCase().indexOf('JOIN');
        if (joinIndex === -1) {
            clauses['FROM'] = fromSection;
        } else {
            clauses['FROM'] = fromSection.substring(0, joinIndex).trim();
            
            // Extract all JOIN clauses
            const joinPattern = /((?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)?\s*JOIN\s+.*?(?=(?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)?\s*JOIN|$))/gi;
            clauses['JOINS'] = [];
            let joinMatch;
            let joinText = fromSection.substring(joinIndex);
            
            while ((joinMatch = joinPattern.exec(joinText)) !== null) {
                clauses['JOINS'].push(joinMatch[1].trim());
            }
        }
    }

    // Extract WHERE
    const whereMatch = query.match(/WHERE\s+(.*?)(?=\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
        clauses['WHERE'] = whereMatch[1].trim();
    }

    // Extract GROUP BY
    const groupByMatch = query.match(/GROUP\s+BY\s+(.*?)(?=\s+HAVING|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (groupByMatch) {
        clauses['GROUP BY'] = groupByMatch[1].trim();
    }

    // Extract HAVING
    const havingMatch = query.match(/HAVING\s+(.*?)(?=\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (havingMatch) {
        clauses['HAVING'] = havingMatch[1].trim();
    }

    // Extract ORDER BY
    const orderByMatch = query.match(/ORDER\s+BY\s+(.*?)(?=\s+LIMIT|$)/i);
    if (orderByMatch) {
        clauses['ORDER BY'] = orderByMatch[1].trim();
    }

    // Extract LIMIT
    const limitMatch = query.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
        clauses['LIMIT'] = limitMatch[1].trim();
    }

    console.log('Split clauses:', clauses);
    return clauses;
}

// Parse SQL query into a tree structure
function parseSqlToTree(query) {
    const root = {
        name: 'Query',
        type: 'root',
        children: []
    };

    // Split query into clauses
    const clauses = splitSqlIntoClauses(query);
    console.log('Parsed clauses:', clauses);
    
    // Process SELECT clause first
    if (clauses['SELECT']) {
        const selectNode = {
            name: 'SELECT',
            type: 'select',
            children: []
        };

        const columns = clauses['SELECT'].split(',').map(col => {
            const colParts = col.trim().split(/\s+[Aa][Ss]\s+/);
            const name = colParts[colParts.length - 1].trim();
            const expression = colParts[0].trim();
            return {
                name: colParts.length > 1 ? `${expression} AS ${name}` : expression,
                type: expression.toUpperCase().includes('COUNT(') || 
                      expression.toUpperCase().includes('SUM(') || 
                      expression.toUpperCase().includes('AVG(') ? 'aggregate' : 'column',
                children: []
            };
        });
        selectNode.children = columns;
        root.children.push(selectNode);
    }

    // Process FROM and JOINs
    if (clauses['FROM']) {
        const fromNode = {
            name: 'FROM',
            type: 'from',
            children: []
        };

        // Add base table
        const baseTableMatch = clauses['FROM'].match(/(\w+)\s+(?:AS\s+)?(\w+)/i);
        if (baseTableMatch) {
            fromNode.children.push({
                type: 'table',
                name: baseTableMatch[1],
                alias: baseTableMatch[2],
                children: []
            });
        }

        // Process JOINs
        if (clauses['JOINS']) {
            clauses['JOINS'].forEach(joinClause => {
                const joinMatch = joinClause.match(/JOIN\s+(\w+)\s+(?:AS\s+)?(\w+)\s+ON\s+(.+)/i);
                if (joinMatch) {
                    const [_, tableName, alias, condition] = joinMatch;
                    const joinNode = {
                        name: 'JOIN',
                        type: 'join',
                        children: [
                            {
                                name: condition.trim(),
                                type: 'condition',
                                children: []
                            },
                            {
                                name: tableName,
                                type: 'table',
                                alias: alias,
                                children: []
                            }
                        ]
                    };
                    fromNode.children.push(joinNode);
                }
            });
        }

        root.children.push(fromNode);
    }

    // Process GROUP BY clause
    if (clauses['GROUP BY']) {
        const groupNode = {
            name: 'GROUP BY',
            type: 'group',
            children: []
        };

        const columns = clauses['GROUP BY'].split(',').map(col => ({
            name: col.trim(),
            type: 'column',
            children: []
        }));
        groupNode.children = columns;
        root.children.push(groupNode);
    }

    // Process HAVING clause
    if (clauses['HAVING']) {
        const havingNode = {
            name: 'HAVING',
            type: 'having',
            children: []
        };

        const conditions = clauses['HAVING'].split(/\s+AND\s+/i).map(cond => ({
            name: cond.trim(),
            type: 'condition',
            children: []
        }));
        havingNode.children = conditions;
        root.children.push(havingNode);
    }

    // Process ORDER BY clause
    if (clauses['ORDER BY']) {
        const orderByNode = {
            name: 'ORDER BY',
            type: 'orderby',
            children: []
        };

        const orderClauses = clauses['ORDER BY'].split(',').map(clause => {
            const parts = clause.trim().split(/\s+/);
            return {
                name: parts.join(' '),
                type: 'column',
                children: []
            };
        });
        orderByNode.children = orderClauses;
        root.children.push(orderByNode);
    }

    return root;
} 