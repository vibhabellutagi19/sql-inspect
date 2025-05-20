import { executeQuery } from './queryExecutor.js';
import { clearQueryHighlight, highlightQueryPart } from './editor.js';
import { hideTooltip, showTooltip } from './tooltipManager.js';

// Initialize event handlers
export function initializeEventHandlers() {
    // Execute button click handler
    const executeButton = document.getElementById('executeButton');
    if (executeButton) {
        executeButton.addEventListener('click', executeQuery);
    }

    // Clear button click handler
    const clearButton = document.getElementById('clearButton');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            document.getElementById('queryResults').innerHTML = '';
            document.getElementById('planVisualization').innerHTML = '';
        });
    }

    // Window resize handler for visualization
    window.addEventListener('resize', debounce(() => {
        const planVisualization = document.getElementById('planVisualization');
        if (planVisualization && planVisualization.hasChildNodes()) {
            // Trigger re-render of visualization
            const event = new Event('resize-visualization');
            window.dispatchEvent(event);
        }
    }, 250));

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Ctrl/Cmd + Enter to execute query
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            executeQuery();
        }
    });
}

// Node interaction handlers
export function initializeNodeHandlers(node) {
    node.on('mouseover', function(event, d) {
        // Highlight related query part
        if (d.data.queryPart) {
            highlightQueryPart(d.data.queryPart.start, d.data.queryPart.end);
        }

        // Show tooltip
        const tooltipContent = createNodeTooltip(d.data);
        showTooltip(event.pageX, event.pageY, tooltipContent);
    })
    .on('mouseout', function() {
        clearQueryHighlight();
        hideTooltip();
    })
    .on('click', function(event, d) {
        event.stopPropagation(); // Prevent triggering parent node events
        handleNodeClick(d);
    });
}

// Create node tooltip content
function createNodeTooltip(data) {
    let content = `<strong>${data.name}</strong>`;
    if (data.description) {
        content += `<br>${data.description}`;
    }
    if (data.details) {
        content += '<br><br>';
        Object.entries(data.details).forEach(([key, value]) => {
            content += `<strong>${key}:</strong> ${value}<br>`;
        });
    }
    return content;
}

// Handle node click
function handleNodeClick(node) {
    // Toggle node expansion
    if (node.children) {
        node._children = node.children;
        node.children = null;
    } else {
        node.children = node._children;
        node._children = null;
    }

    // Trigger visualization update
    const event = new Event('update-visualization');
    window.dispatchEvent(event);
}

// Debounce function for resize handling
function debounce(func, wait) {
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

// Export event names as constants
export const EVENTS = {
    RESIZE: 'resize-visualization',
    UPDATE: 'update-visualization',
    EXECUTE: 'execute-query',
    CLEAR: 'clear-results'
}; 