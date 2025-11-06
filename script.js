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
let touchTimeout = null;
let isTouchDevice = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    loadReports();
    //loadTransmetroRoutes();
    
    // Initialize mobile menu
    initializeMobileMenu();
    
    // Detect touch device
    isTouchDevice = 'ontouchstart' in window;
    
    // Initialize context menu
    contextMenu = document.getElementById('contextMenu');
    
    // Map right-click handler for desktop
    map.on('contextmenu', function(e) {
        if (!isTouchDevice) {
            selectedCoordinates = e.latlng;
            // Usar containerPoint para evitar desajustes por scroll u offset del contenedor
            const rect = map.getContainer().getBoundingClientRect();
            const x = rect.left + e.containerPoint.x + window.scrollX;
            const y = rect.top + e.containerPoint.y;
            showContextMenu(x, y);
        }
    });
    
    // Touch events for mobile
    if (isTouchDevice) {
        map.on('mousedown', function(e) {
            touchTimeout = setTimeout(function() {
                selectedCoordinates = e.latlng;
                const rect = map.getContainer().getBoundingClientRect();
                const touch = e.originalEvent.touches && e.originalEvent.touches[0];
                const rawX = (touch ? touch.clientX : e.originalEvent.clientX);
                const rawY = (touch ? touch.clientY : e.originalEvent.clientY);
                // Convertir a coordenadas absolutas en la página
                const x = rect.left + (rawX - rect.left) + window.scrollX;
                const y = rect.top + (rawY - rect.top) + window.scrollY;
                showContextMenu(x, y);
            }, 500); // 500ms long press
        });
        
        map.on('mouseup', function() {
            if (touchTimeout) {
                clearTimeout(touchTimeout);
                touchTimeout = null;
            }
        });
        
        map.on('mousemove', function() {
            if (touchTimeout) {
                clearTimeout(touchTimeout);
                touchTimeout = null;
            }
        });
    }
    
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
    // Limitar el área navegable a Guatemala
    var guatemalaBounds = L.latLngBounds([
        [13.7300, -92.2462], // Suroeste
        [18.0000, -88.2000]  // Noreste
    ]);
    map.setMaxBounds(guatemalaBounds);
    map.on('drag', function() {
        map.panInsideBounds(guatemalaBounds, { animate: false });
    });
    
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
    // Modal functionality
    const modal = document.getElementById('reportModal');
    const closeBtn = document.querySelector('.close-btn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            closeModal();
        }
    });
    
    // Adding dynamic search functionality
    /*const searchInput = document.getElementById('searchInput');

    searchInput.addEventListener('input', function () {
        const query = searchInput.value.toLowerCase();

        // Assuming markersLayer contains all the markers on the map
        const markers = markersLayer.getLayers();

        const filteredMarkers = markers.filter(marker => {
            const markerName = marker.options.title ? marker.options.title.toLowerCase() : '';
            return markerName.includes(query);
        });

        console.log('Filtered Markers:', filteredMarkers);

        // Center the map on the first filtered marker
        if (filteredMarkers.length > 0) {
            const firstMarker = filteredMarkers[0];
            map.setView(firstMarker.getLatLng(), 15); // Center map on the first result
        }
    });*/
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
        const googleSheetsURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQsQgn3k99SeflscYBoGEMxOV-VfoG6KjeU11dHUse7n3BNloWofEbK5aYWeCO26RZFSD7x-M33fSTm/pub?gid=397731581&single=true&output=csv';
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
                    reports.push(report);
                } else {
                    console.warn('Invalid report skipped:', report);
                }
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
        const lat = report.lat;
        const lng = report.lng;
        
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
    return `
        <div class="popup-content">
            <div class="popup-header">
                <h4 class="popup-title">${report.tipo || 'Problema urbano'}</h4>
            </div>
            <div class="popup-info">
                <div class="info-row">
                    <strong>Descripción:</strong>
                    <p>${report.descripcion || 'Sin descripción'}</p>
                </div>
                <div class="info-row">
                    <strong>Reportado por:</strong>
                    <p>${report.nombre || 'Anónimo'}</p>
                </div>
                <div class="info-row">
                    <strong>Dirección:</strong>
                    <p>${report.direccion || 'No disponible'}</p>
                </div>
                <div class="info-row">
                    <strong>Fecha:</strong>
                    <p>${formatDate(report.fecha)}</p>
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
    if (!contextMenu) return;
    contextMenu.style.display = 'block';
    // Forzar cálculo de tamaño antes de posicionar definitivo
    const menuWidth = contextMenu.offsetWidth || 160; // fallback aproximado
    const menuHeight = contextMenu.offsetHeight || 60; // fallback aproximado
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;

    let finalX = x;
    let finalY = y;

    // Si el menú se saldría por la derecha, colócalo hacia la izquierda del cursor
    if (finalX + menuWidth + margin > scrollX + viewportWidth) {
        finalX = x - menuWidth - margin;
    }
    // Si se sale por abajo, muévelo hacia arriba
    if (finalY + menuHeight + margin > scrollY + viewportHeight) {
        finalY = y - menuHeight - margin;
    }
    // Clamp mínimo para evitar valores negativos
    finalX = Math.max(scrollX + margin, finalX);
    finalY = Math.max(scrollY + margin, finalY);

    contextMenu.style.left = finalX + 'px';
    contextMenu.style.top = finalY + 'px';
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
    const baseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSd-koxDDBYzm842NyaGcu95S9Is4-DLlZ-wYQHEUbPZHuuc-w/viewform';
    const coordinatesValue = `${lat},${lng}`;
    const urlWithCoords = `${baseUrl}?usp=pp_url&embedded=true&entry.489043979=${coordinatesValue}`;
    
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

// Export functions for potential external use
window.CoMunityApp = {
    refreshReports,
    loadReports,
    map
};
