// Theme configuration
export const theme = {
    colors: {
        primary: '#3498db',
        secondary: '#2ecc71',
        danger: '#e74c3c',
        warning: '#f1c40f',
        info: '#1abc9c',
        accent: '#e67e22',
        purple: '#9b59b6',
        gray: '#95a5a6',
        dark: '#1a1a1a',
        light: '#ffffff',
        indigo: '#3f51b5',
        pink: '#e91e63'
    },
    nodes: {
        view: '#2ecc71',
        table: '#e74c3c',
        column: '#9b59b6',
        constraint: '#f1c40f',
        condition: '#1abc9c',
        subquery: '#e67e22'
    }
};

// Apply global styles
export function applyGlobalStyles() {
    const globalStyles = document.createElement('style');
    globalStyles.textContent = `
        /* Info icon button styling */
        .btn-link .bi-info-circle {
            color: ${theme.colors.primary};
            font-size: 1.1rem;
            transition: all 0.2s ease;
        }

        .btn-link:hover .bi-info-circle {
            color: ${theme.colors.secondary};
            transform: scale(1.1);
        }

        .btn-link {
            display: inline-flex;
            align-items: center;
            padding: 0;
            margin-left: 0.5rem;
            border: none;
            background: none;
        }

        /* Custom tooltip styling */
        .tooltip.custom-tooltip {
            opacity: 1 !important;
        }

        .tooltip.custom-tooltip .tooltip-inner {
            background: ${theme.colors.dark};
            color: ${theme.colors.light};
            padding: 1rem;
            text-align: left;
            max-width: 300px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 0.875rem;
            line-height: 1.5;
        }

        /* Node styling */
        .node rect {
            fill: ${theme.colors.light};
            stroke-width: 2px;
        }
        
        /* Operation-specific node styling */
        .node.operation rect { stroke: ${theme.colors.primary}; }
        .node.scan rect { stroke: ${theme.colors.secondary}; }
        .node.join rect { stroke: ${theme.colors.purple}; }
        .node.aggregate rect { stroke: ${theme.colors.accent}; }
        .node.sort rect { stroke: ${theme.colors.warning}; }
        .node.hash rect { stroke: ${theme.colors.info}; }
        .node.materialize rect { stroke: ${theme.colors.danger}; }
        .node.setop rect { stroke: ${theme.colors.primary}; }
        .node.window rect { stroke: ${theme.colors.info}; }
        .node.modify rect { stroke: ${theme.colors.danger}; }
        .node.limit rect { stroke: ${theme.colors.info}; }
        .node.result rect { stroke: ${theme.colors.secondary}; }
        .node.lock rect { stroke: ${theme.colors.warning}; }

        .link {
            fill: none;
            stroke: ${theme.colors.gray};
            stroke-width: 2px;
            stroke-dasharray: 4,4;
        }
        
        /* CodeMirror Customization */
        .CodeMirror {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            line-height: 1.6;
            padding: 10px;
            height: 300px;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .CodeMirror-focused {
            box-shadow: 0 0 0 2px ${theme.colors.primary};
        }

        /* Form controls */
        .form-select {
            border-radius: 8px;
            border: 1px solid var(--border-color);
            padding: 0.5rem;
            font-size: 0.9rem;
            background-color: var(--card-background);
            color: var(--text-primary);
            transition: all 0.2s ease;
        }

        .form-select:hover {
            border-color: ${theme.colors.primary};
        }

        .form-select:focus {
            border-color: ${theme.colors.primary};
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
        }
    `;
    document.head.appendChild(globalStyles);
}

// Node styles for plan visualization
export const nodeStyles = {
    getNodeColor: (type) => {
        const colors = {
            // SQL Flow node types
            'root': '#90CAF9',      // Light Blue
            'select': '#A5D6A7',    // Light Green
            'from': '#FFCC80',      // Light Orange
            'where': '#FFE082',     // Light Yellow
            'join': '#CE93D8',      // Light Purple
            'table': '#EF9A9A',     // Light Red
            'column': '#80DEEA',    // Light Teal
            'condition': '#F48FB1',  // Light Pink
            'group': '#9FA8DA',     // Light Indigo
            'having': '#FFE082',    // Light Yellow
            'order': '#A5D6A7',     // Light Green
            'limit': '#FFCC80',     // Light Orange
            'value': '#80DEEA',     // Light Teal

            // Execution Plan node types
            'operation': '#90CAF9',  // Light Blue
            'scan': '#A5D6A7',      // Light Green
            'aggregate': '#FFCC80',  // Light Orange
            'sort': '#FFE082',      // Light Yellow
            'hash': '#80DEEA',      // Light Teal
            'materialize': '#EF9A9A', // Light Red
            'setop': '#90CAF9',     // Light Blue
            'window': '#80DEEA',    // Light Teal
            'modify': '#EF9A9A',    // Light Red
            'result': '#A5D6A7',    // Light Green
            'lock': '#FFE082'       // Light Yellow
        };

        return colors[type.toLowerCase()] || '#E0E0E0'; // Light Gray as default
    }
}; 