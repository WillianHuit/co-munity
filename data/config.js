// Configuration file for Co-Munity data sources

const DATA_CONFIG = {
    // Replace with your actual Google Sheets CSV export URL
    // Format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv&gid=SHEET_ID
    REPORTS_URL: 'https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/export?format=csv&gid=0',
    
    // Google Form URL for reporting (replace with your actual form)
    // Format: https://docs.google.com/forms/d/e/FORM_ID/viewform
    GOOGLE_FORM_URL: 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?embedded=true',
    
    // Expected CSV columns (modify based on your Google Sheets structure)
    CSV_COLUMNS: {
        timestamp: 'Timestamp',
        nombre: 'Nombre',
        tipo: 'Tipo de problema',
        descripcion: 'Descripción',
        latitud: 'Latitud',
        longitud: 'Longitud', 
        foto: 'Foto',
        estado: 'Estado'
    },
    
    // Map settings
    MAP_CONFIG: {
        center: [14.6349, -90.5069], // Guatemala City coordinates
        zoom: 12,
        maxZoom: 19
    },
    
    // Problem types and their colors
    PROBLEM_TYPES: {
        'Bache': {
            color: '#ef4444',
            icon: '🕳️'
        },
        'Fuga de agua': {
            color: '#3b82f6', 
            icon: '💧'
        },
        'Alumbrado público': {
            color: '#f59e0b',
            icon: '💡'
        },
        'Basura': {
            color: '#8b5cf6',
            icon: '🗑️'
        },
        'Alcantarilla': {
            color: '#059669',
            icon: '🚰'
        },
        'Semáforo': {
            color: '#dc2626',
            icon: '🚦'
        },
        'Otros': {
            color: '#6b7280',
            icon: '⚠️'
        }
    },
    
    // Report status types and their colors
    STATUS_TYPES: {
        'Pendiente': {
            color: '#f59e0b',
            bgColor: '#fef3c7',
            priority: 1
        },
        'Reportado': {
            color: '#3b82f6',
            bgColor: '#dbeafe',
            priority: 2
        },
        'En proceso': {
            color: '#8b5cf6',
            bgColor: '#e9d5ff',
            priority: 3
        },
        'Resuelto': {
            color: '#16a34a',
            bgColor: '#d1fae5',
            priority: 4
        },
        'Cancelado': {
            color: '#6b7280',
            bgColor: '#f3f4f6',
            priority: 5
        }
    },
    
    // List view settings
    LIST_CONFIG: {
        itemsPerPage: 10,
        sortOptions: ['fecha', 'tipo', 'estado', 'prioridad'],
        defaultSort: 'fecha',
        showPagination: true
    }
};

// Instructions for setup:
// 
// 1. GOOGLE SHEETS SETUP:
//    - Create a Google Sheet with columns: Timestamp, Nombre, Tipo de problema, 
//      Descripción, Latitud, Longitud, Foto, Estado
//    - Go to File > Share > Publish to web
//    - Choose "Comma-separated values (.csv)" and publish
//    - Copy the CSV export URL and replace REPORTS_URL above
//
// 2. GOOGLE FORM SETUP:
//    - Create a Google Form with corresponding fields
//    - Link responses to your Google Sheet
//    - Get the embedded form URL and replace GOOGLE_FORM_URL above
//    - Update the iframe src in index.html with your form URL
//
// 3. TESTING:
//    - Use the sample data first to test the application
//    - Once your Google Sheets/Forms are ready, update the URLs
//
// 4. DEPLOYMENT:
//    - Host the files on any web server (GitHub Pages, Netlify, etc.)
//    - Ensure CORS is enabled for your Google Sheets CSV export

// Export for ES6 modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA_CONFIG;
}
