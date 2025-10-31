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

// Variables para puntos de corrección
let correctionPoints = [];

// Variable para el modo de operación
let operationMode = 'station'; // Valores posibles: 'station', 'correction'

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
    
    // Map click event para agregar estaciones o puntos de corrección
    map.on('click', function(e) {
        if (isCreatingRoute || editMode) {
            if (operationMode === 'station') {
                addPointToRoute(e.latlng);
            } else if (operationMode === 'correction') {
                addCorrectionPoint(e.latlng);
            }
        }
    });
}

// Add a point to the current route (station)
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

// Add a correction point
function addCorrectionPoint(latlng) {
    const point = {
        lat: parseFloat(latlng.lat.toFixed(7)),
        lng: parseFloat(latlng.lng.toFixed(7))
    };
    
    correctionPoints.push(point);
    
    // Add marker for correction point
    const marker = L.circleMarker([point.lat, point.lng], {
        radius: 6,
        fillColor: '#ff5722',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    
    marker.bindPopup('Punto de corrección<br><button class="remove-correction-btn">Eliminar</button>').openPopup();
    
    // Add event listener to remove correction point
    marker.on('popupopen', function() {
        const removeBtn = document.querySelector('.remove-correction-btn');
        removeBtn.addEventListener('click', () => removeCorrectionPoint(point, marker));
    });
    
    // Store marker for removal if needed
    if (isCreatingRoute && currentRoute) {
        currentRoute.correctionMarkers = currentRoute.correctionMarkers || [];
        currentRoute.correctionMarkers.push(marker);
    } else if (editMode && editingRoute !== null) {
        routes[editingRoute].correctionMarkers = routes[editingRoute].correctionMarkers || [];
        routes[editingRoute].correctionMarkers.push(marker);
    }
}

// Remove a correction point
function removeCorrectionPoint(point, marker) {
    correctionPoints = correctionPoints.filter(p => p.lat !== point.lat || p.lng !== point.lng);
    map.removeLayer(marker);
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

// Apply routing with correction points
async function applyRoutingWithCorrections(route, routingMode) {
    if (!route || route.ruta.length < 2) {
        alert('La ruta debe tener al menos 2 estaciones para aplicar routing');
        return null;
    }
    
    try {
        // Combine route stations and correction points
        const allPoints = [...route.ruta, ...correctionPoints];
        const sortedPoints = allPoints.map(point => [point.lng, point.lat]);
        
        // If the route is circular, connect the last point to the first
        if (route.circular) {
            sortedPoints.push(sortedPoints[0]);
        }
        
        const response = await fetch(`https://router.project-osrm.org/route/v1/${routingMode}/${sortedPoints.join(';')}?geometries=geojson&overview=full`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes[0] && data.routes[0].geometry) {
            return data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        }
        
        return null;
    } catch (error) {
        console.error('Error applying routing with corrections:', error);
        return null;
    }
}

// Apply routing to current route
async function applyRoutingToCurrentRoute() {
    if (!currentRoute) return;
    
    const routingMode = document.getElementById('routingMode').value;
    const routedCoordinates = await applyRoutingWithCorrections(currentRoute, routingMode);
    
    if (routedCoordinates) {
        if (currentRoute.polyline) {
            map.removeLayer(currentRoute.polyline);
        }
        
        currentRoute.polyline = L.polyline(routedCoordinates, {
            color: currentRoute.color,
            weight: 4,
            opacity: 0.7
        }).addTo(map);
        
        currentRoute.routedCoordinates = routedCoordinates;
        alert('Routing aplicado con puntos de corrección');
    } else {
        alert('No se pudo aplicar el routing con los puntos de corrección');
    }
}

// Apply routing to selected route in edit mode
async function applyRoutingToSelectedRoute() {
    if (editingRoute === null) return;
    
    const route = routes[editingRoute];
    const routingMode = document.getElementById('editRoutingMode').value;
    const routedCoordinates = await applyRoutingWithCorrections(route, routingMode);
    
    if (routedCoordinates) {
        if (route.polyline) {
            map.removeLayer(route.polyline);
        }
        
        route.polyline = L.polyline(routedCoordinates, {
            color: route.color,
            weight: 4,
            opacity: 0.7
        }).addTo(map);
        
        route.routedCoordinates = routedCoordinates;
        alert(`Routing aplicado con puntos de corrección a "${route.linea}"`);
    } else {
        alert('No se pudo aplicar el routing con los puntos de corrección');
    }
}

// Remove routing from selected route
function removeRoutingFromSelectedRoute() {
    const selectedRouteIndex = document.getElementById('routeSelector').value;
    if (selectedRouteIndex === '') {
        alert('Por favor, selecciona una ruta');
        return;
    }
    
    const routeIndex = parseInt(selectedRouteIndex);
    const route = routes[routeIndex];
    
    if (!route) return;
    
    if (confirm(`¿Quitar el routing de "${route.linea}" y usar línea directa?`)) {
        // Remove routed coordinates
        delete routes[routeIndex].routedCoordinates;
        
        // Refresh display
        displayAllRoutes();
        updateJsonOutput();
        
        alert(`Routing removido de "${route.linea}"`);
    }
}

// Get routed path using OSRM (free, no API key required)
async function getRoutedPathOSRM(stations, mode = 'driving') {
    if (stations.length < 2) return null;
    
    try {
        // Map routing modes to OSRM profiles
        const osrmProfile = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bicycle' : 'driving';
        
        // Construir coordenadas para OSRM
        const coordinates = stations.map(station => `${station.lng},${station.lat}`).join(';');
        
        const response = await fetch(`https://router.project-osrm.org/route/v1/${osrmProfile}/${coordinates}?geometries=geojson&overview=full`);
        
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
        // Fallback: usar línea directa si falla el routing
        return stations.map(station => [station.lat, station.lng]);
    }
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
        markers: [],
        routedCoordinates: null
    };
    
    isCreatingRoute = true;
    updateUI();
    updateRouteInfo();
}

// Toggle operation mode
function toggleOperationMode(mode) {
    operationMode = mode; // 'station' o 'correction'
    const modeDisplay = document.getElementById('operationModeDisplay');
    modeDisplay.textContent = mode === 'station' ? 'Agregar Estaciones' : 'Agregar Puntos de Corrección';
}

// Update the route polyline
function updateRoutePolyline() {
    if (currentRoute.polyline) {
        map.removeLayer(currentRoute.polyline);
    }
    
    if (currentRoute.ruta.length > 1) {
        const latLngs = currentRoute.ruta.map(point => [point.lat, point.lng]);
        const dashArray = useStreetRouting ? '10, 10' : '5, 5';
        const opacity = useStreetRouting ? 0.5 : 0.7;
        
        currentRoute.polyline = L.polyline(latLngs, {
            color: currentRoute.color,
            weight: 4,
            opacity: opacity,
            dashArray: dashArray
        }).addTo(map);
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
        ruta: [...currentRoute.ruta],
        correctionPoints: [...correctionPoints], // Save correction points
        circular: document.getElementById('isCircular').checked // Save circular flag
    };
    
    // Include routed coordinates if available
    if (currentRoute.routedCoordinates) {
        routeData.routedCoordinates = currentRoute.routedCoordinates;
    }
    
    routes.push(routeData);
    
    // Reset current route
    currentRoute = null;
    correctionPoints = [];
    isCreatingRoute = false;
    
    updateUI();
    updateRouteInfo();
    updateJsonOutput();
    
    // Clear form
    document.getElementById('lineName').value = '';
    document.getElementById('lineColor').value = '#3b82f6';
    document.getElementById('isCircular').checked = false;
}

// Clear all routes
function clearAllRoutes() {
    if (!confirm('¿Estás seguro de que quieres eliminar todas las rutas y puntos de corrección?')) {
        return;
    }
    
    // Remove all layers from map
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
            map.removeLayer(layer);
        }
    });
    
    routes = [];
    currentRoute = null;
    correctionPoints = [];
    isCreatingRoute = false;
    editMode = false;
    editingRoute = null;
    
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

// Update edit routing mode
function updateEditRoutingMode() {
    // This can be used if needed for different routing options
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
    const applyEditRoutingBtn = document.getElementById('applyEditRouting');
    const removeRoutingBtn = document.getElementById('removeRouting');
    const editRoutingModeSelect = document.getElementById('editRoutingMode');
    const toggleStationModeBtn = document.getElementById('toggleStationMode');
    const toggleCorrectionModeBtn = document.getElementById('toggleCorrectionMode');
    
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
    applyEditRoutingBtn.addEventListener('click', applyRoutingToSelectedRoute);
    removeRoutingBtn.addEventListener('click', removeRoutingFromSelectedRoute);
    editRoutingModeSelect.addEventListener('change', updateEditRoutingMode);
    toggleStationModeBtn.addEventListener('click', () => toggleOperationMode('station'));
    toggleCorrectionModeBtn.addEventListener('click', () => toggleOperationMode('correction'));
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

// Start edit mode
function startEditMode() {
    const selectedRouteIndex = document.getElementById('routeSelector').value;
    if (selectedRouteIndex === '') {
        alert('Por favor, selecciona una ruta para editar');
        return;
    }
    
    editMode = true;
    editingRoute = parseInt(selectedRouteIndex);
    
    // Show routing controls for edit mode
    document.getElementById('editRoutingControls').style.display = 'block';
    
    displayAllRoutes();
    updateEditUI();
}

// Exit edit mode
function exitEditMode() {
    editMode = false;
    editingRoute = null;
    
    // Hide routing controls for edit mode
    document.getElementById('editRoutingControls').style.display = 'none';
    
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

// Delete a station
function deleteStation(routeIndex, pointIndex) {
    if (routes[routeIndex].ruta.length <= 2) {
        alert('Una ruta debe tener al menos 2 estaciones');
        return;
    }
    
    routes[routeIndex].ruta.splice(pointIndex, 1);
    
    // Clear routed coordinates as they are no longer valid
    const hadRouting = routes[routeIndex].routedCoordinates !== undefined;
    delete routes[routeIndex].routedCoordinates;
    
    displayAllRoutes();
    updateJsonOutput();
    
    if (hadRouting) {
        setTimeout(() => {
            alert('Las coordenadas de routing se han eliminado debido a la eliminación de la estación. Aplica routing nuevamente si es necesario.');
        }, 100);
    }
}

// Update station coordinates after drag
function updateStationCoordinates(routeIndex, pointIndex, newLatLng) {
    routes[routeIndex].ruta[pointIndex].lat = parseFloat(newLatLng.lat.toFixed(7));
    routes[routeIndex].ruta[pointIndex].lng = parseFloat(newLatLng.lng.toFixed(7));
    
    // Clear routed coordinates as they are no longer valid after moving stations
    const hadRouting = routes[routeIndex].routedCoordinates !== undefined;
    delete routes[routeIndex].routedCoordinates;
    
    // Refresh the route display
    displayAllRoutes();
    updateJsonOutput();
    
    // Show warning about routing being invalidated
    if (hadRouting) {
        setTimeout(() => {
            alert('Las coordenadas de routing se han eliminado debido al cambio de posición de la estación. Aplica routing nuevamente si es necesario.');
        }, 100);
    }
}

// Display a single route on map (modified for routing support)
function displayRoute(route, routeIndex) {
    const { linea, color, ruta, correctionPoints = [], circular } = route;
    
    // Create polyline - use stored routing coordinates if available
    let latLngs;
    let isRouted = false;
    
    if (route.routedCoordinates && route.routedCoordinates.length > 0) {
        latLngs = route.routedCoordinates;
        isRouted = true;
    } else {
        latLngs = ruta.map(point => [point.lat, point.lng]);
        if (circular) {
            latLngs.push(latLngs[0]); // Close the route if circular
        }
    }
    
    const polyline = L.polyline(latLngs, {
        color: color,
        weight: isRouted ? 6 : 4,
        opacity: isRouted ? 0.9 : 0.8,
        dashArray: isRouted ? null : '5, 5' // Solid line for routed, dashed for direct
    }).addTo(map);
    
    const routingStatus = isRouted ? ' (con routing)' : ' (línea directa)';
    polyline.bindPopup(`<strong>🚌 ${linea}</strong><br>Ruta del Transmetro${routingStatus}`);
    
    // Create markers for correction points
    correctionPoints.forEach(point => {
        const marker = L.circleMarker([point.lat, point.lng], {
            radius: 6,
            fillColor: '#ff5722',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);
        
        marker.bindPopup('Punto de corrección');
    });
    
    // Create markers for stations
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
