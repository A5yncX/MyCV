import basicsPool from "../../data/basics.json";
import educationPool from "../../data/education.json";
import internshipsPool from "../../data/internships.json";
import researchPool from "../../data/research.json";
import projectsPool from "../../data/projects.json";
import skillsPool from "../../data/skills.json";
import languagesPool from "../../data/languages.json";
import sectionRegistry from "../../data/sections.json";
import themePool from "../../data/theme.json";
import dataAnalystProfile from "../../data/profiles/data-analyst.json";
import softwareDevProfile from "../../data/profiles/software-dev.json";

const POOLS = {
  "basics.json": basicsPool,
  "education.json": educationPool,
  "internships.json": internshipsPool,
  "research.json": researchPool,
  "projects.json": projectsPool,
  "skills.json": skillsPool,
  "languages.json": languagesPool,
};

const PROFILES = {
  [dataAnalystProfile.slug]: dataAnalystProfile,
  [softwareDevProfile.slug]: softwareDevProfile,
};

function normalizeHighlights(highlights, pickIds) {
  if (!highlights?.length) {
    return [];
  }

  const isObjectFormat = typeof highlights[0] === "object";

  if (!isObjectFormat) {
    return pickIds ? highlights.filter((_, index) => pickIds.includes(String(index))) : highlights;
  }

  if (!pickIds) {
    return highlights.map((item) => item.text);
  }

  return highlights
    .filter((item) => pickIds.includes(item.id))
    .map((item) => item.text);
}

function applyPick(entry, pick) {
  if (!pick?.highlights) {
    return entry;
  }

  return {
    ...entry,
    highlights: normalizeHighlights(entry.highlights, pick.highlights),
  };
}

function selectItems(pool, itemIds) {
  const list = Array.isArray(pool) ? pool : [pool];

  if (!itemIds || itemIds === "all") {
    return list;
  }

  const map = new Map(list.map((item) => [item.id, item]));
  return itemIds.map((id) => map.get(id)).filter(Boolean);
}

const SKILL_LEVEL_RANK = {
  熟练: 4,
  熟悉: 3,
  了解: 2,
};

function getSkillRank(item) {
  if (item.rating != null) {
    return item.rating;
  }
  return SKILL_LEVEL_RANK[item.level] ?? 0;
}

function sortSkillsByProficiency(items) {
  return [...items].sort((a, b) => getSkillRank(b) - getSkillRank(a));
}

function resolveSection(sectionConfig) {
  const registry = sectionRegistry[sectionConfig.type];
  if (!registry) {
    throw new Error(`Unknown section type: ${sectionConfig.type}`);
  }

  const pool = POOLS[registry.source];
  if (!pool) {
    throw new Error(`Missing data pool: ${registry.source}`);
  }

  const selected = selectItems(pool, sectionConfig.items);
  const picked = selected.map((entry) =>
    applyPick(entry, sectionConfig.pick?.[entry.id])
  );
  const items =
    registry.kind === "skills" ? sortSkillsByProficiency(picked) : picked;

  return {
    type: sectionConfig.type,
    kind: registry.kind,
    title: sectionConfig.title ?? registry.defaultTitle,
    columns: sectionConfig.columns ?? registry.defaultColumns,
    items,
  };
}

function resolveBasics(basicsConfig) {
  const base = basicsPool[basicsConfig.ref];
  if (!base) {
    throw new Error(`Unknown basics ref: ${basicsConfig.ref}`);
  }

  return {
    ...base,
    ...basicsConfig.overrides,
  };
}

function resolveTheme(themeRef) {
  const theme = themePool[themeRef ?? "default"];
  if (!theme) {
    throw new Error(`Unknown theme ref: ${themeRef}`);
  }
  return theme;
}

export function getProfileSlugs() {
  return Object.keys(PROFILES);
}

export function getProfileList() {
  return Object.values(PROFILES).map((profile) => ({
    slug: profile.slug,
    label: profile.label,
    pageTitle: profile.pageTitle,
  }));
}

export function buildResume(slug) {
  const profile = PROFILES[slug];
  if (!profile) {
    throw new Error(`Unknown profile: ${slug}`);
  }

  return {
    slug: profile.slug,
    label: profile.label,
    pageTitle: profile.pageTitle,
    pageDescription: profile.pageDescription,
    basics: resolveBasics(profile.basics),
    theme: resolveTheme(profile.theme),
    sections: profile.sections.map(resolveSection),
  };
}

export function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return "";
  }
  if (!endDate) {
    return startDate;
  }
  return `${startDate} - ${endDate}`;
}
