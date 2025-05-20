export async function fetchAndRenderTables() {
    const container = document.getElementById('tableListBody');
    try {
        const response = await fetch('/tables');
        const data = await response.json();
        if (data.status === 'success' && data.tables.length > 0) {
            container.innerHTML = data.tables.map(
                t => `<button class="badge table-badge me-2 mb-1" data-table="${t}" style="border:none;outline:none;cursor:pointer;">${t}</button>`
            ).join('');
            // Add click listeners
            document.querySelectorAll('.table-badge').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const table = this.getAttribute('data-table');
                    const modalId = 'tableSchemaModal';
                    let modal = document.getElementById(modalId);
                    if (!modal) {
                        modal = document.createElement('div');
                        modal.className = 'modal fade';
                        modal.id = modalId;
                        modal.tabIndex = -1;
                        modal.innerHTML = `
                        <div class="modal-dialog modal-lg modal-dialog-centered">
                          <div class="modal-content">
                            <div class="modal-header">
                              <h5 class="modal-title"><i class="bi bi-table"></i> Table Schema: <span id="modalTableName"></span></h5>
                              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body" id="modalTableSchemaBody">
                              <span>Loading schema...</span>
                            </div>
                          </div>
                        </div>`;
                        document.body.appendChild(modal);
                    }
                    // Set table name
                    document.getElementById('modalTableName').textContent = table;
                    // Show modal
                    const bsModal = new bootstrap.Modal(modal);
                    bsModal.show();
                    // Fetch schema
                    try {
                        const resp = await fetch(`/table-schema/${table}`);
                        const schema = await resp.json();
                        if (schema.status === 'success' && schema.columns.length > 0) {
                            document.getElementById('modalTableSchemaBody').innerHTML = `
                                <table class="table table-bordered table-sm align-middle">
                                    <thead><tr><th>Name</th><th>Type</th><th>Nullable</th><th>Primary Key</th></tr></thead>
                                    <tbody>
                                        ${schema.columns.map(col => `
                                            <tr>
                                                <td><code>${col.name}</code></td>
                                                <td>${col.type}</td>
                                                <td>${col.nullable === 'YES' ? '<span class=\'text-success\'>YES</span>' : '<span class=\'text-danger\'>NO</span>'}</td>
                                                <td>${col.primary_key ? '<i class=\'bi bi-key-fill text-warning\'></i>' : ''}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            `;
                        } else {
                            document.getElementById('modalTableSchemaBody').innerHTML = '<span class="text-danger">No schema found.</span>';
                        }
                    } catch (err) {
                        document.getElementById('modalTableSchemaBody').innerHTML = '<span class="text-danger">Failed to load schema.</span>';
                    }
                });
            });
        } else {
            container.innerHTML = '<span class="text-danger">No tables found.</span>';
        }
    } catch (err) {
        container.innerHTML = '<span class="text-danger">Failed to load tables.</span>';
    }
} 