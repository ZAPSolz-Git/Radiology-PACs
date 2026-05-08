import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";
import { fileURLToPath, URL } from "url";

/**
 * Vite configuration for Cornerstone.js v2 DICOM viewer
 * 
 * Key configuration:
 * - Uses vite-plugin-commonjs for dicom-parser (CommonJS format)
 * - Worker format set to ES modules for Cornerstone web workers
 * - Excludes Cornerstone DICOM image loader from optimization
 * - Includes dicom-parser in optimization for proper bundling
 */
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Proxy Orthanc DICOMweb API (runs on port 8042)
      '/dicom-web': {
        target: 'http://localhost:8042',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    // Required for dicom-parser which uses CommonJS
    viteCommonjs(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Fix path resolution for @cornerstonejs/core during production build
      "@cornerstonejs/core": fileURLToPath(
        new URL("node_modules/@cornerstonejs/core/dist/esm", import.meta.url)
      ),
    },
  },
  // Dependency optimization for Cornerstone and custom Tiptap editor
  optimizeDeps: {
    exclude: ["@cornerstonejs/dicom-image-loader"],
    include: ["dicom-parser", "@tiptap/react", "mammoth", "@docen/export-docx"],
  },
  // Worker configuration for Cornerstone WASM decoders
  worker: {
    format: "es",
    rollupOptions: {
      external: ["@icr/polyseg-wasm"],
    },
  },
  // Build configuration
  build: {
    // Prevent minification issues with tool names
    minify: mode === "production" ? "esbuild" : false,
    rollupOptions: {
      output: {
        // Ensure proper chunking for large Cornerstone libs
        manualChunks: {
          cornerstone: [
            "@cornerstonejs/core",
            "@cornerstonejs/tools",
            "@cornerstonejs/dicom-image-loader",
          ],
        },
      },
    },
  },
}));
