// Reports List Management
let allReports = [];
let filteredReports = [];
let currentPage = 1;
let itemsPerPage = 10;

// Initialize the reports list application
document.addEventListener('DOMContentLoaded', function() {
    initializeMobileMenu();
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
        const googleSheetsURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQsQgn3k99SeflscYBoGEMxOV-VfoG6KjeU11dHUse7n3BNloWofEbK5aYWeCO26RZFSD7x-M33fSTm/pub?gid=397731581&single=true&output=csv';
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

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const reports = [];

    // Función auxiliar para procesar valores CSV con comillas
    function parseCSVValues(line) {
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for(let char of line) {
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        return values;
    }

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = parseCSVValues(lines[i]);
            
            if (values.length >= 6) {
                const report = {
                    nombre: values[0].replace(/^"/, '').replace(/"$/, '') || 'Anónimo',
                    tipo: values[1].replace(/^"/, '').replace(/"$/, '') || '',
                    descripcion: values[2].replace(/^"/, '').replace(/"$/, '') || '',
                    direccion: values[3].replace(/^"/, '').replace(/"$/, '') || '',
                    coordenadas: values[4].replace(/^"/, '').replace(/"$/, '') || '',
                    fecha: values[5].replace(/^"/, '').replace(/"$/, '') || ''
                };

                // Extraer lat y lng de la columna coordenadas
                const [lat, lng] = report.coordenadas.split(',').map(coord => parseFloat(coord.trim()));

                if (
                    !isNaN(lat) && lat >= -90 && lat <= 90 &&
                    !isNaN(lng) && lng >= -180 && lng <= 180 &&
                    report.tipo
                ) {
                    report.lat = lat;
                    report.lng = lng;
                    // Add calculated fields
                    report.priority = calculatePriority(report);
                    report.daysSinceReport = calculateDaysSince(report.fecha);
                    reports.push(report);
                } else {
                    console.warn('Invalid report skipped:', report);
                }
            }
        }
    }
    
    return reports;
}

// Load sample data for demonstration
function loadSampleReportsData() {
    allReports = [
        
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
        // Parse the date using MM/DD/YYYY format
        const [month, day, year] = dateString.split('/').map(Number);
        const reportDate = new Date(year, month - 1, day);
        const today = new Date();
        const diffTime = Math.abs(today - reportDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
        console.error('Error parsing date:', error);
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
    // Search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(report => 
            report.descripcion.toLowerCase().includes(searchTerm) ||
            report.nombre.toLowerCase().includes(searchTerm) ||
            report.tipo.toLowerCase().includes(searchTerm) ||
            report.direccion.toLowerCase().includes(searchTerm)
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
            <div class="report-card-container">
                <div class="report-card-header">
                    <div class="report-card-title-section">
                        <div class="report-card-icon">${typeConfig.icon}</div>
                        <div class="report-card-title-content">
                            <h3 class="report-card-title">${report.tipo}</h3>
                            <span class="report-card-status priority-badge priority-badge-${report.priority}">
                                ${report.priority === 'high' ? 'Alta Prioridad' : report.priority === 'medium' ? 'Prioridad Media' : 'Baja Prioridad'}
                            </span>
                        </div>
                    </div>
                    <div class="report-card-meta">
                        <span class="report-card-date">${report.daysSinceReport} días</span>
                    </div>
                </div>

                <div class="report-card-body">
                    <div class="report-card-grid">
                        <div class="report-card-item">
                            <label class="report-card-label">Reportado por</label>
                            <p class="report-card-value">${report.nombre || 'Anónimo'}</p>
                        </div>
                        <div class="report-card-item">
                            <label class="report-card-label">Fecha del reporte</label>
                            <p class="report-card-value">${formatDate(report.fecha)}</p>
                        </div>
                        <div class="report-card-item full-width">
                            <label class="report-card-label">Ubicación</label>
                            <p class="report-card-value">${report.direccion || 'Ver en mapa'}</p>
                        </div>
                    </div>

                    <div class="report-card-description-section">
                        <label class="report-card-label">Descripción</label>
                        <p class="report-card-description">${report.descripcion}</p>
                    </div>
                </div>

                <div class="report-card-footer">
                    <button class="btn btn-map-view" onclick="event.stopPropagation(); viewOnMap('${report.lat}', '${report.lng}')">
                        <span class="btn-icon">📍</span>
                        <span class="btn-text">Ver en Mapa</span>
                    </button>
                </div>
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
    
    content.innerHTML = `
        <div class="report-detail">
            <div class="detail-header">
                <span class="report-type-icon">🚧</span>
                <h3>${report.tipo}</h3>
            </div>
            <div class="detail-info">
                <div class="info-row">
                    <div class="info-label">Reportado por</div>
                    <div class="info-value">${report.nombre || 'Anónimo'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Descripción</div>
                    <div class="info-value">${report.descripcion || 'Sin descripción'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Dirección</div>
                    <div class="info-value">${report.direccion || 'No disponible'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Fecha</div>
                    <div class="info-value">${formatDate(report.fecha)} <span class="days-ago">(Hace ${report.daysSinceReport} días)</span></div>
                </div>
                <div class="info-row">
                    <div class="info-label">Ubicación</div>
                    <span>${report.direccion || 'Coordenadas: ' + report.lat + ', ' + report.lng}</span>
                </div>
                <div class="info-row">
                    <strong>Prioridad:</strong>
                    <span class="priority-${report.priority}">
                        ${report.priority === 'high' ? 'Alta' : report.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                </div>
            </div>
            <div class="detail-actions">
                <button class="btn btn-primary" onclick="viewOnMap('${report.lat}', '${report.lng}')">
                    📍 Ver en Mapa
                </button>
                <button class="btn btn-success" onclick="copyLocation('${report.lat}', '${report.lng}')">
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

// Mobile Menu Functionality
function initializeMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const headerNav = document.getElementById('headerNav');
    
    if (mobileMenuToggle && headerNav) {
        mobileMenuToggle.addEventListener('click', function() {
            // Toggle menu visibility
            headerNav.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
        
        // Close menu when clicking on a navigation link
        const navLinks = headerNav.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                headerNav.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideNav = headerNav.contains(event.target);
            const isClickOnToggle = mobileMenuToggle.contains(event.target);
            
            if (!isClickInsideNav && !isClickOnToggle && headerNav.classList.contains('active')) {
                headerNav.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            }
        });
        
        // Close menu on window resize if it gets too wide
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                headerNav.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            }
        });
    }
}
