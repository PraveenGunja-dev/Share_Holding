
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { AuthProvider } from "./app/context/AuthContext";
import { ThemeProvider } from "./app/context/ThemeContext";
import App from "./app/App";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <ThemeProvider>
      <App />
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  </AuthProvider>
);