// Importar la configuración base de reglas recomendadas por ESLint para JavaScript
const js = require('@eslint/js');

// Exportar un arreglo de configuraciones para manejo de ESLint
module.exports = [
    {
        // Configuración para archivos dentro de la carpeta src con extensión .js
        files: ['src/**/*.js'],
        // Opciones del lenguaje para estos archivos
        languageOptions: {
            ecmaVersion: 2021, // Version que se va a soportar
            sourceType: 'commonjs' // Tipo de módulo common js (require, module.exports)
        },
        // Reglas a aplicar en estos archivos
        rules : {
            // 1. Extender las reglas recomendadas por ESLint para JavaScript
            ...js.configs.recommended.rules,
            // 2. Obligatorio usar punto y coma al final de cada sentencia
            semi: ['error', 'always'],
            // 3. Obligatorio usar comillas simples en las cadenas de texto
            quotes: ['error', 'single'],
            // 4. Prohibir el uso de 'var' fomentando let o const para respetar el scope de bloque
            'no-var': ['error'],
            // 5. Exigir 'const' para variables que no se reasignan después de su declaración
            'prefer-const': ['error'],
            // 6. Obligatorio usar igualdad estricta (=== y !==) en lugar de débil (== y !=)
            eqeqeq: ['error', 'always'],
            // 7. Exigir el uso de llaves {} en todas las estructuras de control (if, else, etc.)
            curly: ['error', 'all'],
            // 8. Prohibir espacios en blanco innecesarios al final de cada línea
            'no-trailing-spaces': ['error'],
            // 9. Prohibir importaciones duplicadas desde un mismo módulo
            'no-duplicate-imports': ['error'],
            // 10. Advertir sobre el uso de console.log, permitiendo únicamente advertencias y errores
            'no-console': ['warn', { allow: ['warn', 'error'] }]
        }
    }
];
