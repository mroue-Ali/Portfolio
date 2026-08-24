/**
 * Every piece of copy on the site lives here.
 *
 * Components read from this module and never hardcode text, so the admin panel
 * can eventually swap this module for an API response of the same shape.
 */

export type NavItem = { id: string; label: string; href: string };

export type StackTile = {
  name: string;
  /** simple-icons slug; also the key into ICON_PATHS for the offline fallback. */
  icon: string;
  /** Brand colour revealed on hover. */
  color: string;
  /** Where it was used — shown in the tooltip. */
  where: string;
};

export type StackGroup = { name: string; tiles: StackTile[]; pills: string[] };

export type Project = {
  number: string;
  title: string;
  summary: string;
  points: string[];
  tags: string[];
};

export type Role = { period: string; title: string; body: string };

export type Stat = { value: number; suffix: string; label: string };

/** A canned answer for the ask bar, matched on keywords. */
export type Answer = {
  /** Lowercase substrings matched against the question. */
  keywords: string[];
  question: string;
  answer: string;
  /** Indices into SOURCE_NODES. */
  sources: number[];
};

/** Retrieval sources the hero canvas can light up and scroll to. */
export const SOURCE_NODES = [
  { tag: 'proj/kb-rag', target: 'projects' },
  { tag: 'exp/parcel-tracer', target: 'experience' },
  { tag: 'stack/backend', target: 'stack' },
  { tag: 'about/independent', target: 'about' },
] as const;

export const profile = {
  name: 'Ali Mroue',
  availability: 'Beirut, Lebanon — available for work',
  role: 'Full-Stack AI Engineer',
  /** Cycled by the rolling headline. */
  specialities: ['RAG Systems', 'Document Pipelines', 'React & React Native'],
  intro:
    'Three years shipping production systems. Now building retrieval pipelines, ingestion, and LLM integration — from the vector store to the UI.',
  email: 'alimroue2001@gmail.com',
  phone: '+961 81 651 281',
  phoneHref: 'tel:+96181651281',
  linkedin: 'https://www.linkedin.com/',
  github: 'https://github.com/',
};

export const nav: NavItem[] = [
  { id: 'about', label: 'About', href: '#about' },
  { id: 'stack', label: 'Stack', href: '#stack' },
  { id: 'projects', label: 'Work', href: '#projects' },
  { id: 'experience', label: 'Path', href: '#experience' },
  { id: 'contact', label: 'Contact', href: '#contact' },
];

export const ask = {
  placeholder: 'Ask me anything about my work',
  /** Questions offered as chips — indices into `answers`. */
  chipIndices: [0, 1, 3],
  /** Questions allowed per session before the bar locks. */
  limit: 10,
  fallback:
    "I haven't written an answer for that one. What I can tell you: I build retrieval systems end to end — ingestion, chunking, vector search, API, interface — and I've shipped four production stacks doing it. Ask me about the RAG pipeline, the routing problem, or whether I'm free.",
  fallbackSources: [0, 2],
};

export const answers: Answer[] = [
  {
    keywords: ['image', 'images', 'photo', 'visual', 'picture', 'caption', 'multimodal'],
    question: 'How does his RAG pipeline handle images?',
    answer:
      "Embedded images get captioned at ingestion, so a diagram or a scanned table becomes searchable text sitting next to the chunk it came from. The caption carries the parent document's metadata, which means retrieval can filter on it the same way it filters text. When an image chunk wins, the UI surfaces the source so you can see what it actually matched.",
    sources: [0, 1, 2],
  },
  {
    keywords: ['shipped', 'end to end', 'built', 'projects', 'work', 'portfolio'],
    question: 'What has he shipped end to end?',
    answer:
      'Four systems. A RAG platform over private document collections — ingestion through retrieval through UI. A clinical data capture platform with a CRF builder and full audit trails. A multi-tenant delivery operations platform with Shopify and WooCommerce webhooks processed exactly once. And a Quran app shipped to web, then to app stores off the same component architecture.',
    sources: [0, 3, 1],
  },
  {
    keywords: ['django', '.net', 'dotnet', 'net core', 'prefer', 'which', 'backend', 'compare'],
    question: 'Django or .NET?',
    answer:
      "Django when the job is speed and the data model is the product — the delivery platform went from nothing to multi-tenant with webhooks in weeks. .NET when the requirement is regulatory traceability and typed contracts, which is why the clinical EDC system was built on it. I've owned both in production, so the answer is whichever one the constraints pick.",
    sources: [1, 2, 3],
  },
  {
    keywords: ['available', 'hire', 'hiring', 'free', 'availability', 'open', 'remote', 'contract'],
    question: 'Is he available?',
    answer:
      'Yes — working independently out of Beirut and taking on new work now, remote or hybrid. Currently shipping client web apps and RAG systems end to end, and running the infrastructure they sit on. Email is the fastest way in.',
    sources: [3, 0],
  },
  {
    keywords: ['webhook', 'exactly-once', 'idempotent', 'shopify', 'woocommerce', 'reconcil'],
    question: 'How does he keep webhooks exactly-once?',
    answer:
      "Every inbound event is keyed and claimed through Redis before any work happens, so a duplicate delivery finds the lock already taken and exits. Celery does the processing off the request path. Then a scheduled reconciliation sweeps the provider's API for anything the webhook stream dropped entirely — because it always drops something.",
    sources: [1, 2],
  },
  {
    keywords: ['15000', '15,000', 'routes', 'routing', 'stores', 'driver', 'map'],
    question: 'What was the 15,000-store routing problem?',
    answer:
      "Fifteen thousand stores had to be split across six driver regions and covered every week, over an offline embedded map. I partitioned the set geographically, then generated weekly routes that guaranteed full coverage instead of just short trips. The hard part wasn't the algorithm, it was making it stable when the store list changed under it.",
    sources: [1, 3],
  },
];

export const about = {
  eyebrow: '01 / the person',
  heading: 'I build the whole line.',
  portraitPlaceholder: 'portrait / drop image here',
  paragraphs: [
    "Ingestion, chunking, vector search, API, and the interface people actually touch. Most of my work has been on systems where the hard part isn't the model, it's everything around it: parsing messy real-world documents, keeping webhooks exactly-once, making 15,000 stores fit into six drivers' weeks.",
    'Right now I work independently, running my own Linux VPS with Docker Compose and GitHub Actions, and shipping client web apps and RAG systems end to end.',
  ],
  stats: [
    { value: 3, suffix: '+', label: 'years shipping' },
    { value: 15000, suffix: '+', label: 'stores routed' },
    { value: 4, suffix: '', label: 'production stacks owned' },
  ] satisfies Stat[],
};

export const stack = {
  eyebrow: '02 / the toolkit',
  heading: 'Things I reach for.',
  groups: [
    {
      name: 'Languages',
      tiles: [
        { name: 'TypeScript', icon: 'typescript', color: '#3178C6', where: 'Every frontend, 2023 →' },
        { name: 'JavaScript', icon: 'javascript', color: '#F7DF1E', where: 'Node/Express at Weave Wider' },
        { name: 'Python', icon: 'python', color: '#3776AB', where: 'FastAPI + Django services' },
        { name: 'C#', icon: 'csharp', color: '#512BD4', where: 'EDC platform, Born Interactive' },
      ],
      pills: [],
    },
    {
      name: 'AI',
      tiles: [
        { name: 'LangChain', icon: 'langchain', color: '#1C3C3C', where: 'Knowledge Base RAG' },
        { name: 'Hugging Face', icon: 'huggingface', color: '#FFD21E', where: 'Embeddings + captioning' },
        { name: 'Milvus', icon: 'milvus', color: '#00A1EA', where: 'Knowledge Base RAG' },
        { name: 'LM Studio', icon: 'lmstudio', color: '#9AA2AD', where: 'Local GGUF inference' },
      ],
      pills: ['GGUF', 'Rerankers', 'MCP tool-calling', 'Embedding pipelines', 'Document parsing'],
    },
    {
      name: 'Frontend & Mobile',
      tiles: [
        { name: 'React', icon: 'react', color: '#61DAFB', where: 'Every client app' },
        { name: 'Angular', icon: 'angular', color: '#DD0031', where: 'EDC + component library' },
        { name: 'React Native', icon: 'reactnative', color: '#61DAFB', where: 'Quran Application' },
        { name: 'Expo', icon: 'expo', color: '#E9ECF0', where: 'Quran Application' },
      ],
      pills: [],
    },
    {
      name: 'Backend & Data',
      tiles: [
        { name: 'FastAPI', icon: 'fastapi', color: '#009688', where: 'Knowledge Base RAG' },
        { name: 'Django', icon: 'django', color: '#092E20', where: 'Delivery Operations' },
        { name: '.NET Core', icon: 'dotnet', color: '#512BD4', where: 'Electronic Data Capture' },
        { name: 'Express', icon: 'express', color: '#E9ECF0', where: 'Weave Wider SaaS' },
        { name: 'Celery', icon: 'celery', color: '#37814A', where: 'Webhook processing' },
        { name: 'Redis', icon: 'redis', color: '#FF4438', where: 'Queues + exactly-once locks' },
        { name: 'PostgreSQL', icon: 'postgresql', color: '#4169E1', where: 'Multi-tenant delivery data' },
        { name: 'Supabase', icon: 'supabase', color: '#3FCF8E', where: 'Client web apps' },
      ],
      pills: ['EF Core'],
    },
    {
      name: 'Infrastructure',
      tiles: [
        { name: 'Docker', icon: 'docker', color: '#2496ED', where: 'Self-hosted VPS stack' },
        { name: 'GitHub Actions', icon: 'githubactions', color: '#2088FF', where: 'CI/CD, all repos' },
        { name: 'Linux', icon: 'linux', color: '#FCC624', where: 'Self-managed VPS' },
        { name: 'Vercel', icon: 'vercel', color: '#E9ECF0', where: 'Frontend deploys' },
        { name: 'Azure', icon: 'microsoftazure', color: '#0078D4', where: 'Born Interactive' },
        { name: 'AWS S3', icon: 'amazons3', color: '#569A31', where: 'Document storage' },
        { name: 'Git', icon: 'git', color: '#F05032', where: 'Everywhere' },
      ],
      pills: [],
    },
  ] satisfies StackGroup[],
};

export const projects = {
  eyebrow: '03 / selected work',
  heading: 'Four things worth showing.',
  items: [
    {
      number: '01',
      title: 'Knowledge Base RAG System',
      summary: 'Question answering over private document collections.',
      points: [
        'Configurable ingestion with custom chunking and include/exclude filters.',
        'Embedded images are captioned automatically so non-text assets stay searchable.',
        'Rerankers and metadata-aware retrieval sharpen relevance; answers stay grounded, with source chunks surfaced in the UI.',
        'Validated against full directory trees of mixed real-world files. Local inference via LM Studio and GGUF.',
      ],
      tags: ['FastAPI', 'Milvus', 'LangChain', 'Hugging Face', 'React', 'Docker'],
    },
    {
      number: '02',
      title: 'Electronic Data Capture System',
      summary: 'Role-based clinical data platform for regulated studies.',
      points: [
        'CRF builder for study teams to compose case report forms without engineering.',
        'Full audit trails for regulatory traceability, plus secure exports.',
        'Query management across study, site, and subject modules.',
        'Versioned API contracts so clients never break mid-study.',
      ],
      tags: ['.NET Core', 'Angular', 'SurveyJS'],
    },
    {
      number: '03',
      title: 'Delivery Operations Platform',
      summary: 'Multi-tenant delivery operations, from order to cash.',
      points: [
        'Orders, waybills, returns, COD, and driver workflows as separate modules.',
        'Shopify and WooCommerce integrated over webhooks with exactly-once processing.',
        'Scheduled reconciliation catches anything the webhook stream drops.',
        'RBAC, audit logging, API versioning.',
      ],
      tags: ['Django', 'React', 'Celery', 'Redis', 'PostgreSQL'],
    },
    {
      number: '04',
      title: 'Quran Application',
      summary: 'One codebase, shipped to the web and to app stores.',
      points: [
        'Built and deployed as a web app first.',
        'Then shipped as a cross-platform mobile build reusing the same component architecture and state logic.',
      ],
      tags: ['Django', 'React', 'React Native', 'Expo'],
    },
  ] satisfies Project[],
};

export const experience = {
  eyebrow: '04 / the path',
  heading: "Where I've built.",
  roles: [
    {
      period: 'Jan 2026 – Present',
      title: 'Full-Stack AI Engineer · Independent',
      body: 'Ships client web apps and RAG systems end to end: ingestion, vector search, backend APIs, React/TypeScript frontends, deployment. Runs his own infrastructure — self-managed Linux VPS, Docker Compose, GitHub Actions, Vercel.',
    },
    {
      period: 'Jul 2025 – Dec 2025',
      title: 'Full-Stack Developer · Parcel Tracer · Remote',
      body: 'Multi-tenant delivery modules in Django and React. Shopify and WooCommerce webhooks with Celery/Redis, exactly-once processing, scheduled reconciliation. RBAC, audit logging, API versioning, Dockerized CI/CD.',
    },
    {
      period: 'May 2024 – May 2025',
      title: 'Full-Stack Developer · Weave Wider · Hybrid',
      body: 'Partitioned 15,000+ stores across 6 driver regions and generated weekly full-coverage routes over an offline embedded map. Built the Node/Express/Sequelize SaaS backend and a custom Angular component library used across product teams. Led releases and standardized API contracts across teams.',
    },
    {
      period: 'May 2023 – May 2024',
      title: 'Full-Stack Developer · Born Interactive · Beirut',
      body: '.NET and Angular features for CMS and insurance products. ASP.NET MVC, REST APIs, Azure App Service.',
    },
  ] satisfies Role[],
  footnotes: [
    'License in Computer Science · Al Maaref University · 2019–2023',
    'Arabic (native) · English (professional) · French (basic)',
  ],
};

export const contact = {
  eyebrow: '05 / next',
  heading: 'Send me a hard problem.',
  cta: 'Start a conversation',
  colophon: 'Built with React, GSAP, and too much coffee.',
  place: 'Beirut, 2026.',
};
