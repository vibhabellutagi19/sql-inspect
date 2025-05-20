// Initialize tooltips
export function initializeTooltips() {
    console.log('Initializing tooltips...');
    
    // Make sure Bootstrap is available
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded!');
        return;
    }

    // Find all tooltip elements
    const tooltipElements = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    console.log('Found tooltip elements:', tooltipElements.length);

    // Initialize each tooltip
    tooltipElements.forEach(function(element) {
        try {
            const tooltip = new bootstrap.Tooltip(element, {
                html: true,
                trigger: 'hover focus',
                placement: 'right',
                container: 'body',
                customClass: 'custom-tooltip'
            });
            console.log('Tooltip initialized for:', element);
        } catch (error) {
            console.error('Error initializing tooltip:', error);
        }
    });
}

// Create tooltip content
export function createTooltipContent(data) {
    let content = '<div class="tooltip-content">';
    if (data.title) {
        content += `<strong>${data.title}</strong>`;
    }
    if (data.description) {
        content += `<p>${data.description}</p>`;
    }
    if (data.details) {
        Object.entries(data.details).forEach(([key, value]) => {
            content += `<div><strong>${key}:</strong> ${value}</div>`;
        });
    }
    content += '</div>';
    return content;
}

// Show tooltip at position
export function showTooltip(x, y, content) {
    hideTooltip(); // Remove any existing tooltips

    const tooltip = document.createElement('div');
    tooltip.className = 'sql-tooltip';
    tooltip.innerHTML = content;
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 10}px`;
    
    document.body.appendChild(tooltip);
    
    // Fade in
    requestAnimationFrame(() => {
        tooltip.style.opacity = '1';
    });
}

// Hide tooltip
export function hideTooltip() {
    const existingTooltips = document.querySelectorAll('.sql-tooltip');
    existingTooltips.forEach(tooltip => {
        tooltip.style.opacity = '0';
        setTimeout(() => tooltip.remove(), 200);
    });
}

// Update tooltip position
export function updateTooltipPosition(x, y) {
    const tooltip = document.querySelector('.sql-tooltip');
    if (tooltip) {
        tooltip.style.left = `${x + 10}px`;
        tooltip.style.top = `${y - 10}px`;
    }
}

// Create help tooltip
export function createHelpTooltip(element, content) {
    const tooltip = new bootstrap.Tooltip(element, {
        title: content,
        html: true,
        trigger: 'hover focus',
        placement: 'right',
        container: 'body',
        customClass: 'custom-tooltip help-tooltip'
    });
    return tooltip;
} 