// SQL Flow Visualizer Module
import { nodeStyles } from './styles/theme.js';
import { debounce } from './utils.js';
import { parseSqlQuery } from './sqlParser.js';
import { clearQueryHighlight, highlightQueryPart } from './editor.js';

// Helper function to find query part range
function findQueryRange(query, node) {
    if (!query) return null;
    
    const upperQuery = query.toUpperCase();
    let start = -1, end = -1;

    switch (node.data.type) {
        case 'select':
            start = upperQuery.indexOf('SELECT');
            end = upperQuery.indexOf('FROM');
            return start !== -1 && end !== -1 ? { start, end } : null;

        case 'from':
            start = upperQuery.indexOf('FROM');
            end = upperQuery.indexOf('JOIN') || upperQuery.indexOf('WHERE') || upperQuery.indexOf('ORDER BY') || query.length;
            return start !== -1 ? { start, end } : null;

        case 'join':
            // Find the specific JOIN clause
            const joinClause = node.data.name + ' ' + node.data.children[0].name;
            start = upperQuery.indexOf(joinClause.toUpperCase());
            if (start !== -1) {
                // Find the end of this JOIN clause (next JOIN or WHERE or ORDER BY)
                const nextJoin = upperQuery.indexOf('JOIN', start + joinClause.length);
                const where = upperQuery.indexOf('WHERE', start);
                const orderBy = upperQuery.indexOf('ORDER BY', start);
                end = Math.min(
                    ...[nextJoin, where, orderBy, query.length]
                    .filter(pos => pos !== -1)
                );
                return { start, end };
            }
            return null;

        case 'table':
            // Find the table name with its alias
            const tablePattern = new RegExp(`\\b${node.data.name}\\b`, 'i');
            const match = query.match(tablePattern);
            if (match) {
                start = match.index;
                end = start + match[0].length;
                return { start, end };
            }
            return null;

        case 'condition':
            // Find the condition in ON clause
            const condition = node.data.name;
            start = upperQuery.indexOf(condition.toUpperCase());
            if (start !== -1) {
                end = start + condition.length;
                return { start, end };
            }
            return null;

        case 'column':
            // Find the column in SELECT or ORDER BY
            const columnPattern = new RegExp(`\\b${node.data.name}\\b`, 'i');
            const columnMatch = query.match(columnPattern);
            if (columnMatch) {
                start = columnMatch.index;
                end = start + columnMatch[0].length;
                return { start, end };
            }
            return null;

        case 'orderby':
            start = upperQuery.indexOf('ORDER BY');
            end = query.length;
            return start !== -1 ? { start, end } : null;
    }

    return null;
}

export function createSqlFlowVisualization(query) {
    if (!query || !query.trim()) {
        console.log('No query provided. Please enter a SQL query first.');
        
        // Clear existing visualization
        const container = document.getElementById('sqlFlowVisualization');
        if (container) {
            container.innerHTML = '<div class="alert alert-info m-3">Please enter and execute a SQL query to see the visualization.</div>';
        }
        return;
    }

    // Store the query for highlighting
    window.lastQuery = query;

    // Get container dimensions
    const container = document.getElementById('sqlFlowVisualization');
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };
    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    // Clear existing visualization
    container.innerHTML = '';

    // Create SVG container
    const svg = d3.select('#sqlFlowVisualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    // Create main group for the visualization
    const mainGroup = svg.append('g')
        .attr('class', 'main-group')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    try {
        // Parse the query into a tree structure
        const treeData = parseSqlQuery(query);
        console.log('Parsed SQL tree:', treeData);

        if (!treeData || !treeData.children) {
            throw new Error('Invalid tree data structure');
        }

        // Create tree layout with vertical orientation
        const treeLayout = d3.tree()
            .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
            .nodeSize([180, 100]); // [horizontal, vertical] spacing

        // Create hierarchy and compute layout
        const root = d3.hierarchy(treeData);
        let i = 0; // Counter for unique IDs
        
        if (!root) {
            throw new Error('Failed to create hierarchy from tree data');
        }

        // Sort children by execution order
        root.sort((a, b) => {
            if (!a?.data?.type || !b?.data?.type) return 0;
            const order = {
                'from': 1,    // First: identify data sources
                'join': 1,    // Same level as FROM
                'where': 2,   // Second: filter individual rows
                'group': 3,   // Third: group rows
                'having': 4,  // Fourth: filter groups
                'select': 5,  // Fifth: compute final columns
                'orderby': 6  // Last: sort results
            };
            return (order[a.data.type] || 99) - (order[b.data.type] || 99);
        });

        // Initialize positions for animation
        root.x0 = width / 2;
        root.y0 = 0;

        // Update function to handle expand/collapse
        function update(source) {
            // Compute the new tree layout
            const nodes = treeLayout(root);

            // Update the nodes
            const node = mainGroup.selectAll('g.node')
                .data(root.descendants(), d => d.id || (d.id = ++i));

            // Enter any new nodes
            const nodeEnter = node.enter().append('g')
                .attr('class', d => `node ${d?.data?.type || 'unknown'}`)
                .attr('transform', d => `translate(${source.x0},${source.y0})`);

            // Add rectangles to entering nodes
            nodeEnter.append('rect')
                .attr('width', d => {
                    if (!d?.data?.name) return 80;
                    const textWidth = d.data.name.length * 8;
                    return Math.max(textWidth + 40, 120);
                })
                .attr('height', d => d?.data?.type === 'condition' ? 30 : 40)
                .attr('x', d => {
                    if (!d?.data?.name) return -40;
                    return -(Math.max(d.data.name.length * 8 + 40, 120) / 2);
                })
                .attr('y', d => d?.data?.type === 'condition' ? -15 : -20)
                .attr('rx', 5)
                .attr('ry', 5)
                .style('fill', 'white')
                .style('stroke', d => d?.data?.type ? nodeStyles.getNodeColor(d.data.type) : '#E0E0E0')
                .style('stroke-width', '2px')
                .style('stroke-dasharray', d => d?.data?.type === 'condition' ? '4,4' : 'none');

            // Add text to entering nodes
            nodeEnter.append('text')
                .attr('dy', d => d?.data?.type === 'condition' ? 4 : 5)
                .attr('text-anchor', 'middle')
                .text(d => {
                    if (!d?.data?.name) return '';
                    if (d.data.type === 'table' && d.data.alias && d.data.alias !== d.data.name) {
                        return `${d.data.name} AS ${d.data.alias}`;
                    }
                    return d.data.name;
                })
                .style('fill', '#333')
                .style('font-size', d => (d?.data?.type === 'condition' || d?.data?.type === 'aggregate') ? '11px' : '12px')
                .style('font-weight', 'bold');

            // Add expand/collapse indicators
            nodeEnter.append('text')
                .attr('class', 'expand-collapse')
                .attr('x', d => {
                    const width = d.data.name.length * 8 + 40;
                    return -(Math.max(width, 120) / 2) - 20;
                })
                .attr('y', 5)
                .style('font-family', 'FontAwesome')
                .style('font-size', '14px')
                .style('cursor', 'pointer')
                .text(d => d._children ? '⊕' : d.children ? '⊖' : '')
                .style('fill', '#666');

            // Update all nodes
            const nodeUpdate = nodeEnter.merge(node);
            nodeUpdate.transition()
                .duration(750)
                .attr('transform', d => `translate(${d.x},${d.y})`);

            // Remove exiting nodes
            const nodeExit = node.exit().transition()
                .duration(750)
                .attr('transform', d => `translate(${source.x},${source.y})`)
                .remove();

            // Update the links
            const link = mainGroup.selectAll('path.link')
                .data(root.links(), d => d.target.id);

            // Create the link generator
            const linkGenerator = d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y);

            // Enter new links
            const linkEnter = link.enter().insert('path', 'g')
                .attr('class', 'link')
                .attr('d', d => {
                    const o = {x: source.x0, y: source.y0};
                    return linkGenerator({source: o, target: o});
                });

            // Update existing links
            const linkUpdate = linkEnter.merge(link);
            linkUpdate.transition()
                .duration(750)
                .attr('d', linkGenerator);

            // Remove exiting links
            const linkExit = link.exit().transition()
                .duration(750)
                .attr('d', d => {
                    const o = {x: source.x, y: source.y};
                    return linkGenerator({source: o, target: o});
                })
                .remove();

            // Store the old positions for transition
            nodes.each(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        // Initialize the display
        update(root);

        // Add node interactions
        mainGroup.selectAll('.node')
            .on('mouseover', function(event, d) {
                if (!d || !d.data) return;
                // Highlight the node
                d3.select(this).select('rect')
                    .style('fill', d => nodeStyles.getNodeColor(d.data.type))
                    .style('fill-opacity', '0.1')
                    .style('stroke-width', '3px');

                // Find and highlight the corresponding query part
                const range = findQueryRange(query, d);
                if (range) {
                    console.log('Highlighting range:', range);
                    highlightQueryPart(range.start, range.end);
                }
            })
            .on('mouseout', function() {
                // Remove node highlight
                d3.select(this).select('rect')
                    .style('fill', 'white')
                    .style('fill-opacity', '1')
                    .style('stroke-width', '2px');

                // Clear query highlight
                clearQueryHighlight();
            })
            .on('click', function(event, d) {
                // Toggle children on click
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
                
                // Update the visualization
                update(d);
            });

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 2])
            .on('zoom', (event) => {
                mainGroup.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Center the visualization
        const bounds = mainGroup.node().getBBox();
        const scale = 0.8;
        const dx = bounds.width * scale;
        const dy = bounds.height * scale;
        const x = (width / 2) - (bounds.x + dx / 2) * scale;
        const y = (height / 2) - (bounds.y + dy / 2) * scale;

        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));

    } catch (error) {
        console.error('Error creating SQL flow visualization:', error);
        container.innerHTML = '<div class="alert alert-danger m-3">Error creating visualization. Please check the SQL query syntax.</div>';
    }
}

// Split SQL query into clauses
function splitSqlIntoClauses(query) {
    const clauses = {};
    
    // Extract SELECT
    const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/i);
    if (selectMatch) {
        clauses['SELECT'] = selectMatch[1].trim();
    }

    // Extract FROM and JOINs - capture the entire FROM...JOIN section
    const fromJoinPattern = /FROM\s+(.*?)(?=\s+WHERE|\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/is;
    const fromMatch = query.match(fromJoinPattern);
    if (fromMatch) {
        const fromSection = fromMatch[1].trim();
        
        // Split into FROM and JOINs
        const parts = fromSection.split(/\b(JOIN)\b/i);
        clauses['FROM'] = parts[0].trim();
        
        if (parts.length > 1) {
            clauses['JOINS'] = [];
            for (let i = 1; i < parts.length; i += 2) {
                if (i + 1 < parts.length) {
                    clauses['JOINS'].push(parts[i] + ' ' + parts[i + 1].trim());
                }
            }
        }
    }

    // Extract WHERE
    const whereMatch = query.match(/WHERE\s+(.*?)(?=\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/i);
    if (whereMatch) {
        clauses['WHERE'] = whereMatch[1].trim();
    }

    // Extract ORDER BY
    const orderByMatch = query.match(/ORDER BY\s+(.*?)(?=\s+LIMIT|;|$)/i);
    if (orderByMatch) {
        clauses['ORDER BY'] = orderByMatch[1].trim();
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
    
    // Process FROM and JOINs first
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
                name: `${baseTableMatch[1]} ${baseTableMatch[2]}`,
                type: 'table',
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
                                name: `${tableName} ${alias}`,
                                type: 'table',
                                children: []
                            },
                            {
                                name: condition.trim(),
                                type: 'condition',
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

    // Process SELECT clause
    if (clauses['SELECT']) {
        const selectNode = {
            name: 'SELECT',
            type: 'select',
            children: []
        };

        const columns = clauses['SELECT'].split(',').map(col => col.trim());
        columns.forEach(column => {
            selectNode.children.push({
                name: column,
                type: column.includes('(') ? 'aggregate' : 'column',
                children: []
            });
        });

        root.children.push(selectNode);
    }

    // Process WHERE clause
    if (clauses['WHERE']) {
        const whereNode = {
            name: 'WHERE',
            type: 'where',
            children: []
        };

        const conditions = clauses['WHERE'].split(/\s+AND\s+/i).map(cond => cond.trim());
        conditions.forEach(condition => {
            whereNode.children.push({
                name: condition,
                type: 'condition',
                children: []
            });
        });

        root.children.push(whereNode);
    }

    // Process ORDER BY clause
    if (clauses['ORDER BY']) {
        const orderByNode = {
            name: 'ORDER BY',
            type: 'orderby',
            children: []
        };

        const orderClauses = clauses['ORDER BY'].split(',').map(clause => clause.trim());
        orderClauses.forEach(clause => {
            orderByNode.children.push({
                name: clause,
                type: 'column',
                children: []
            });
        });

        root.children.push(orderByNode);
    }

    return root;
}

// Get node type based on SQL part
function getNodeTypeForPart(section, part) {
    switch (section) {
        case 'SELECT':
            return part.includes('(') ? 'aggregate' : 'column';
        case 'FROM':
            return 'table';
        case 'JOIN':
            return 'join';
        case 'WHERE':
            return 'condition';
        case 'ORDER BY':
            return 'column';
        default:
            return 'operation';
    }
}

// Handle window resize
window.addEventListener('resize', debounce(() => {
    const flowDiv = document.getElementById("sqlFlowVisualization");
    if (flowDiv && flowDiv.hasChildNodes()) {
        const query = document.querySelector("#sqlEditor").value;
        createSqlFlowVisualization(query);
    }
}, 250)); 