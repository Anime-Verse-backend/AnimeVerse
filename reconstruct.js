
const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, 'project_bundle.json');
const projectRoot = __dirname;

try {
    console.log(`[RECONSTRUCT] Leyendo el paquete del proyecto desde: ${bundlePath}`);
    const bundleRaw = fs.readFileSync(bundlePath, 'utf8');
    const projectBundle = JSON.parse(bundleRaw);

    if (!projectBundle.files || !Array.isArray(projectBundle.files)) {
        throw new Error('Formato de paquete inválido: no se encontró el array "files".');
    }

    console.log(`[RECONSTRUCT] Se encontraron ${projectBundle.files.length} archivos. Reconstruyendo el proyecto en: ${projectRoot}`);

    projectBundle.files.forEach(fileData => {
        const relativePath = fileData.path.startsWith('/') ? fileData.path.substring(1) : fileData.path;
        const filePath = path.join(projectRoot, relativePath);
        const dirName = path.dirname(filePath);

        try {
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }

            fs.writeFileSync(filePath, fileData.content, 'utf8');
        } catch (writeError) {
            console.error(`[RECONSTRUCT] Falló la escritura del archivo ${filePath}:`, writeError);
        }
    });

    console.log('\n\n✅ ¡Reconstrucción del proyecto completada exitosamente!');
    console.log('--- Próximos Pasos ---');
    console.log('1. Abre una terminal en esta carpeta.');
    console.log('2. Instala las dependencias: `npm install`');
    console.log('3. Configura tu base de datos y completa el archivo `.env` (lee ENVIRONMENT_SETUP.md para ayuda).');
    console.log('4. Inicia el backend en una terminal: `npm run dev:backend`');
    console.log('5. Inicia el frontend en OTRA terminal: `npm run dev`');


} catch (error) {
    console.error('Ocurrió un error crítico durante la reconstrucción del proyecto:', error);
    process.exit(1);
}
