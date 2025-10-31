// Map instance
let map;
let markersLayer;

// Problem type colors matching CSS
const problemColors = {
    'Bache': '#ef4444',
    'Fuga de agua': '#3b82f6', 
    'Alumbrado público': '#f59e0b',
    'Basura': '#8b5cf6',
    'default': '#6b7280'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    loadReports();
});

// Initialize Leaflet map
function initializeMap() {
    // Center on Guatemala City
    map = L.map('map').setView([14.6349, -90.5069], 12);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Create layer group for markers
    markersLayer = L.layerGroup().addTo(map);
    
    // Add click event to map for future functionality
    map.on('click', function(e) {
        console.log('Map clicked at:', e.latlng);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Report button modal
    const reportBtn = document.getElementById('reportBtn');
    const modal = document.getElementById('reportModal');
    const closeBtn = document.querySelector('.close-btn');
    
    reportBtn.addEventListener('click', function() {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });
    
    closeBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });
}

// Close modal function
function closeModal() {
    const modal = document.getElementById('reportModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Load reports from data source
async function loadReports() {
    try {
        showLoading();

        // URL del Google Sheets publicado
        const googleSheetsURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTIKh_vys71-FBFCWFW3cSofAEjIhq9CncE2Brk_qzgcKXZ1XSjkYCET-J2YxM47IXbw5szIVz3v2as/pub?gid=47348234&single=true&output=csv';
        const response = await fetch(googleSheetsURL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        const reports = parseCSV(csvText);
        console.log('Loaded reports:', reports);
        displayReports(reports);

    } catch (error) {
        console.error('Error loading reports:', error);
        showError('Error al cargar los reportes. Mostrando datos de ejemplo.');
        loadSampleData();
    }
}

// Parse CSV data
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

            // Validate required fields and coordinate ranges
            const lat = parseFloat(report.lat);
            const lng = parseFloat(report.lng);

            if (
                !isNaN(lat) && lat >= -90 && lat <= 90 &&
                !isNaN(lng) && lng >= -180 && lng <= 180 &&
                report.tipo
            ) {
                reports.push(report);
            } else {
                console.warn('Invalid report skipped:', report);
            }
        }
    }

    return reports;
}

// Display reports on map
function displayReports(reports) {
    // Clear existing markers
    markersLayer.clearLayers();
    
    reports.forEach(report => {
        const lat = parseFloat(report.lat || report.latitud);
        const lng = parseFloat(report.lng || report.longitud);
        
        if (isNaN(lat) || isNaN(lng)) return;
        
        // Create custom marker
        const color = problemColors[report.tipo] || problemColors.default;
        const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });
        
        // Create popup content
        const popupContent = createPopupContent(report);
        marker.bindPopup(popupContent);
        
        // Add marker to layer
        markersLayer.addLayer(marker);
    });
    
    hideLoading();
}

// Create popup content HTML
function createPopupContent(report) {
    const estado = report.estado || 'Pendiente';
    const estadoClass = estado.toLowerCase().replace(/\s+/g, '-');
    
    return `
        <div class="popup-content">
            <h4 class="popup-title">${report.tipo || 'Problema urbano'}</h4>
            <div class="popup-info">
                <p><strong>Descripción:</strong> ${report.descripcion || 'Sin descripción'}</p>
                <p><strong>Reportado por:</strong> ${report.nombre || 'Anónimo'}</p>
                <p><strong>Fecha:</strong> ${formatDate(report.fecha)}</p>
                <p><strong>Estado:</strong> 
                    <span class="status status-${estadoClass}">${estado}</span>
                </p>
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

// Load sample data for demonstration
function loadSampleData() {
    
    displayReports(sampleReports);
}

// Show loading state
function showLoading() {
    const mapElement = document.getElementById('map');
    mapElement.style.opacity = '0.7';
    
    // Add loading indicator if it doesn't exist
    if (!document.querySelector('.loading-overlay')) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = '<div class="loading">Cargando reportes...</div>';
        mapElement.parentNode.style.position = 'relative';
        mapElement.parentNode.appendChild(loadingDiv);
    }
}

// Hide loading state
function hideLoading() {
    const mapElement = document.getElementById('map');
    const loadingOverlay = document.querySelector('.loading-overlay');
    
    mapElement.style.opacity = '1';
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

// Show error message
function showError(message) {
    console.error(message);
    // You could add a toast notification here
    hideLoading();
}

// Refresh reports data
function refreshReports() {
    loadReports();
}

// Export functions for potential external use
window.CoMunityApp = {
    refreshReports,
    loadReports,
    map
};
