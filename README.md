# React Frontend Project (No Vite)

Este es un proyecto de React configurado manualmente utilizando **Webpack** y **Babel**.

## Estructura de Carpetas

- **public/**: Archivos estáticos. Contiene el `index.html`.
- **src/**: Código fuente de la aplicación.
  - **assets/**: Imágenes, fuentes, etc.
  - **components/**: Componentes reutilizables.
    - **common/**: Botones, inputs, etc.
    - **layout/**: Header, Footer, Sidebar.
  - **context/**: Contextos de React (State Management).
  - **hooks/**: Custom hooks.
  - **pages/**: Componentes de página (vistas).
  - **services/**: Llamadas a APIs y servicios externos.
  - **styles/**: Archivos CSS/SASS globales.
  - **utils/**: Funciones de utilidad y helpers.
  - **App.jsx**: Componente principal.
  - **index.jsx**: Punto de entrada de la aplicación.

## Scripts

- `npm start`: Inicia el servidor de desarrollo en http://localhost:3000.
- `npm run build`: Genera el bundle de producción en la carpeta `dist/`.
