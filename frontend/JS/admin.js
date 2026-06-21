const API_URL = 'http://localhost:5000/api';

let allReports = [];

async function loadDashboard() {
    console.log('Loading dashboard...');
    
    try {
        // Test connection first
        const testResponse = await fetch(`${API_URL}/test`);
        console.log('Test response:', testResponse.status);
        
        if (!testResponse.ok) {
            throw new Error(`Backend returned ${testResponse.status}`);
        }
        
        // Load statistics
        const statsResponse = await fetch(`${API_URL}/admin/stats`);
        if (!statsResponse.ok) throw new Error('Failed to load stats');
        const stats = await statsResponse.json();
        displayStats(stats);
        
        // Load reports
        const reportsResponse = await fetch(`${API_URL}/admin/reports`);
        if (!reportsResponse.ok) throw new Error('Failed to load reports');
        allReports = await reportsResponse.json();
        
        console.log('Reports loaded:', allReports.length);
        displayReports(allReports);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('reportsBody').innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <div style="color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                        <strong>Failed to load reports</strong><br>
                        Error: ${error.message}<br><br>
                        <small>Make sure backend is running on ${API_URL}</small>
                    </div>
                </td>
            </tr>
        `;
    }
}

function displayStats(stats) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <i class="fas fa-chart-line"></i>
            <h3>Total Reports</h3>
            <div class="number">${stats.total || 0}</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-clock"></i>
            <h3>Pending</h3>
            <div class="number">${stats.pending || 0}</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-spinner"></i>
            <h3>In Progress</h3>
            <div class="number">${stats.in_progress || 0}</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-check-circle"></i>
            <h3>Completed</h3>
            <div class="number">${stats.completed || 0}</div>
        </div>
    `;
}

function displayReports(reports) {
    const tbody = document.getElementById('reportsBody');
    
    if (!reports || reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #9ca3af; margin-bottom: 16px; display: block;"></i>
                    No reports found. Submit a test report from citizen form.
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by created date (newest first)
    const sortedReports = [...reports].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
    
    tbody.innerHTML = sortedReports.map((report, index) => {
        // Status badge class
        let statusClass = '';
        let statusText = '';
        
        switch(report.status) {
            case 'pending':
                statusClass = 'status-pending';
                statusText = 'Pending';
                break;
            case 'in_progress':
                statusClass = 'status-in_progress';
                statusText = 'In Progress';
                break;
            case 'completed':
                statusClass = 'status-completed';
                statusText = 'Completed';
                break;
            default:
                statusClass = 'status-pending';
                statusText = 'Pending';
        }
        
        return `
            <tr>
                <td class="serial-number">${index + 1}</td>
                <td>
                    ${report.image_url ? 
                        `<img src="${report.image_url}" class="report-image" onclick="window.open('${report.image_url}', '_blank')" style="cursor: pointer;">` : 
                        '<span style="color: #9ca3af;"><i class="fas fa-image"></i> No image</span>'}
                </td>
                <td><strong>${escapeHtml(report.name)}</strong></td>
                <td>${escapeHtml(report.description.substring(0, 100))}${report.description.length > 100 ? '...' : ''}</td>
                <td><i class="fas fa-map-marker-alt" style="color: #3b82f6; margin-right: 5px;"></i>${escapeHtml(report.location)}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <select class="status-select" data-id="${report.id}" style="margin-top: 5px; width: 100%;">
                        <option value="pending" ${report.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="in_progress" ${report.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${report.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </td>
                <td><i class="far fa-calendar-alt" style="color: #6b7280; margin-right: 5px;"></i>${new Date(report.created_at).toLocaleString()}</td>
                <td>
                    <button class="delete-btn" data-id="${report.id}" onclick="deleteReport(${report.id})">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners for status changes
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            e.stopPropagation();
            const reportId = select.dataset.id;
            const newStatus = e.target.value;
            
            try {
                const response = await fetch(`${API_URL}/admin/reports/${reportId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                
                if (response.ok) {
                    alert('✅ Status updated successfully');
                    loadDashboard();
                } else {
                    alert('❌ Failed to update status');
                }
            } catch (error) {
                console.error('Error updating status:', error);
                alert('Error updating status');
            }
        });
    });
}

// Global delete function
window.deleteReport = async function(reportId) {
    if (confirm('Are you sure you want to delete this report?')) {
        try {
            const response = await fetch(`${API_URL}/admin/reports/${reportId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('✅ Report deleted successfully');
                loadDashboard();
            } else {
                alert('❌ Failed to delete report');
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Error deleting report');
        }
    }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load dashboard when page loads
window.addEventListener('load', () => {
    console.log('Admin page loaded, initializing...');
    loadDashboard();
    
    // Auto-refresh every 30 seconds
    setInterval(loadDashboard, 30000);
});