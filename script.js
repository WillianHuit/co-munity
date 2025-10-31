// Map instance
let map;
let markersLayer;
let transmetroLayer;

// Problem type colors matching CSS - cambiados para diferenciar del Transmetro
const problemColors = {
    'Bache': '#dc2626',        // Rojo más oscuro
    'Fuga de agua': '#1d4ed8', // Azul más oscuro
    'Alumbrado público': '#d97706', // Naranja más oscuro
    'Basura': '#7c3aed',       // Púrpura más oscuro
    'default': '#4b5563'       // Gris más oscuro
};

// Context menu variables
let contextMenu = null;
let selectedCoordinates = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    loadReports();
    loadTransmetroRoutes();
    
    // Initialize context menu
    contextMenu = document.getElementById('contextMenu');
    
    // Map click handler for context menu
    map.on('contextmenu', function(e) {
        selectedCoordinates = e.latlng;
        showContextMenu(e.originalEvent.pageX, e.originalEvent.pageY);
    });
    
    // Hide context menu on map click
    map.on('click', function() {
        hideContextMenu();
    });
    
    // Context menu item click handler
    document.getElementById('reportHere').addEventListener('click', function() {
        if (selectedCoordinates) {
            openReportModal(selectedCoordinates.lat, selectedCoordinates.lng);
        }
        hideContextMenu();
    });
    
    // Hide context menu on outside click
    document.addEventListener('click', function(e) {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
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
    
    // Create layer groups
    markersLayer = L.layerGroup().addTo(map);
    transmetroLayer = L.layerGroup().addTo(map);
    
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
        
        // Create custom marker with different style from Transmetro
        const color = problemColors[report.tipo] || problemColors.default;
        const marker = L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: color,
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.9,
            className: 'report-marker' // Clase CSS para diferenciar
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

// Show context menu at coordinates
function showContextMenu(x, y) {
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
}

// Hide context menu
function hideContextMenu() {
    contextMenu.style.display = 'none';
}

// Open report modal with coordinates
function openReportModal(lat, lng) {
    const modal = document.getElementById('reportModal');
    const iframe = document.getElementById('googleFormIframe');
    
    // ID del campo de coordenadas en tu Google Form
    const baseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeEQmd2sQPQN1YtkoTdk7uLa78nHe2Uhxjk3UTWj1tKLGBPhw/viewform';
    const coordinatesValue = `${lat},${lng}`;
    const urlWithCoords = `${baseUrl}?usp=dialog&embedded=true&entry.489043979=${coordinatesValue}`;
    
    iframe.src = urlWithCoords;
    modal.style.display = 'flex';
}

// Load Transmetro routes from GeoJSON
async function loadTransmetroRoutes() {
    try {
        console.log('Loading Transmetro routes...');
        const response = await fetch('data/transmetro_routes.geojson');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const routes = await response.json();
        console.log('Transmetro routes loaded:', routes);
        displayTransmetroRoutes(routes);
        
    } catch (error) {
        console.error('Error loading Transmetro routes:', error);
        // Si falla, mostrar mensaje en consola pero no interrumpir la app
        console.warn('Transmetro routes could not be loaded, continuing without them.');
    }
}

// Display Transmetro routes on the map
function displayTransmetroRoutes(routes) {
    // Clear existing routes
    transmetroLayer.clearLayers();
    
    routes.forEach(route => {
        const { linea, color, ruta } = route;
        
        console.log(`Drawing route for ${linea} with ${ruta.length} stops`);

        // Draw the route as a polyline
        const latLngs = ruta.map(stop => [stop.lat, stop.lng]);
        const polyline = L.polyline(latLngs, {
            color: color,
            weight: 6,
            opacity: 0.7,
            dashArray: '10, 5', // Línea discontinua para diferenciar
            className: 'transmetro-line'
        });

        // Add popup to the line
        polyline.bindPopup(`<strong>🚌 ${linea}</strong><br>Ruta del Transmetro`);
        transmetroLayer.addLayer(polyline);

        // Add markers for each stop with different style
        ruta.forEach((stop, index) => {
            const marker = L.marker([stop.lat, stop.lng], {
                icon: L.divIcon({
                    className: 'transmetro-stop',
                    html: `<div style="
                        background-color: ${color}; 
                        border: 2px solid white;
                        border-radius: 50%;
                        width: 16px;
                        height: 16px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    "></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            });

            // Add popup with stop information
            marker.bindPopup(`
                <div class="transmetro-popup">
                    <h4>🚌 ${stop.nombre}</h4>
                    <p><strong>Línea:</strong> ${linea}</p>
                    <p><strong>Parada:</strong> ${index + 1} de ${ruta.length}</p>
                </div>
            `);
            
            transmetroLayer.addLayer(marker);
        });
    });
    
    console.log('Transmetro routes displayed on map');
}

// Export functions for potential external use
window.CoMunityApp = {
    refreshReports,
    loadReports,
    map
};
