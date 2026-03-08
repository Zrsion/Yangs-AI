export type PortalNodeId =
  | "research"
  | "resources"
  | "community"
  | "team"
  | "founder";

export interface NodeLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface SubItemLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface PortalNode {
  id: PortalNodeId;
  label: string;
  shortDescription: string;
  detailDescription: string;
  positionDesktop: { x: number; y: number };
  positionMobile: { x: number; y: number };
  subItems: SubItemLink[];
  links: NodeLink[];
}

export const coreNode = {
  id: "core",
  label: "YangsAI",
  description:
    "A neural academic ecosystem for research, resources, scholarly initiatives, and people.",
  positionDesktop: { x: 50, y: 50 },
  positionMobile: { x: 50, y: 42 },
} as const;

export const portalNodes: PortalNode[] = [
  {
    id: "research",
    label: "Research",
    shortDescription: "Papers, projects, and evolving research directions.",
    detailDescription:
      "Explore current papers, active projects, long-horizon directions, and ongoing investigations across neural and AI research fronts.",
    positionDesktop: { x: 18, y: 21 },
    positionMobile: { x: 24, y: 16 },
    subItems: [
      { label: "Papers", href: "#research-papers" },
      { label: "Projects", href: "#research-projects" },
      { label: "Directions", href: "#research-directions" },
      { label: "Ongoing Work", href: "#research-ongoing" },
    ],
    links: [
      { label: "View Research Hub", href: "#research" },
      { label: "Latest Working Notes", href: "#working-notes" },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    shortDescription: "Datasets, benchmarks, tools, and curated collections.",
    detailDescription:
      "Access research-grade assets including datasets, benchmark tracks, tooling, and carefully curated collections for reproducible AI studies.",
    positionDesktop: { x: 82, y: 18 },
    positionMobile: { x: 78, y: 26 },
    subItems: [
      { label: "Datasets", href: "https://datasets.yangs.ai", external: true },
      { label: "Benchmarks", href: "https://benchmarks.yangs.ai", external: true },
      { label: "Tools", href: "#resources-tools" },
      { label: "Collections", href: "#resources-collections" },
    ],
    links: [
      {
        label: "datasets.yangs.ai",
        href: "https://datasets.yangs.ai",
        external: true,
      },
      {
        label: "benchmarks.yangs.ai",
        href: "https://benchmarks.yangs.ai",
        external: true,
      },
    ],
  },
  {
    id: "community",
    label: "Community",
    shortDescription:
      "Journals, initiatives, organizations, events, and collaborations.",
    detailDescription:
      "Connect with broader scholarly activity across journals, academic initiatives, organizations, conferences, and collaborative programs.",
    positionDesktop: { x: 33, y: 46 },
    positionMobile: { x: 21, y: 52 },
    subItems: [
      { label: "Journals", href: "#community-journals" },
      { label: "Initiatives", href: "#community-initiatives" },
      { label: "Organizations", href: "#community-organizations" },
      { label: "Events", href: "#community-events" },
      {
        label: "Communications of the BenchCouncil",
        href: "#community-benchcouncil-communications",
      },
    ],
    links: [
      { label: "Scholarly Initiatives", href: "#initiatives" },
      { label: "Community Calendar", href: "#events" },
    ],
  },
  {
    id: "team",
    label: "Team",
    shortDescription: "Members, collaborators, roles, and profiles.",
    detailDescription:
      "Meet researchers, engineers, and collaborators, understand role distribution, and navigate profile pages for expertise and contributions.",
    positionDesktop: { x: 86, y: 76 },
    positionMobile: { x: 82, y: 76 },
    subItems: [
      { label: "Members", href: "#team-members" },
      { label: "Collaborators", href: "#team-collaborators" },
      { label: "Roles", href: "#team-roles" },
      { label: "Profiles", href: "#team-profiles" },
    ],
    links: [
      { label: "Team Directory", href: "#team" },
      { label: "Collaboration Notes", href: "#collaboration" },
    ],
  },
  {
    id: "founder",
    label: "Founder",
    shortDescription: "Jason Young: vision, biography, and personal site.",
    detailDescription:
      "Read the founding vision, biography, and long-term perspective shaping this ecosystem and its research culture.",
    positionDesktop: { x: 14, y: 84 },
    positionMobile: { x: 26, y: 82 },
    subItems: [
      { label: "Jason Young", href: "#founder-jason-young" },
      { label: "Vision", href: "#founder-vision" },
      { label: "Biography", href: "#founder-biography" },
      { label: "Personal Site", href: "https://jason-young.me", external: true },
    ],
    links: [
      {
        label: "jason-young.me",
        href: "https://jason-young.me",
        external: true,
      },
    ],
  },
];
