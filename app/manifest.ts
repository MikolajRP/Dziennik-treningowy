import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dziennik Treningowy",
    short_name: "Dziennik",
    description: "Osobisty dziennik treningowy — bieganie, siła i inne aktywności.",
    start_url: "/",
    display: "standalone",
    background_color: "#ECEEE3",
    theme_color: "#1B2A3A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
