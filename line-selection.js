// Map instance and data
let map;
let routes = [];
let currentRoute = null;
let isCreatingRoute = false;
let editMode = false;
let editingRoute = null;

let useStreetRouting = false;
let routingMode = 'driving-car';

// OpenRouteService API key (necesitarás registrarte para obtener una gratuita)
const ORS_API_KEY = '5b3ce3597851110001cf6248a1b2c3c7d4e84c8b8f7b4b4b4b4b4b4b'; // Reemplaza con tu API key

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    updateJsonOutput();
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
    
    // Map click event for adding points
    map.on('click', function(e) {
        if (isCreatingRoute && currentRoute) {
            addPointToRoute(e.latlng);
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    const startRouteBtn = document.getElementById('startRoute');
    const finishRouteBtn = document.getElementById('finishRoute');
    const clearAllBtn = document.getElementById('clearAll');
    const copyJsonBtn = document.getElementById('copyJson');
    const loadJsonBtn = document.getElementById('loadJson');
    const loadFromFileBtn = document.getElementById('loadFromFile');
    const fileInput = document.getElementById('fileInput');
    const editRouteBtn = document.getElementById('editRoute');
    const deleteRouteBtn = document.getElementById('deleteRoute');
    const exitEditBtn = document.getElementById('exitEdit');
    const useStreetRoutingCheckbox = document.getElementById('useStreetRouting');
    const routingModeSelect = document.getElementById('routingMode');
    const applyRoutingBtn = document.getElementById('applyRouting');
    
    startRouteBtn.addEventListener('click', startNewRoute);
    finishRouteBtn.addEventListener('click', finishCurrentRoute);
    clearAllBtn.addEventListener('click', clearAllRoutes);
    copyJsonBtn.addEventListener('click', copyJsonToClipboard);
    loadJsonBtn.addEventListener('click', loadFromJson);
    loadFromFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', loadFromFile);
    editRouteBtn.addEventListener('click', startEditMode);
    deleteRouteBtn.addEventListener('click', deleteSelectedRoute);
    exitEditBtn.addEventListener('click', exitEditMode);
    useStreetRoutingCheckbox.addEventListener('change', toggleStreetRouting);
    routingModeSelect.addEventListener('change', updateRoutingMode);
    applyRoutingBtn.addEventListener('click', applyRoutingToCurrentRoute);
}

// Toggle street routing
function toggleStreetRouting() {
    useStreetRouting = document.getElementById('useStreetRouting').checked;
    document.getElementById('applyRouting').disabled = !useStreetRouting || !currentRoute || currentRoute.ruta.length < 2;
}

// Update routing mode
function updateRoutingMode() {
    routingMode = document.getElementById('routingMode').value;
}

// Start creating a new route
function startNewRoute() {
    const lineName = document.getElementById('lineName').value.trim();
    const lineColor = document.getElementById('lineColor').value;
    
    if (!lineName) {
        alert('Por favor, ingresa el nombre de la línea');
        return;
    }
    
    // Check if route name already exists
    if (routes.find(route => route.linea === lineName)) {
        alert('Ya existe una ruta con ese nombre');
        return;
    }
    
    currentRoute = {
        linea: lineName,
        color: lineColor,
        ruta: [],
        polyline: null,
        markers: []
    };
    
    isCreatingRoute = true;
    updateUI();
    updateRouteInfo();
}

// Add a point to the current route
function addPointToRoute(latlng) {
    const stationName = prompt('Nombre de la estación:');
    if (!stationName) return;
    
    const point = {
        nombre: stationName,
        lat: parseFloat(latlng.lat.toFixed(7)),
        lng: parseFloat(latlng.lng.toFixed(7))
    };
    
    currentRoute.ruta.push(point);
    
    // Create marker
    const marker = L.marker([latlng.lat, latlng.lng], {
        icon: L.divIcon({
            className: 'point-marker',
            html: `<div style="
                background-color: ${currentRoute.color}; 
                border: 2px solid white;
                border-radius: 50%;
                width: 12px;
                height: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        })
    }).addTo(map);
    
    marker.bindPopup(`<strong>${stationName}</strong><br>Línea: ${currentRoute.linea}`);
    currentRoute.markers.push(marker);
    
    // Update or create polyline
    updateRoutePolyline();
    updateRouteInfo();
}

// Get routed path using OpenRouteService
async function getRoutedPath(stations) {
    if (stations.length < 2) return null;
    
    try {
        const coordinates = stations.map(station => [station.lng, station.lat]);
        
        const requestBody = {
            coordinates: coordinates,
            format: "geojson",
            profile: routingMode,
            options: {
                avoid_features: ["highways"] // Evitar autopistas para transporte público
            }
        };
        
        const response = await fetch('https://api.openrouteservice.org/v2/directions/' + routingMode + '/geojson', {
            method: 'POST',
            headers: {
                'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.features && data.features[0] && data.features[0].geometry) {
            // Convertir coordenadas [lng, lat] a [lat, lng] para Leaflet
            return data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        }
        
        return null;
        
    } catch (error) {
        console.error('Routing error:', error);
        
        // Fallback: usar línea directa si falla el routing
        console.warn('Routing failed, using direct line');
        return stations.map(station => [station.lat, station.lng]);
    }
}

// Alternative: Use OSRM (free, no API key required)
async function getRoutedPathOSRM(stations) {
    if (stations.length < 2) return null;
    
    try {
        // Construir coordenadas para OSRM
        const coordinates = stations.map(station => `${station.lng},${station.lat}`).join(';');
        
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?geometries=geojson`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes[0] && data.routes[0].geometry) {
            // Convertir coordenadas [lng, lat] a [lat, lng] para Leaflet
            return data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        }
        
        return null;
        
    } catch (error) {
        console.error('OSRM routing error:', error);
        return stations.map(station => [station.lat, station.lng]);
    }
}

// Update the route polyline
function updateRoutePolyline() {
    if (currentRoute.polyline) {
        map.removeLayer(currentRoute.polyline);
    }
    
    if (currentRoute.ruta.length > 1) {
        if (useStreetRouting) {
            // Si está activado el routing, usar línea directa temporalmente
            // El usuario debe hacer clic en "Aplicar Routing" para obtener la ruta real
            const latLngs = currentRoute.ruta.map(point => [point.lat, point.lng]);
            currentRoute.polyline = L.polyline(latLngs, {
                color: currentRoute.color,
                weight: 4,
                opacity: 0.5,
                dashArray: '10, 10' // Más punteado para indicar que es temporal
            }).addTo(map);
        } else {
            const latLngs = currentRoute.ruta.map(point => [point.lat, point.lng]);
            currentRoute.polyline = L.polyline(latLngs, {
                color: currentRoute.color,
                weight: 4,
                opacity: 0.7,
                dashArray: '5, 5'
            }).addTo(map);
        }
    }
    
    // Update apply routing button state
    document.getElementById('applyRouting').disabled = !useStreetRouting || !currentRoute || currentRoute.ruta.length < 2;
}

// Finish current route
function finishCurrentRoute() {
    if (!currentRoute || currentRoute.ruta.length === 0) {
        alert('No hay puntos en la ruta actual');
        return;
    }
    
    // Make polyline solid
    if (currentRoute.polyline) {
        currentRoute.polyline.setStyle({ dashArray: null, opacity: 0.8, weight: 6 });
    }
    
    // Add to routes array
    const routeData = {
        linea: currentRoute.linea,
        color: currentRoute.color,
        ruta: [...currentRoute.ruta]
    };
    
    routes.push(routeData);
    
    // Reset current route
    currentRoute = null;
    isCreatingRoute = false;
    
    updateUI();
    updateRouteInfo();
    updateJsonOutput();
    
    // Clear form
    document.getElementById('lineName').value = '';
    document.getElementById('lineColor').value = '#3b82f6';
}

// Clear all routes
function clearAllRoutes() {
    if (!confirm('¿Estás seguro de que quieres eliminar todas las rutas?')) {
        return;
    }
    
    // Remove all layers from map
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
    
    routes = [];
    currentRoute = null;
    isCreatingRoute = false;
    
    updateUI();
    updateRouteInfo();
    updateJsonOutput();
}

// Load routes from JSON input
function loadFromJson() {
    const jsonInput = document.getElementById('importJson').value.trim();
    if (!jsonInput) {
        alert('Por favor, pega el JSON en el área de texto');
        return;
    }
    
    try {
        const importedRoutes = JSON.parse(jsonInput);
        if (!Array.isArray(importedRoutes)) {
            throw new Error('El JSON debe ser un array de rutas');
        }
        
        // Validate route structure
        importedRoutes.forEach((route, index) => {
            if (!route.linea || !route.color || !Array.isArray(route.ruta)) {
                throw new Error(`Ruta ${index + 1} tiene formato incorrecto`);
            }
        });
        
        // Clear existing routes and load new ones
        clearAllRoutes();
        routes = importedRoutes;
        displayAllRoutes();
        updateJsonOutput();
        updateRouteSelector();
        
        // Clear import textarea
        document.getElementById('importJson').value = '';
        
        alert(`${routes.length} rutas cargadas exitosamente`);
        
    } catch (error) {
        alert('Error al cargar JSON: ' + error.message);
    }
}

// Load routes from file
function loadFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('importJson').value = e.target.result;
        loadFromJson();
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// Display all existing routes on map
function displayAllRoutes() {
    // Clear existing layers
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
    
    routes.forEach((route, routeIndex) => {
        displayRoute(route, routeIndex);
    });
}

// Display a single route on map
function displayRoute(route, routeIndex) {
    const { linea, color, ruta } = route;
    
    // Create polyline - use stored routing coordinates if available
    let latLngs;
    if (route.routedCoordinates) {
        latLngs = route.routedCoordinates;
    } else {
        latLngs = ruta.map(point => [point.lat, point.lng]);
    }
    
    const polyline = L.polyline(latLngs, {
        color: color,
        weight: 6,
        opacity: 0.8
    }).addTo(map);
    
    polyline.bindPopup(`<strong>🚌 ${linea}</strong><br>Ruta del Transmetro`);
    
    // Create markers
    ruta.forEach((point, pointIndex) => {
        createStationMarker(point, route, routeIndex, pointIndex);
    });
}

// Create a station marker (draggable in edit mode)
function createStationMarker(point, route, routeIndex, pointIndex) {
    const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
            className: 'station-marker',
            html: `<div style="
                background-color: ${route.color}; 
                border: 2px solid white;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: ${editMode ? 'move' : 'pointer'};
            "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        }),
        draggable: editMode
    }).addTo(map);
    
    marker.bindPopup(`<strong>${point.nombre}</strong><br>Línea: ${route.linea}`);
    
    // Add context menu for deletion in edit mode
    if (editMode) {
        marker.on('contextmenu', function(e) {
            if (confirm(`¿Eliminar la estación "${point.nombre}"?`)) {
                deleteStation(routeIndex, pointIndex);
            }
        });
        
        // Update coordinates when dragged
        marker.on('dragend', function(e) {
            const newLatLng = e.target.getLatLng();
            updateStationCoordinates(routeIndex, pointIndex, newLatLng);
        });
    }
    
    return marker;
}

// Update station coordinates after drag
function updateStationCoordinates(routeIndex, pointIndex, newLatLng) {
    routes[routeIndex].ruta[pointIndex].lat = parseFloat(newLatLng.lat.toFixed(7));
    routes[routeIndex].ruta[pointIndex].lng = parseFloat(newLatLng.lng.toFixed(7));
    
    // Refresh the route display
    displayAllRoutes();
    updateJsonOutput();
}

// Delete a station
function deleteStation(routeIndex, pointIndex) {
    if (routes[routeIndex].ruta.length <= 2) {
        alert('Una ruta debe tener al menos 2 estaciones');
        return;
    }
    
    routes[routeIndex].ruta.splice(pointIndex, 1);
    displayAllRoutes();
    updateJsonOutput();
}

// Update route selector dropdown
function updateRouteSelector() {
    const selector = document.getElementById('routeSelector');
    selector.innerHTML = '<option value="">Selecciona una ruta para editar</option>';
    
    routes.forEach((route, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = route.linea;
        selector.appendChild(option);
    });
    
    // Show/hide edit controls
    const editControls = document.getElementById('editControls');
    editControls.style.display = routes.length > 0 ? 'block' : 'none';
}

// Start edit mode
function startEditMode() {
    const selectedRouteIndex = document.getElementById('routeSelector').value;
    if (selectedRouteIndex === '') {
        alert('Por favor, selecciona una ruta para editar');
        return;
    }
    
    editMode = true;
    editingRoute = parseInt(selectedRouteIndex);
    
    displayAllRoutes();
    updateEditUI();
}

// Exit edit mode
function exitEditMode() {
    editMode = false;
    editingRoute = null;
    
    displayAllRoutes();
    updateEditUI();
}

// Delete selected route
function deleteSelectedRoute() {
    const selectedRouteIndex = document.getElementById('routeSelector').value;
    if (selectedRouteIndex === '') {
        alert('Por favor, selecciona una ruta para eliminar');
        return;
    }
    
    const routeName = routes[selectedRouteIndex].linea;
    if (!confirm(`¿Eliminar la ruta "${routeName}"?`)) {
        return;
    }
    
    routes.splice(selectedRouteIndex, 1);
    displayAllRoutes();
    updateJsonOutput();
    exitEditMode();
}

// Update UI state
function updateUI() {
    const startBtn = document.getElementById('startRoute');
    const finishBtn = document.getElementById('finishRoute');
    const lineNameInput = document.getElementById('lineName');
    const lineColorInput = document.getElementById('lineColor');
    
    if (isCreatingRoute) {
        startBtn.disabled = true;
        finishBtn.disabled = false;
        lineNameInput.disabled = true;
        lineColorInput.disabled = true;
    } else {
        startBtn.disabled = false;
        finishBtn.disabled = true;
        lineNameInput.disabled = false;
        lineColorInput.disabled = false;
    }
}

// Update route info display
function updateRouteInfo() {
    const routeInfo = document.getElementById('currentRouteInfo');
    const routeName = document.getElementById('currentRouteName');
    const pointCount = document.getElementById('pointCount');
    
    if (isCreatingRoute && currentRoute) {
        routeInfo.style.display = 'block';
        routeName.textContent = currentRoute.linea;
        pointCount.textContent = currentRoute.ruta.length;
    } else {
        routeInfo.style.display = 'none';
    }
}

// Update JSON output
function updateJsonOutput() {
    const jsonOutput = document.getElementById('jsonOutput');
    jsonOutput.value = JSON.stringify(routes, null, 2);
    updateRouteSelector();
}

// Copy JSON to clipboard
function copyJsonToClipboard() {
    const jsonOutput = document.getElementById('jsonOutput');
    jsonOutput.select();
    document.execCommand('copy');
    
    const copyBtn = document.getElementById('copyJson');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '¡Copiado!';
    copyBtn.style.backgroundColor = '#10b981';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.backgroundColor = '#3b82f6';
    }, 2000);
}

// Update edit UI
function updateEditUI() {
    const createControls = document.querySelector('.route-controls');
    const editControls = document.getElementById('editControls');
    
    if (editMode) {
        createControls.style.opacity = '0.5';
        createControls.style.pointerEvents = 'none';
    } else {
        createControls.style.opacity = '1';
        createControls.style.pointerEvents = 'auto';
    }
}
