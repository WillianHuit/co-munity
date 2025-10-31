// Reports List Management
let allReports = [];
let filteredReports = [];
let currentPage = 1;
let itemsPerPage = 10;

// Initialize the reports list application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadReportsData();
    populateFilterOptions();
});

// Setup event listeners
function setupEventListeners() {
    // Filter controls
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    
    // Action buttons
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    
    // Modal controls
    const modal = document.getElementById('reportDetailModal');
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', closeModal);
    
    window.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });
}

// Load reports data
async function loadReportsData() {
    try {
        showLoadingState();

        // URL del Google Sheets publicado
        const googleSheetsURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTIKh_vys71-FBFCWFW3cSofAEjIhq9CncE2Brk_qzgcKXZ1XSjkYCET-J2YxM47IXbw5szIVz3v2as/pub?gid=47348234&single=true&output=csv';
        const response = await fetch(googleSheetsURL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        allReports = parseCSV(csvText);

    } catch (error) {
        console.error('Error loading reports:', error);
        loadSampleReportsData();
    }

    applyFilters();
    updateStats();
    hideLoadingState();
}

// Parse CSV data (reuse from main script)
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const reports = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const report = {};
            
            headers.forEach((header, index) => {
                report[header] = values[index] || '';
            });
            
            if (report.lat && report.lng && report.tipo) {
                // Add calculated fields
                report.priority = calculatePriority(report);
                report.daysSinceReport = calculateDaysSince(report.fecha);
                reports.push(report);
            }
        }
    }
    
    return reports;
}

// Load sample data for demonstration
function loadSampleReportsData() {
    allReports = [
        {
            id: '1',
            nombre: 'Juan Pérez',
            tipo: 'Bache',
            descripcion: 'Bache grande en la calzada principal que afecta el tráfico vehicular',
            lat: '14.6349',
            lng: '-90.5069',
            fecha: '2024-01-15',
            estado: 'Pendiente',
            foto: '',
            direccion: 'Calzada Roosevelt, Zona 11'
        },
        {
            id: '2',
            nombre: 'María González',
            tipo: 'Fuga de agua',
            descripcion: 'Fuga en tubería principal causa inundación en la acera',
            lat: '14.6280',
            lng: '-90.5150',
            fecha: '2024-01-14',
            estado: 'En proceso',
            foto: '',
            direccion: '6ta Avenida, Zona 1'
        },
        {
            id: '3',
            nombre: 'Carlos López',
            tipo: 'Alumbrado público',
            descripcion: 'Poste de luz fundido desde hace una semana, zona muy oscura por las noches',
            lat: '14.6400',
            lng: '-90.5100',
            fecha: '2024-01-13',
            estado: 'Reportado',
            foto: '',
            direccion: '12 Calle, Zona 10'
        },
        {
            id: '4',
            nombre: 'Ana Martínez',
            tipo: 'Basura',
            descripcion: 'Acumulación de basura en esquina que atrae plagas',
            lat: '14.6320',
            lng: '-90.5200',
            fecha: '2024-01-12',
            estado: 'Resuelto',
            foto: '',
            direccion: '4ta Calle, Zona 12'
        },
        {
            id: '5',
            nombre: 'Roberto Silva',
            tipo: 'Alcantarilla',
            descripcion: 'Tapa de alcantarilla rota, peligro para peatones y vehículos',
            lat: '14.6380',
            lng: '-90.5080',
            fecha: '2024-01-11',
            estado: 'Pendiente',
            foto: '',
            direccion: 'Avenida Reforma, Zona 9'
        }
    ];
    
    // Add calculated fields
    allReports.forEach(report => {
        report.priority = calculatePriority(report);
        report.daysSinceReport = calculateDaysSince(report.fecha);
    });
}

// Calculate priority based on type and days since report
function calculatePriority(report) {
    const highPriorityTypes = ['Fuga de agua', 'Alcantarilla'];
    const days = calculateDaysSince(report.fecha);
    
    if (highPriorityTypes.includes(report.tipo) || days > 7) {
        return 'high';
    } else if (days > 3) {
        return 'medium';
    }
    return 'low';
}

// Calculate days since report
function calculateDaysSince(dateString) {
    if (!dateString) return 0;
    
    try {
        const reportDate = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today - reportDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
        return 0;
    }
}

// Populate filter options
function populateFilterOptions() {
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    // Populate type filter
    if (DATA_CONFIG && DATA_CONFIG.PROBLEM_TYPES) {
        Object.keys(DATA_CONFIG.PROBLEM_TYPES).forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeFilter.appendChild(option);
        });
    }
    
    // Populate status filter
    if (DATA_CONFIG && DATA_CONFIG.STATUS_TYPES) {
        Object.keys(DATA_CONFIG.STATUS_TYPES).forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            statusFilter.appendChild(option);
        });
    }
}

// Apply filters and sorting
function applyFilters() {
    let filtered = [...allReports];
    
    // Type filter
    const typeFilter = document.getElementById('typeFilter').value;
    if (typeFilter) {
        filtered = filtered.filter(report => report.tipo === typeFilter);
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter').value;
    if (statusFilter) {
        filtered = filtered.filter(report => report.estado === statusFilter);
    }
    
    // Search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(report => 
            report.descripcion.toLowerCase().includes(searchTerm) ||
            report.nombre.toLowerCase().includes(searchTerm) ||
            report.tipo.toLowerCase().includes(searchTerm)
        );
    }
    
    // Sort
    const sortBy = document.getElementById('sortBy').value;
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'fecha':
                return new Date(b.fecha) - new Date(a.fecha);
            case 'tipo':
                return a.tipo.localeCompare(b.tipo);
            case 'estado':
                return a.estado.localeCompare(b.estado);
            case 'prioridad':
                const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            default:
                return 0;
        }
    });
    
    filteredReports = filtered;
    currentPage = 1;
    displayReports();
    updatePagination();
}

// Display reports
function displayReports() {
    const container = document.getElementById('reportsList');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const reportsToShow = filteredReports.slice(startIndex, endIndex);
    
    if (reportsToShow.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No se encontraron reportes</h3>
                <p>Intenta ajustar los filtros de búsqueda</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = reportsToShow.map(report => createReportCard(report)).join('');
    
    // Add click listeners to report cards
    container.querySelectorAll('.report-card').forEach((card, index) => {
        const reportIndex = startIndex + index;
        card.addEventListener('click', () => showReportDetail(filteredReports[reportIndex]));
    });
}

// Create report card HTML
function createReportCard(report) {
    const statusConfig = DATA_CONFIG?.STATUS_TYPES?.[report.estado] || { color: '#6b7280', bgColor: '#f3f4f6' };
    const typeConfig = DATA_CONFIG?.PROBLEM_TYPES?.[report.tipo] || { icon: '⚠️' };
    
    return `
        <div class="report-card">
            <div class="priority-indicator priority-${report.priority}"></div>
            <div class="report-header">
                <div class="report-type">
                    <span>${typeConfig.icon}</span>
                    ${report.tipo}
                </div>
                <div class="report-status" style="color: ${statusConfig.color}; background-color: ${statusConfig.bgColor}">
                    ${report.estado}
                </div>
            </div>
            <div class="report-info">
                <div class="report-field">
                    <strong>Reportado por:</strong> ${report.nombre || 'Anónimo'}
                </div>
                <div class="report-field">
                    <strong>Fecha:</strong> ${formatDate(report.fecha)} (${report.daysSinceReport} días)
                </div>
                <div class="report-field">
                    <strong>Ubicación:</strong> ${report.direccion || 'Ver en mapa'}
                </div>
                <div class="report-field">
                    <strong>Prioridad:</strong> 
                    <span class="priority-${report.priority}">
                        ${report.priority === 'high' ? 'Alta' : report.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                </div>
            </div>
            <div class="report-description">${report.descripcion}</div>
            <div class="report-actions">
                <button class="btn btn-secondary" onclick="event.stopPropagation(); viewOnMap('${report.lat}', '${report.lng}')">
                    📍 Ver en Mapa
                </button>
            </div>
        </div>
    `;
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'No disponible';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-GT');
    } catch (error) {
        return dateString;
    }
}

// Show report detail modal
function showReportDetail(report) {
    const modal = document.getElementById('reportDetailModal');
    const content = document.getElementById('reportDetailContent');
    
    const statusConfig = DATA_CONFIG?.STATUS_TYPES?.[report.estado] || { color: '#6b7280', bgColor: '#f3f4f6' };
    const typeConfig = DATA_CONFIG?.PROBLEM_TYPES?.[report.tipo] || { icon: '⚠️' };
    
    content.innerHTML = `
        <div class="report-detail">
            <div class="detail-header">
                <h4>${typeConfig.icon} ${report.tipo}</h4>
                <div class="report-status" style="color: ${statusConfig.color}; background-color: ${statusConfig.bgColor}">
                    ${report.estado}
                </div>
            </div>
            <div class="detail-info">
                <div class="info-row">
                    <strong>Reportado por:</strong>
                    <span>${report.nombre || 'Anónimo'}</span>
                </div>
                <div class="info-row">
                    <strong>Fecha:</strong>
                    <span>${formatDate(report.fecha)} (${report.daysSinceReport} días)</span>
                </div>
                <div class="info-row">
                    <strong>Ubicación:</strong>
                    <span>${report.direccion || 'Coordenadas: ' + report.lat + ', ' + report.lng}</span>
                </div>
                <div class="info-row">
                    <strong>Prioridad:</strong>
                    <span class="priority-${report.priority}">
                        ${report.priority === 'high' ? 'Alta' : report.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                </div>
            </div>
            <div class="detail-description">
                <h5>Descripción:</h5>
                <p>${report.descripcion}</p>
            </div>
            <div class="detail-actions">
                <button class="btn btn-primary" onclick="viewOnMap('${report.lat}', '${report.lng}')">
                    📍 Ver en Mapa
                </button>
                <button class="btn btn-secondary" onclick="copyLocation('${report.lat}', '${report.lng}')">
                    📋 Copiar Ubicación
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('reportDetailModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">❮ Anterior</button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += '<span>...</span>';
        }
    }
    
    paginationHTML += `
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">Siguiente ❯</button>
        <div class="pagination-info">
            Mostrando ${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, filteredReports.length)} de ${filteredReports.length}
        </div>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Go to page
function goToPage(page) {
    currentPage = page;
    displayReports();
    updatePagination();
    document.getElementById('reportsList').scrollIntoView({ behavior: 'smooth' });
}

// Update statistics
function updateStats() {
    const total = allReports.length;
    const pending = allReports.filter(r => r.estado === 'Pendiente').length;
    const inProgress = allReports.filter(r => r.estado === 'En proceso').length;
    const resolved = allReports.filter(r => r.estado === 'Resuelto').length;
    
    document.getElementById('totalReports').textContent = total;
    document.getElementById('pendingReports').textContent = pending;
    document.getElementById('inProgressReports').textContent = inProgress;
    document.getElementById('resolvedReports').textContent = resolved;
}

// View on map (redirect to main page)
function viewOnMap(lat, lng) {
    window.open(`index.html?lat=${lat}&lng=${lng}&zoom=18`, '_blank');
}

// Copy location to clipboard
function copyLocation(lat, lng) {
    const text = `${lat}, ${lng}`;
    navigator.clipboard.writeText(text).then(() => {
        alert('Ubicación copiada al portapapeles');
    }).catch(() => {
        alert(`Ubicación: ${text}`);
    });
}

// Export to CSV
function exportToCSV() {
    const headers = ['Tipo', 'Descripción', 'Reportado por', 'Fecha', 'Estado', 'Latitud', 'Longitud', 'Prioridad'];
    const csvContent = [
        headers.join(','),
        ...filteredReports.map(report => [
            report.tipo,
            `"${report.descripcion}"`,
            report.nombre,
            report.fecha,
            report.estado,
            report.lat,
            report.lng,
            report.priority
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reportes-comunity-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Refresh data
function refreshData() {
    loadReportsData();
}

// Show loading state
function showLoadingState() {
    const container = document.getElementById('reportsList');
    container.innerHTML = `
        <div class="loading-list">
            ${Array(5).fill().map(() => '<div class="loading-card"></div>').join('')}
        </div>
    `;
}

// Hide loading state
function hideLoadingState() {
    // Loading state is replaced by actual content
}

// Debounce helper
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

// Global functions for button clicks
window.goToPage = goToPage;
window.viewOnMap = viewOnMap;
window.copyLocation = copyLocation;
