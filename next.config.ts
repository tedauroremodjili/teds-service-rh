import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Masque la pastille « N » de Next.js affichee en bas a gauche en
  // developpement. Les erreurs de compilation et d'execution restent signalees.
  devIndicators: false,

  turbopack: {
    // Un package-lock.json parasite dans le dossier utilisateur (au-dessus de
    // Documents/teds-service-rh) faisait remonter Turbopack a la mauvaise
    // racine et cassait la resolution de globals.css. On fixe la racine
    // explicitement plutot que de compter sur la detection automatique.
    root: path.join(__dirname),
  },

  // Les paquets natifs (bcrypt, Prisma, Puppeteer) ne doivent pas etre bundles cote serveur.
  serverExternalPackages: ["@prisma/client", "bcryptjs", "puppeteer"],
  images: {
    // Next 16 : les qualites autorisees sont explicites (defaut [75]).
    qualities: [75, 90],
  },
  experimental: {
    // Cache disque de Turbopack : recompilations plus rapides entre redemarrages.
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
