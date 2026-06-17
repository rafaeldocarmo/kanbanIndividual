import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reaproveita o cache do roteador no cliente: voltar para uma tela já
    // visitada (ou pré-carregada) é instantâneo, sem novo round-trip.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // Tree-shaking agressivo de barrels grandes — só o que é usado entra no
    // bundle de cada rota, reduzindo o JS baixado/parseado ao navegar.
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
