import { initializeEditor, getEditorValue, loadSampleQuery, initializeSampleQuerySelector, setEditorTheme } from './modules/editor.js';
import { testConnection, executeQuery } from './modules/queryExecutor.js';
import { visualizePlan } from './modules/planVisualizer.js';
import { initializeTooltips } from './modules/tooltipManager.js';
import { initializeEventHandlers, EVENTS } from './modules/eventHandlers.js';
import { applyGlobalStyles } from './modules/styles/theme.js';
import { createSqlFlowVisualization } from './modules/visualizer.js';
import { fetchAndRenderTables } from './modules/tableUtils.js';

// Initialize application
async function initializeApplication() {
    // Apply global styles
    applyGlobalStyles();

    // Initialize editor first
    const editor = initializeEditor('sqlEditor');
    
    // Add theme selector to the card header
    const cardHeader = document.querySelector('.card-header .d-flex');
    if (cardHeader) {
        const themeSelector = document.createElement('div');
        themeSelector.className = 'ms-auto d-flex align-items-center';
        themeSelector.innerHTML = `
            <label for="themeSelect" class="form-label me-2 mb-0">Theme:</label>
            <select class="form-select form-select-sm" id="themeSelect" style="width: 120px;">
                <option value="dracula">Dracula</option>
                <option value="monokai">Monokai</option>
                <option value="material">Material</option>
                <option value="eclipse">Eclipse</option>
                <option value="neat">Neat</option>
            </select>
        `;
        cardHeader.appendChild(themeSelector);
        
        // Handle theme changes
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', function() {
                setEditorTheme(this.value);
            });
        }
    }
    
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize event handlers
    initializeEventHandlers();

    // Initialize sample query selector
    initializeSampleQuerySelector('sampleQuery');

    // Add execute button handler
    const executeButton = document.getElementById('executeButton');
    if (executeButton) {
        executeButton.addEventListener('click', executeQuery);
    }

    // Autocomplete button handler
    const autocompleteBtn = document.getElementById('autocompleteButton');
    if (autocompleteBtn) {
        autocompleteBtn.addEventListener('click', function() {
            const editor = getEditor();
            if (editor) {
                editor.showHint();
            }
        });
    }

    // Test database connection
    const connectionStatus = await testConnection();
    if (!connectionStatus) {
        alert('Failed to connect to database. Please check your connection and try again.');
    } else {
        // Fetch and render tables after successful connection
        await fetchAndRenderTables();
    }

    // Listen for visualization events
    window.addEventListener(EVENTS.RESIZE, () => {
        const query = getEditorValue();
        if (query) {
            visualizePlan(query);
        }
    });

    // Initialize tab handling
    const tabElements = document.querySelectorAll('a[data-bs-toggle="tab"]');
    tabElements.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (event) {
            const targetId = event.target.getAttribute('href');
            if (targetId === '#executionPlan') {
                if (window.lastPlanData) {
                    visualizePlan(window.lastPlanData);
                } else {
                    console.log('No execution plan data available. Please execute a query first.');
                }
            } else if (targetId === '#sqlFlow') {
                if (window.lastQuery && window.lastQuery.trim()) {
                    createSqlFlowVisualization(window.lastQuery);
                } else {
                    console.log('No SQL query available. Please enter and execute a query first.');
                }
            }
        });
    });
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApplication); 