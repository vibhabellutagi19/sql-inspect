import { getEditorValue } from './editor.js';
import { visualizePlan } from './planVisualizer.js';
import { createSqlFlowVisualization } from './visualizer.js';
import { fetchAndRenderTables } from './tableUtils.js';

// Test database connection
export async function testConnection() {
    try {
        const response = await fetch('/test-connection', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            console.log('Database connection successful');
            return true;
        } else {
            console.error('Database connection failed:', data.message);
            return false;
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        return false;
    }
}

// Execute SQL query
export async function executeQuery() {
    const query = getEditorValue();
    if (!query.trim()) {
        displayError('Please enter a SQL query');
        return;
    }

    // Only allow SELECT statements
    const cleanedQuery = query.replace(/--.*|\/\*[^]*?\*\//g, '').trim(); // Remove comments
    if (!/^SELECT\b/i.test(cleanedQuery)) {
        displayError('Only SELECT statements are allowed. Commands like CREATE, UPDATE, ALTER, INSERT, DELETE, and DROP are not permitted.');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('query', query);

        const response = await fetch('/execute', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.status === 'success') {
            // Store the plan data and query for visualization
            window.lastPlanData = data.plan;
            window.lastQuery = query;
            console.log('Stored query for highlighting:', window.lastQuery);

            // Display results
            displayResults(data);

            // Update visualizations based on active tab
            const activeTab = document.querySelector('.nav-link.active');
            if (activeTab) {
                const targetId = activeTab.getAttribute('href');
                if (targetId === '#executionPlan') {
                    visualizePlan(data.plan);
                } else if (targetId === '#sqlFlow') {
                    createSqlFlowVisualization(query);
                }
            }
        } else {
            displayError(data.error);
        }
    } catch (error) {
        console.error('Error executing query:', error);
        displayError(error.message);
    }
}

// Display error message in results tab
function displayError(errorMessage) {
    const resultsDiv = document.getElementById('queryResults');
    if (!resultsDiv) {
        console.error('Results div not found');
        return;
    }

    // Extract main error, line, hint, and SQL if present
    let mainError = errorMessage;
    let lineInfo = '';
    let hint = '';
    let sql = '';
    let match;

    // Try to extract [SQL: ...] block
    match = errorMessage.match(/\[SQL: ([^\]]+)\]/);
    if (match) {
        sql = match[1];
        // If EXPLAIN is present, try to extract the user's original query
        const explainMatch = sql.match(/EXPLAIN \(FORMAT JSON, ANALYZE\)\s*(.*)/i);
        if (explainMatch) {
            sql = explainMatch[1];
        }
        mainError = errorMessage.replace(match[0], '').trim();
    }
    // Extract HINT
    match = mainError.match(/HINT: ([^\n]+)/);
    if (match) {
        hint = match[1];
        mainError = mainError.replace(/HINT: ([^\n]+)/, '').trim();
    }
    // Extract LINE info
    match = mainError.match(/LINE \d+: ([^\n]+)/);
    if (match) {
        lineInfo = match[0];
    }

    // Remove duplicate 'LINE LINE' if present
    mainError = mainError.replace(/LINE LINE/g, 'LINE');

    resultsDiv.innerHTML = `
        <div class="error-message card shadow-sm p-3" style="background:#fee2e2;border:1.5px solid #fca5a5;">
            <div class="d-flex align-items-center mb-2">
                <i class="bi bi-exclamation-triangle-fill me-2" style="color: #B91C1C;font-size:1.3em;"></i>
                <span style="font-weight:600;color:#B91C1C;font-size:1.1em;">Query Error</span>
            </div>
            <div style="color: #7F1D1D; font-family: monospace; white-space: pre-wrap; font-size:1em;">
                ${mainError}
                ${lineInfo ? `<br><span style='color:#b91c1c;font-weight:600;'>${lineInfo}</span>` : ''}
                ${hint ? `<br><span style='color:#be185d;font-weight:500;'>Hint: ${hint}</span>` : ''}
                ${sql ? `<br><span style='color:#334155;font-size:0.95em;'>[Your Query: <span style='font-weight:500;'>${sql}</span>]</span>` : ''}
            </div>
        </div>
    `;
}

// Display query results
export function displayResults(data) {
    const resultsDiv = document.getElementById('queryResults');
    if (!resultsDiv) {
        console.error('Results div not found');
        return;
    }

    // Show error if present
    if (data.error) {
        displayError(data.error);
        return;
    }

    // Helper: get query type
    let queryType = '';
    if (window.lastQuery) {
        queryType = window.lastQuery.trim().split(/\s+/)[0].toUpperCase();
    }

    // Handle DDL/DML (CREATE, ALTER, DROP, INSERT, UPDATE, DELETE)
    if ((!data.data || data.data.length === 0) && queryType && queryType !== 'SELECT') {
        let msg = '';
        let icon = '';
        if (["CREATE", "ALTER", "DROP"].includes(queryType)) {
            icon = '<i class="bi bi-check-circle-fill me-2" style="color:#22c55e;"></i>';
            msg = `<div class="card shadow-sm p-3" style="background:#f0fdf4;border:1.5px solid #bbf7d0;font-weight:600;border-radius:12px;">${icon}${queryType} statement executed successfully.</div>`;
            fetchAndRenderTables();
        } else if (["INSERT", "UPDATE", "DELETE"].includes(queryType)) {
            icon = '<i class="bi bi-pencil-fill me-2" style="color:#6366f1;"></i>';
            let affected = (data.rowCount !== undefined && data.rowCount !== null) ? ` (${data.rowCount} rows affected)` : '';
            msg = `<div class="card shadow-sm p-3" style="background:#f0f9ff;border:1.5px solid #bae6fd;font-weight:600;border-radius:12px;">${icon}${queryType} executed successfully${affected}.</div>`;
        } else {
            icon = '<i class="bi bi-info-circle-fill me-2" style="color:#0ea5e9;"></i>';
            msg = `<div class="card shadow-sm p-3" style="background:#f1f5f9;border:1.5px solid #cbd5e1;font-weight:600;border-radius:12px;">${icon}Query executed successfully.</div>`;
        }
        resultsDiv.innerHTML = msg;
        return;
    }

    if (data.data && data.data.length > 0) {
        // Create table headers
        const headers = Object.keys(data.data[0]);
        let tableHtml = '<div class="card shadow-sm p-3" style="border-radius:12px;"><div class="table-responsive"><table class="table table-striped table-hover align-middle mb-0"><thead class="table-light"><tr>';
        headers.forEach(header => {
            tableHtml += `<th>${header}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        // Add table rows
        data.data.forEach(row => {
            tableHtml += '<tr>';
            headers.forEach(header => {
                tableHtml += `<td>${row[header]}</td>`;
            });
            tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table></div></div>';
        resultsDiv.innerHTML = tableHtml;
    } else {
        resultsDiv.innerHTML = `<div class="card shadow-sm p-3" style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;color:#64748b;display:flex;align-items:center;gap:8px;"><i class='bi bi-emoji-frown' style='font-size:1.3em;'></i> No results returned</div>`;
    }
}

// Find table name from query details
export function findTableName(details) {
    if (details.table) return details.table;
    if (details.tables && details.tables.length > 0) return details.tables[0];
    return null;
} 