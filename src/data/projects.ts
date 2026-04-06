export interface Project {
  slug: string;
  title: string;
  description: string;
  image: string;
  tech: string[];
  github?: string;
  demo?: string;
}

export const projects: Project[] = [
  {
    slug: 'portfolio',
    title: 'Portfolio & Blog',
    description:
      'Sitio personal con blog técnico, terminal interactiva y dashboard. Construido con Astro 5, Tailwind CSS y React.',
    image: '/blog-placeholder-1.jpg',
    tech: ['Astro', 'TypeScript', 'Tailwind CSS', 'React', 'MDX'],
    github: 'https://github.com',
    demo: 'https://example.com',
  },
  {
    slug: 'gpx-store',
    title: 'GPX-Store',
    description:
      'Solución de state management reactivo inspirada en Redux y Signals. Minimal, sin dependencias, 2KB gzipped.',
    image: '/blog-placeholder-2.jpg',
    tech: ['TypeScript', 'RxJS', 'Jest'],
    github: 'https://github.com',
    demo: 'https://example.com',
  },
  {
    slug: 'clean-arch-angular',
    title: 'Clean Architecture Angular',
    description:
      'Template de arquitectura limpia para Angular con separación de dominio, aplicación e infraestructura.',
    image: '/blog-placeholder-3.jpg',
    tech: ['Angular', 'TypeScript', 'Clean Architecture', 'NGRX'],
    github: 'https://github.com',
  },
  {
    slug: 'react-atomic-design',
    title: 'React Atomic Design System',
    description:
      'Design system completo con atomic design, Storybook integrado y pruebas de accesibilidad automatizadas.',
    image: '/blog-placeholder-4.jpg',
    tech: ['React', 'TypeScript', 'Storybook', 'Testing Library'],
    github: 'https://github.com',
    demo: 'https://example.com',
  },
];
