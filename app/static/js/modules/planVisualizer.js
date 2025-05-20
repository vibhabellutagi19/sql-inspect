import { nodeStyles } from './styles/theme.js';
import { clearQueryHighlight, highlightQueryPart } from './editor.js';

// Visualize execution plan
export function visualizePlan(planData) {
    if (!planData || !planData[0]) {
        console.error('Invalid plan data');
        const container = document.getElementById('planVisualization');
        if (container) {
            container.innerHTML = '<div class="alert alert-info m-3">No execution plan available. Please execute a query first.</div>';
        }
        return;
    }

    console.log('Visualizing plan data:', planData);

    // Get container dimensions
    const container = document.getElementById('planVisualization');
    if (!container) {
        console.error('Plan visualization container not found');
        return;
    }

    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width || 800;
    const height = containerRect.height || 600;
    const margin = { top: 20, right: 90, bottom: 30, left: 90 };

    // Clear existing visualization
    d3.select('#planVisualization').selectAll('*').remove();

    // Create SVG container
    const svg = d3.select('#planVisualization')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    try {
        // Convert plan data to tree structure
        const treeData = convertPlanToTree(planData[0]);
        if (!treeData) {
            throw new Error('Failed to convert plan data to tree structure');
        }

        console.log('Tree data:', treeData);

        // Create tree layout
        const treeLayout = d3.tree()
            .size([height - margin.top - margin.bottom, width - margin.left - margin.right])
            .nodeSize([120, 250]); // Increased spacing for labels

        // Create hierarchy and compute layout
        const root = d3.hierarchy(treeData);
        const nodes = treeLayout(root);

        // Create curved links
        const link = svg.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));

        // Create node groups
        const node = svg.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', d => `node ${d.data.type}`)
            .attr('transform', d => `translate(${d.y},${d.x})`);

        // Add circles for nodes
        node.append('circle')
            .attr('r', 30)
            .style('fill', '#ffffff')
            .style('stroke', d => nodeStyles.getNodeColor(d.data.type))
            .style('stroke-width', '3px');

        // Add node type text (inside circle)
        node.append('text')
            .attr('dy', 0)
            .attr('text-anchor', 'middle')
            .text(d => d.data.name)
            .style('fill', '#333')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .call(wrap, 50);

        // Add node interactions
        node.on('mouseover', function(event, d) {
            // Highlight related query part if available
            if (d.data.queryPart) {
                const query = window.lastQuery;
                if (query) {
                    const queryPart = d.data.queryPart;
                    let highlightRange = findQueryPartRange(query, queryPart);
                    if (highlightRange) {
                        highlightQueryPart(highlightRange.start, highlightRange.end);
                    } else if (queryPart.type === 'condition' || queryPart.type === 'join') {
                        const alternativeRange = findAlternativeRange(query, queryPart);
                        if (alternativeRange) {
                            highlightQueryPart(alternativeRange.start, alternativeRange.end);
                        }
                    }
                }
            }

            // Show tooltip with detailed information
            const details = d.data.details;
            let tooltip = getNodeDescription(d.data.name, details);
            showTooltip(event, tooltip);
        })
        .on('mouseout', function() {
            clearQueryHighlight();
            hideTooltip();
        });

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 2])
            .on('zoom', (event) => {
                svg.attr('transform', event.transform);
            });

        d3.select('#planVisualization svg').call(zoom);

        // Center the visualization
        const svgElement = d3.select('#planVisualization svg').node();
        const svgWidth = svgElement.getBoundingClientRect().width;
        const svgHeight = svgElement.getBoundingClientRect().height;
        
        const transform = d3.zoomIdentity
            .translate(svgWidth / 2, svgHeight / 4)
            .scale(0.8);
        
        d3.select('#planVisualization svg')
            .call(zoom.transform, transform);

    } catch (error) {
        console.error('Error creating execution plan visualization:', error);
        container.innerHTML = '<div class="alert alert-danger m-3">Error creating visualization. Please check the execution plan data.</div>';
    }
}

// Convert plan data to tree structure
export function convertPlanToTree(plan) {
    if (!plan) {
        console.error('Invalid plan data');
        return null;
    }

    console.log('Converting plan node:', plan);
    
    // Extract node type from Plan array if present
    let nodeType = 'Unknown';
    if (plan.Plan && plan.Plan['Node Type']) {
        nodeType = plan.Plan['Node Type'];
    } else if (plan['Node Type']) {
        nodeType = plan['Node Type'];
    }
    
    console.log('Node type before mapping:', nodeType);
    const mappedType = getNodeType(nodeType);
    console.log('Node type after mapping:', mappedType);

    const node = {
        name: nodeType,
        type: mappedType,
        details: {},
        children: [],
        queryPart: extractQueryPart(plan) // Add query part information
    };

    // Add details from the plan
    const planDetails = plan.Plan || plan;
    Object.entries(planDetails).forEach(([key, value]) => {
        if (key !== 'Plans' && key !== 'Node Type') {
            node.details[key] = value;
        }
    });

    // Process child plans
    const childPlans = (plan.Plan && plan.Plan.Plans) || plan.Plans;
    if (childPlans && Array.isArray(childPlans)) {
        node.children = childPlans.map(childPlan => convertPlanToTree(childPlan));
    }

    console.log('Created node:', node);
    return node;
}

// Extract query part information from plan node
function extractQueryPart(plan) {
    const planDetails = plan.Plan || plan;
    console.log('Extracting query part from plan details:', planDetails);
    
    let queryPart = null;

    // Extract table name for scan operations
    if (planDetails['Relation Name']) {
        queryPart = {
            type: 'table',
            name: planDetails['Relation Name'],
            context: 'FROM',
            start: 0,
            end: 0
        };
        console.log('Found table scan:', queryPart);
    }
    
    // Extract condition information from WHERE clause
    if (planDetails['Filter']) {
        queryPart = {
            type: 'condition',
            condition: planDetails['Filter'],
            context: 'WHERE',
            start: 0,
            end: 0
        };
        console.log('Found filter condition:', queryPart);
    }
    
    // Extract join condition
    if (planDetails['Hash Cond'] || planDetails['Join Filter'] || planDetails['Merge Cond']) {
        const joinCond = planDetails['Hash Cond'] || planDetails['Join Filter'] || planDetails['Merge Cond'];
        // Convert hash condition format to SQL join format
        const sqlJoinCond = joinCond
            .replace(/\(/, '')
            .replace(/\)/, '')
            .replace(/=/, ' = ')
            .split(' = ')
            .map(part => part.trim())
            .join(' = ');
            
        queryPart = {
            type: 'join',
            condition: sqlJoinCond,
            originalCond: joinCond,
            context: 'JOIN',
            start: 0,
            end: 0
        };
        console.log('Found join condition:', queryPart);
    }
    
    // Extract index condition
    if (planDetails['Index Cond']) {
        queryPart = {
            type: 'index',
            condition: planDetails['Index Cond'],
            context: 'INDEX',
            start: 0,
            end: 0
        };
        console.log('Found index condition:', queryPart);
    }

    // Extract group by information
    if (planDetails['Group Key']) {
        queryPart = {
            type: 'group',
            columns: planDetails['Group Key'],
            context: 'GROUP BY',
            start: 0,
            end: 0
        };
        console.log('Found group by:', queryPart);
    }

    // Extract sort information
    if (planDetails['Sort Key']) {
        queryPart = {
            type: 'sort',
            columns: planDetails['Sort Key'],
            context: 'ORDER BY',
            start: 0,
            end: 0
        };
        console.log('Found sort:', queryPart);
    }

    return queryPart;
}

// Get node type for styling
function getNodeType(nodeType) {
    if (!nodeType || nodeType === 'Unknown') return 'operation';
    
    const typeMap = {
        // Scan operations
        'Seq Scan': 'scan',
        'Index Scan': 'scan',
        'Index Only Scan': 'scan',
        'Bitmap Heap Scan': 'scan',
        'Bitmap Index Scan': 'scan',
        'Tid Scan': 'scan',
        'Subquery Scan': 'scan',
        'Function Scan': 'scan',
        'Table Function Scan': 'scan',
        'Values Scan': 'scan',
        'CTE Scan': 'scan',
        'Named Tuplestore Scan': 'scan',
        'WorkTable Scan': 'scan',
        'Foreign Scan': 'scan',
        'Custom Scan': 'scan',
        
        // Join operations
        'Nested Loop': 'join',
        'Hash Join': 'join',
        'Merge Join': 'join',
        
        // Auxiliary operations
        'Hash': 'hash',
        'Sort': 'sort',
        'Incremental Sort': 'sort',
        'Materialize': 'materialize',
        
        // Aggregate operations
        'Aggregate': 'aggregate',
        'Group': 'aggregate',
        'Group Aggregate': 'aggregate',
        'HashAggregate': 'aggregate',
        
        // Set operations
        'Append': 'setop',
        'Unique': 'setop',
        'SetOp': 'setop',
        'WindowAgg': 'window',
        
        // Update operations
        'ModifyTable': 'modify',
        'Insert': 'modify',
        'Update': 'modify',
        'Delete': 'modify',
        
        // Miscellaneous
        'Limit': 'limit',
        'Result': 'result',
        'LockRows': 'lock'
    };
    
    // Try exact match first
    if (typeMap[nodeType]) {
        return typeMap[nodeType];
    }
    
    // Try partial match
    for (const [key, value] of Object.entries(typeMap)) {
        if (nodeType.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    
    return 'operation';
}

// Helper function to wrap text
function wrap(text, width) {
    text.each(function() {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        let word;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.1; // ems
        const y = text.attr("y");
        const dy = parseFloat(text.attr("dy"));
        let tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
        
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}

// Show tooltip
function showTooltip(event, content) {
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'sql-tooltip')
        .style('opacity', 0);

    tooltip.html(content)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .transition()
        .duration(200)
        .style('opacity', .9);
}

// Hide tooltip
function hideTooltip() {
    d3.select('.sql-tooltip').remove();
}

// Get operation description
export function getOperationDescription(operationType) {
    const descriptions = {
        'Seq Scan': 'Sequential scan of the table',
        'Index Scan': 'Scan using an index',
        'Index Only Scan': 'Scan using only the index without accessing the table',
        'Bitmap Heap Scan': 'Two-phase scan using a bitmap',
        'Nested Loop': 'Join tables by looping through rows',
        'Hash Join': 'Join tables using a hash table',
        'Merge Join': 'Join sorted tables',
        'Sort': 'Sort rows',
        'Hash': 'Build hash table',
        'Aggregate': 'Group and aggregate rows',
        'Limit': 'Limit number of rows'
    };
    return descriptions[operationType] || 'Operation details not available';
}

// Helper function to find query part range in the SQL query
function findQueryPartRange(query, queryPart) {
    if (!query || !queryPart) return null;
    console.log('Finding range for query part:', queryPart);

    const upperQuery = query.toUpperCase();
    let start = -1, end = -1;

    switch (queryPart.type) {
        case 'table':
            // Find table name in FROM clause or JOIN conditions
            const tablePattern = new RegExp(`\\b${queryPart.name}\\s+(?:as\\s+)?\\b([a-zA-Z]\\w*)?`, 'i');
            const match = query.match(tablePattern);
            if (match) {
                start = match.index;
                end = start + match[0].length;
                console.log('Found table range:', { start, end, text: query.substring(start, end) });
                return { start, end };
            }
            break;

        case 'condition':
            // Find condition in WHERE clause or JOIN conditions
            if (queryPart.condition) {
                // Clean up the condition for matching
                const cleanCondition = queryPart.condition
                    .replace(/::[\w\s]+/g, '') // Remove type casts
                    .replace(/\"/g, '')        // Remove quotes
                    .replace(/\(|\)/g, '')     // Remove parentheses
                    .trim();
                
                // Try to find the condition in the query
                let searchContext = queryPart.context === 'WHERE' ? 'WHERE' : 'ON';
                let contextIndex = upperQuery.indexOf(searchContext);
                if (contextIndex !== -1) {
                    let searchStart = contextIndex + searchContext.length;
                    let searchText = upperQuery.substring(searchStart);
                    let conditionIndex = searchText.indexOf(cleanCondition.toUpperCase());
                    if (conditionIndex !== -1) {
                        start = searchStart + conditionIndex;
                        end = start + cleanCondition.length;
                        console.log('Found condition range:', { start, end, text: query.substring(start, end) });
                        return { start, end };
                    }
                }
            }
            break;

        case 'join':
            // Find join condition
            if (queryPart.condition) {
                // Clean up the join condition
                const cleanCondition = queryPart.condition
                    .replace(/::[\w\s]+/g, '') // Remove type casts
                    .replace(/\"/g, '')        // Remove quotes
                    .trim();
                
                // Try to find the condition in ON clauses
                const onIndex = upperQuery.indexOf('ON ');
                if (onIndex !== -1) {
                    let searchText = upperQuery.substring(onIndex + 3);
                    let conditionIndex = searchText.indexOf(cleanCondition.toUpperCase());
                    if (conditionIndex !== -1) {
                        start = onIndex + 3 + conditionIndex;
                        end = start + cleanCondition.length;
                        console.log('Found join range:', { start, end, text: query.substring(start, end) });
                        return { start, end };
                    }
                }
            }
            break;

        case 'group':
            // Find GROUP BY columns
            if (queryPart.columns) {
                const groupByIndex = upperQuery.indexOf('GROUP BY');
                if (groupByIndex !== -1) {
                    const columnsStr = Array.isArray(queryPart.columns) 
                        ? queryPart.columns.join(', ') 
                        : queryPart.columns;
                    const cleanColumns = columnsStr.replace(/::[\w\s]+/g, '').replace(/\"/g, '').trim();
                    let searchText = upperQuery.substring(groupByIndex + 8); // 8 is length of "GROUP BY"
                    let columnsIndex = searchText.indexOf(cleanColumns.toUpperCase());
                    if (columnsIndex !== -1) {
                        start = groupByIndex + 8 + columnsIndex;
                        end = start + cleanColumns.length;
                        console.log('Found group by range:', { start, end, text: query.substring(start, end) });
                        return { start, end };
                    }
                }
            }
            break;

        case 'sort':
            // Find ORDER BY columns
            if (queryPart.columns) {
                const orderByIndex = upperQuery.indexOf('ORDER BY');
                if (orderByIndex !== -1) {
                    const columnsStr = Array.isArray(queryPart.columns) 
                        ? queryPart.columns.join(', ') 
                        : queryPart.columns;
                    const cleanColumns = columnsStr.replace(/::[\w\s]+/g, '').replace(/\"/g, '').trim();
                    let searchText = upperQuery.substring(orderByIndex + 8); // 8 is length of "ORDER BY"
                    let columnsIndex = searchText.indexOf(cleanColumns.toUpperCase());
                    if (columnsIndex !== -1) {
                        start = orderByIndex + 8 + columnsIndex;
                        end = start + cleanColumns.length;
                        console.log('Found order by range:', { start, end, text: query.substring(start, end) });
                        return { start, end };
                    }
                }
            }
            break;

        case 'index':
            // Find index condition
            if (queryPart.condition) {
                const cleanCondition = queryPart.condition
                    .replace(/::[\w\s]+/g, '')
                    .replace(/\"/g, '')
                    .replace(/\(|\)/g, '')
                    .trim();
                
                const conditionIndex = upperQuery.indexOf(cleanCondition.toUpperCase());
                if (conditionIndex !== -1) {
                    start = conditionIndex;
                    end = start + cleanCondition.length;
                    console.log('Found index range:', { start, end, text: query.substring(start, end) });
                    return { start, end };
                }
            }
            break;
    }

    console.log('No range found for query part');
    return null;
}

// Advanced tips for interpreting execution plan nodes
function getAdvancedTips(nodeType, details) {
    const tips = [];
    // Sequential Scan on large tables
    if (nodeType.includes('Seq Scan') && details['Actual Rows'] > 10000) {
        tips.push('⚠️ Sequential scan on a large table. Consider adding an index or rewriting the query to use indexed columns.');
    }
    // Nested Loop Join with large row counts
    if (nodeType.includes('Nested Loop') && details['Actual Rows'] > 1000) {
        tips.push('⚠️ Nested Loop Join with many rows can be slow. Try to reduce the number of rows or use a different join type.');
    }
    // Hash Join with high cost
    if (nodeType.includes('Hash Join') && details['Total Cost'] > 2000) {
        tips.push('⚠️ Hash Join is expensive. Check if join columns are indexed and if statistics are up to date.');
    }
    // Sort with high cost or many rows
    if (nodeType.includes('Sort') && (details['Total Cost'] > 1000 || details['Actual Rows'] > 10000)) {
        tips.push('⚠️ Sorting a large result set. Consider limiting rows earlier or adding indexes to support ORDER BY.');
    }
    // Index Scan but no index used
    if (nodeType.includes('Index Scan') && !details['Index Name']) {
        tips.push('ℹ️ Index Scan is used, but no index name found. Check if the right index exists.');
    }
    // Bitmap Heap Scan with high cost
    if (nodeType.includes('Bitmap Heap Scan') && details['Total Cost'] > 1500) {
        tips.push('⚠️ Bitmap Heap Scan is expensive. Consider optimizing the WHERE clause or adding indexes.');
    }
    // Aggregate with many rows
    if (nodeType.includes('Aggregate') && details['Actual Rows'] > 10000) {
        tips.push('ℹ️ Aggregating a large number of rows. Consider pre-filtering data or using partial aggregates.');
    }
    // HashAggregate with high cost
    if (nodeType.includes('HashAggregate') && details['Total Cost'] > 2000) {
        tips.push('⚠️ HashAggregate is expensive. Try to reduce the number of groups or rows.');
    }
    // Filter present but not selective
    if (details['Filter'] && details['Actual Rows'] > 10000) {
        tips.push('ℹ️ Filter is applied, but many rows remain. Try to make the filter more selective.');
    }
    // General high cost
    if (details['Total Cost'] > 5000) {
        tips.push('🚩 Very high cost detected. Consider query refactoring, adding indexes, or analyzing statistics.');
    }
    return tips;
}

// Get detailed description of what each node type does
function getNodeDescription(nodeType, details) {
    const descriptions = {
        // Scan Operations
        'Seq Scan': 'Sequential Scan: Reads the entire table row by row. Most basic but can be slow for large tables.',
        'Index Scan': 'Index Scan: Uses an index to find rows. Faster than sequential scan when index is selective.',
        'Index Only Scan': 'Index Only Scan: Retrieves data directly from the index without accessing the table.',
        'Bitmap Heap Scan': 'Bitmap Heap Scan: Uses a bitmap of row locations to efficiently scan the table.',
        'Bitmap Index Scan': 'Bitmap Index Scan: Creates a bitmap of row locations from multiple indexes.',
        
        // Join Operations
        'Nested Loop': 'Nested Loop Join: For each row in outer table, scans inner table. Good for small tables.',
        'Hash Join': 'Hash Join: Builds a hash table from one table, then probes it with the other table.',
        'Merge Join': 'Merge Join: Sorts both tables and merges them. Efficient for large, sorted datasets.',
        
        // Aggregate Operations
        'Aggregate': 'Aggregate: Performs grouping and aggregation (COUNT, SUM, AVG, etc.).',
        'Group': 'Group: Groups rows based on specified columns. Part of GROUP BY operations.',
        'HashAggregate': 'Hash Aggregate: Uses hash tables for grouping. Efficient for larger datasets.',
        
        // Sort Operations
        'Sort': 'Sort: Sorts the result set. Can be memory-intensive for large datasets.',
        'Incremental Sort': 'Incremental Sort: Sorts data in chunks, useful for streaming results.',
        
        // Materialization
        'Materialize': 'Materialize: Stores intermediate results in memory for reuse.',
        
        // Set Operations
        'Append': 'Append: Combines results from multiple operations (e.g., UNION ALL).',
        'Unique': 'Unique: Removes duplicate rows from the result set.',
        
        // Window Functions
        'WindowAgg': 'Window Aggregate: Performs window functions over partitioned data.',
        
        // Update Operations
        'ModifyTable': 'Modify Table: Performs INSERT, UPDATE, or DELETE operations.',
        'Insert': 'Insert: Adds new rows to a table.',
        'Update': 'Update: Modifies existing rows in a table.',
        'Delete': 'Delete: Removes rows from a table.',
        
        // Miscellaneous
        'Limit': 'Limit: Restricts the number of rows returned.',
        'Result': 'Result: Returns a constant result or performs simple calculations.',
        'LockRows': 'Lock Rows: Locks rows for concurrent access control.'
    };

    // Get base description
    let description = descriptions[nodeType] || `${nodeType}: Operation details not available`;

    // Add specific details about the operation
    const additionalInfo = [];

    // Add cost analysis with icon
    if (details['Total Cost'] !== undefined) {
        additionalInfo.push(`<span style='color:#f59e0b;font-weight:600;'>⚡ Cost:</span> <span style='color:#fbbf24;'>${details['Total Cost'].toFixed(2)}</span>`);
    }
    // Add actual rows with icon
    if (details['Actual Rows'] !== undefined) {
        additionalInfo.push(`<span style='color:#10b981;font-weight:600;'>🧮 Rows:</span> <span style='color:#34d399;'>${details['Actual Rows'].toLocaleString()}</span>`);
    }
    // Add execution time with icon
    if (details['Actual Total Time'] !== undefined) {
        additionalInfo.push(`<span style='color:#3b82f6;font-weight:600;'>⏱ Time:</span> <span style='color:#60a5fa;'>${details['Actual Total Time'].toFixed(2)} ms</span>`);
    }
    // Add table name
    if (details['Relation Name']) {
        additionalInfo.push(`<span style='color:#ef4444;font-weight:600;'>📋 Table:</span> <span style='color:#f87171;'>${details['Relation Name']}</span>`);
    }
    // Add index name
    if (details['Index Name']) {
        additionalInfo.push(`<span style='color:#a21caf;font-weight:600;'>🔎 Index:</span> <span style='color:#c084fc;'>${details['Index Name']}</span>`);
    }
    // Add join condition
    if (details['Hash Cond'] || details['Join Filter'] || details['Merge Cond']) {
        const joinCond = details['Hash Cond'] || details['Join Filter'] || details['Merge Cond'];
        additionalInfo.push(`<span style='color:#8b5cf6;font-weight:600;'>🔗 Join Condition:</span> <span style='color:#a78bfa;'>${joinCond}</span>`);
    }
    // Add filter
    if (details['Filter']) {
        additionalInfo.push(`<span style='color:#4b5563;font-weight:600;'>🧩 Filter:</span> <span style='color:#9ca3af;'>${details['Filter']}</span>`);
    }
    // Add sort key
    if (details['Sort Key']) {
        additionalInfo.push(`<span style='color:#fbbf24;font-weight:600;'>↕️ Sort Key:</span> <span style='color:#fde68a;'>${details['Sort Key']}</span>`);
    }
    // Add group key
    if (details['Group Key']) {
        additionalInfo.push(`<span style='color:#f59e0b;font-weight:600;'>🔗 Group Key:</span> <span style='color:#fcd34d;'>${details['Group Key']}</span>`);
    }

    // Tips & Insights (simple heuristics)
    const tips = [];
    if (nodeType.includes('Seq Scan')) {
        tips.push('Consider adding an index if this scan is slow.');
    }
    if (nodeType.includes('Hash Join')) {
        tips.push('Hash joins are efficient for large, unsorted tables.');
    }
    if (nodeType.includes('Sort')) {
        tips.push('Sorting large result sets can be expensive.');
    }
    if (details['Total Cost'] > 1000) {
        tips.push('High cost detected: try to optimize your query or add indexes.');
    }
    if (details['Actual Rows'] > 10000) {
        tips.push('Large number of rows: consider filtering earlier in your query.');
    }
    // Add advanced tips
    tips.push(...getAdvancedTips(nodeType, details));

    // Format the tooltip content
    let tooltipContent = `
        <div class="tooltip-header">
            <strong style="font-size:16px;">${nodeType}</strong>
        </div>
        <div class="tooltip-description" style="margin-bottom:10px;">
            ${description}
        </div>
        <div class="tooltip-section">
            <strong>Operation Details</strong>
            ${additionalInfo.map(info => `<div>${info}</div>`).join('')}
        </div>
        <div class="tooltip-section" style="margin-top:10px;">
            <strong style="color:#f472b6;">Tips & Insights</strong>
            <ul style='margin:0 0 0 1em;padding:0;font-size:12px;color:#fbcfe8;'>
                ${tips.length ? tips.map(tip => `<li>${tip}</li>`).join('') : '<li>No special tips for this node.</li>'}
            </ul>
        </div>
    `;

    return tooltipContent;
}

 