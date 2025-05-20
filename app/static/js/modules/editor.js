// Editor configuration and management
let editor = null;

// Sample queries for the selector
export const sampleQueries = [
    // Multiple JOINs with WHERE
    `SELECT u.full_name, o.order_date, p.product_name
FROM users u
JOIN orders o ON u.user_id = o.user_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
ORDER BY o.order_date DESC;`,

    // Aggregation with GROUP BY
    `SELECT p.product_name,
    COUNT(*) as total_orders,
    AVG(oi.unit_price) as avg_price,
    SUM(oi.quantity) as total_quantity
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.product_name
HAVING COUNT(*) > 0
ORDER BY total_orders DESC;`,

    // Subquery and Window Functions
    `SELECT p.product_name,
    p.price,
    oi.unit_price as sold_price,
    RANK() OVER (ORDER BY p.price DESC) as price_rank,
    p.price - (SELECT AVG(price) FROM products) as diff_from_avg
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
WHERE p.price > (
    SELECT AVG(price)
    FROM products
);`,

    // Complex JOIN with Aggregation
    `SELECT u.full_name as user_name,
    COUNT(DISTINCT o.order_id) as order_count,
    SUM(oi.quantity * oi.unit_price) as total_spent,
    AVG(oi.unit_price) as avg_item_price
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY u.user_id, u.full_name
ORDER BY total_spent DESC;`,
];

// Initialize CodeMirror editor
export function initializeEditor(elementId) {
    // Debug: Check if SQL hint is available
    if (!CodeMirror.hint || !CodeMirror.hint.sql) {
        console.warn('CodeMirror SQL hint function is not available!');
    } else {
        console.log('CodeMirror SQL hint function is loaded.');
    }

    editor = CodeMirror.fromTextArea(document.getElementById(elementId), {
        mode: 'text/x-sql',
        theme: 'dracula',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        lineWrapping: true,
        styleActiveLine: true,
        hint: (CodeMirror.hint && CodeMirror.hint.sql) ? CodeMirror.hint.sql : CodeMirror.hint.anyword,
        extraKeys: {
            "Ctrl-Space": "autocomplete",
            "Ctrl-/": "toggleComment",
            "Cmd-/": "toggleComment",
            "Tab": function(cm) {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                } else {
                    cm.replaceSelection("    ", "end");
                }
            }
        },
        hintOptions: {
            tables: {
                users: ["user_id", "full_name", "email", "password_hash", "created_at"],
                categories: ["category_id", "category_name", "parent_category_id"],
                products: ["product_id", "product_name", "description", "price", "stock_quantity", "category_id", "created_at"],
                orders: ["order_id", "user_id", "order_date", "status", "total_amount"],
                order_items: ["order_item_id", "order_id", "product_id", "quantity", "unit_price"],
                payments: ["payment_id", "order_id", "payment_date", "amount", "payment_method", "payment_status"]
            }
        }
    });

    return editor;
}

// Get editor value
export function getEditorValue() {
    return editor ? editor.getValue() : '';
}

// Load sample query
export function loadSampleQuery(index) {
    if (editor && sampleQueries[index]) {
        editor.setValue(sampleQueries[index]);
        editor.focus();
    }
}

// Initialize sample query selector
export function initializeSampleQuerySelector(elementId) {
    const selector = document.getElementById(elementId);
    if (selector) {
        selector.addEventListener('change', function() {
            const selectedIndex = this.value;
            if (selectedIndex !== '') {
                loadSampleQuery(parseInt(selectedIndex));
            }
        });
    }
}

// Set editor theme
export function setEditorTheme(theme) {
    if (editor) {
        editor.setOption('theme', theme);
    }
}

// Clear query highlighting
export function clearQueryHighlight() {
    if (editor) {
        const doc = editor.getDoc();
        const marks = doc.getAllMarks();
        marks.forEach(mark => mark.clear());
    }
}

// Highlight a specific part of the query
export function highlightQueryPart(start, end) {
    if (editor) {
        const doc = editor.getDoc();
        const startPos = doc.posFromIndex(start);
        const endPos = doc.posFromIndex(end);
        doc.markText(startPos, endPos, { className: 'highlighted-sql' });
    }
}

// Set editor value
export function setEditorValue(value) {
    if (editor) {
        editor.setValue(value);
        editor.refresh();
    }
}

// Get editor instance
export function getEditor() {
    return editor;
} 