# Co-Munity

Co-Munity es una aplicación web ligera que permite a los ciudadanos reportar problemas urbanos (baches, fugas de agua, alumbrado público dañado, basura, etc.) y visualizarlos en un mapa interactivo. Además, incluye una vista de lista para que las personas encargadas puedan gestionar los reportes de manera eficiente.

## Características

- **Mapa interactivo**: Visualización de reportes en un mapa generado con Leaflet.js y datos de OpenStreetMap.
- **Formulario de reportes**: Integración con Google Forms para enviar nuevos reportes.
- **Vista de lista**: Gestión de reportes con filtros, búsqueda, ordenamiento, estadísticas y exportación a CSV.
- **Diseño adaptable**: Interfaz moderna y responsiva con colores base:
  - Azul `#1e3a8a` (confianza y municipalidad)
  - Verde `#16a34a` (medioambiente y acción)
  - Gris claro `#f3f4f6` (fondo)

## Requisitos

- **Frontend**: HTML, CSS y JavaScript puro (sin frameworks pesados).
- **Backend**: Google Sheets como base de datos para almacenar los reportes.
- **Mapa**: Leaflet.js con datos de OpenStreetMap.

## Estructura del Proyecto

```
/co-munity
├── index.html          # Página principal con el mapa interactivo
├── reports-list.html   # Página para la vista de lista de reportes
├── style.css           # Estilos generales
├── list-styles.css     # Estilos específicos para la vista de lista
├── script.js           # Lógica del mapa y reportes
├── reports-list.js     # Lógica de la vista de lista
├── data/
│   ├── config.js       # Configuración del proyecto
├── assets/             # Recursos estáticos (íconos, imágenes, etc.)
└── README.md           # Documentación del proyecto
```

## Configuración

### 1. Configurar Google Sheets

1. Crea una hoja de cálculo en Google Sheets con las siguientes columnas:
   - `Timestamp`, `Nombre`, `Tipo de problema`, `Descripción`, `Latitud`, `Longitud`, `Foto`, `Estado`
2. Ve a **Archivo > Compartir > Publicar en la web**.
3. Selecciona **Valores separados por comas (.csv)** y publica.
4. Copia el enlace generado y reemplázalo en `REPORTS_URL` dentro de `data/config.js`.

### 2. Configurar Google Forms

1. Crea un formulario en Google Forms con los campos correspondientes.
2. Vincula las respuestas del formulario a tu hoja de cálculo.
3. Obtén el enlace embebido del formulario y reemplázalo en `GOOGLE_FORM_URL` dentro de `data/config.js`.

### 3. Configurar el Proyecto

- Abre el archivo `data/config.js` y actualiza las siguientes configuraciones:
  - `REPORTS_URL`: URL pública del CSV de Google Sheets.
  - `GOOGLE_FORM_URL`: URL embebida del formulario de Google Forms.

## Uso

### 1. Página Principal (Mapa)

- Abre `index.html` en tu navegador.
- Visualiza los reportes en el mapa interactivo.
- Haz clic en el botón flotante para abrir el formulario de reportes.

### 2. Vista de Lista

- Abre `reports-list.html` en tu navegador.
- Filtra, busca y ordena los reportes.
- Exporta los reportes a un archivo CSV.
- Haz clic en un reporte para ver los detalles.

## Desarrollo

### Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/tu-usuario/co-munity.git
   ```
2. Abre el proyecto en tu editor de código.

### Dependencias

- **Leaflet.js**: Incluido desde CDN.
- **Google Sheets**: Usado como backend para almacenar los reportes.

### Personalización

- Modifica los colores y estilos en `style.css` y `list-styles.css`.
- Ajusta la configuración en `data/config.js`.

## Despliegue

1. Sube los archivos a un servidor web (por ejemplo, GitHub Pages, Netlify, Vercel).
2. Asegúrate de que la URL del CSV de Google Sheets sea accesible públicamente.

## Créditos

- **Leaflet.js**: Biblioteca para mapas interactivos.
- **OpenStreetMap**: Datos de mapas.
- **Google Sheets**: Backend para almacenamiento de datos.

## Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).