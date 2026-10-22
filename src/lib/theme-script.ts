// Shared by the root layout (server) and useTheme (client), so it must stay
// free of "use client" and React imports.
export const THEME_STORAGE_KEY = "app_theme";

// Runs in <head> before hydration to restore a saved dark theme without a flash
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}}catch(e){}`;
