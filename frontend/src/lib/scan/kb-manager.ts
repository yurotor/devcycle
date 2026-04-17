// KnowledgeBaseManager — compiles raw scan output + system synthesis into
// topic-organized wiki with bidirectional links.
//
// Wiki structure:
//   wiki/architecture/   — system-level architecture docs
//   wiki/features/       — one page per business feature
//   wiki/integrations/   — external system integrations
//   wiki/data-model/     — consolidated entity docs
//   wiki/repos/          — deep per-repo reference pages
//   wiki/INDEX.md        — master index
//   wiki/manifest.json   — page title → path mapping for link resolution

import fs from "fs";
import path from "path";
import { complete, isAIAvailable } from "@/lib/anthropic";
import { getKbRoot } from "@/lib/kb-path";
import { normalizeAnalysis } from "@/lib/scan/engine";
import type { DeepRepoAnalysis, SystemSynthesis, ClusterAnalysis, BusinessFlowAnalysis } from "@/lib/scan/engine";

// ─── Types ────────────────────────────────────────────────────────

interface WikiPage {
  title: string;
  path: string; // relative to wiki/, e.g. "architecture/system-overview.md"
  content: string;
}

/** Maps page titles to their wiki-relative paths. */
type WikiManifest = Record<string, string>;

// ─── Public API ───────────────────────────────────────────────────

export async function compileKnowledgeBase(kbRoot?: string): Promise<{ repos: number; wikiFiles: number; schemaFiles: number }> {
  const KB_ROOT = kbRoot ?? getKbRoot(1);
  const RAW_DIR = path.join(KB_ROOT, "raw");
  const WIKI_DIR = path.join(KB_ROOT, "wiki");

  // Clean and recreate wiki dir
  fs.rmSync(WIKI_DIR, { recursive: true, force: true });
  fs.mkdirSync(WIKI_DIR, { recursive: true });

  // Load inputs
  const synthesis = loadSynthesis(RAW_DIR);
  const repoAnalyses = loadRepoAnalyses(RAW_DIR);
  const repoNames = Array.from(repoAnalyses.keys());
  const clusterAnalyses = loadClusterAnalyses(RAW_DIR);
  const flowAnalyses = loadFlowAnalyses(RAW_DIR);

  // Build all pages
  const pages: WikiPage[] = [];
  const manifest: WikiManifest = {};

  // 1. Architecture pages
  pages.push(...generateArchitecturePages(synthesis, repoNames));

  // 2. Business flow pages (primary navigation)
  pages.push(...generateFlowPages(flowAnalyses, synthesis));

  // 3. Cluster pages
  pages.push(...generateClusterPages(clusterAnalyses));

  // 4. Feature pages (derived from flows if available, otherwise from synthesis)
  const featurePages = await generateFeaturePages(synthesis, repoAnalyses, flowAnalyses);
  pages.push(...featurePages);

  // 5. Integration pages
  pages.push(...generateIntegrationPages(synthesis, repoAnalyses));

  // 6. Data model pages (enriched from clusters)
  pages.push(...generateDataModelPages(synthesis, repoAnalyses, clusterAnalyses));

  // 7. Per-repo reference pages
  pages.push(...generateRepoPages(repoAnalyses, synthesis));

  // Build manifest
  for (const page of pages) {
    manifest[page.title] = page.path;
  }

  // Inject bidirectional links and write files
  for (const page of pages) {
    const dir = path.join(WIKI_DIR, path.dirname(page.path));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(WIKI_DIR, page.path), page.content, "utf8");
  }

  // Write manifest
  fs.writeFileSync(
    path.join(WIKI_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  // Write INDEX.md
  writeIndex(pages, WIKI_DIR);

  // Write root CLAUDE.md
  writeClaudeMd(synthesis, repoNames, pages, KB_ROOT);

  return { repos: repoNames.length, wikiFiles: pages.length, schemaFiles: 0 };
}

// ─── Load inputs ─────────────────────────────────────────────────

function loadSynthesis(rawDir: string): SystemSynthesis | null {
  const synthPath = path.join(rawDir, "system-synthesis.json");
  if (!fs.existsSync(synthPath)) return null;
  return JSON.parse(fs.readFileSync(synthPath, "utf8")) as SystemSynthesis;
}

function loadRepoAnalyses(rawDir: string): Map<string, DeepRepoAnalysis> {
  const map = new Map<string, DeepRepoAnalysis>();
  if (!fs.existsSync(rawDir)) return map;

  for (const entry of fs.readdirSync(rawDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const analysisPath = path.join(rawDir, entry.name, "analysis.json");
    if (fs.existsSync(analysisPath)) {
      const raw = JSON.parse(fs.readFileSync(analysisPath, "utf8"));
      const { _headHash, ...rest } = raw;
      map.set(entry.name, normalizeAnalysis(rest));
    }
  }
  return map;
}

function loadClusterAnalyses(rawDir: string): ClusterAnalysis[] {
  const dir = path.join(rawDir, "clusters");
  if (!fs.existsSync(dir)) return [];
  const results: ClusterAnalysis[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      results.push(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as ClusterAnalysis);
    } catch { /* skip corrupt files */ }
  }
  return results;
}

function loadFlowAnalyses(rawDir: string): BusinessFlowAnalysis[] {
  const dir = path.join(rawDir, "flows");
  if (!fs.existsSync(dir)) return [];
  const results: BusinessFlowAnalysis[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      results.push(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as BusinessFlowAnalysis);
    } catch { /* skip corrupt files */ }
  }
  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Create a relative link from one wiki page to another. */
function wikiLink(label: string, targetPath: string, fromPath: string): string {
  const fromDir = path.dirname(fromPath);
  const rel = path.relative(fromDir, targetPath);
  return `[${label}](${rel})`;
}

// ─── Architecture pages ──────────────────────────────────────────

function generateArchitecturePages(synthesis: SystemSynthesis | null, repoNames: string[]): WikiPage[] {
  const pages: WikiPage[] = [];
  const dir = "architecture";

  // System overview
  const overviewContent = [
    `# System Overview`,
    "",
    synthesis?.systemOverview || `This system comprises ${repoNames.length} repositories.`,
    "",
    "## Repositories",
    "",
    ...repoNames.map((r) => `- [${r}](../repos/${slug(r)}.md)`),
    "",
    "---",
    "",
    `> See also: [Service Map](./service-map.md) | [Data Flows](./data-flows.md) | [Architecture Patterns](./patterns.md)`,
    "",
    `*Generated: ${new Date().toISOString()}*`,
  ].join("\n");

  pages.push({ title: "System Overview", path: `${dir}/system-overview.md`, content: overviewContent });

  // Service map
  const serviceMapRows = (synthesis?.serviceMap ?? []).map((s) => {
    const comms = s.communicatesWith.map((c) => `[${c}](../repos/${slug(c)}.md)`).join(", ");
    return `- **[${s.repo}](../repos/${slug(s.repo)}.md)** — ${s.role}${comms ? `\n  - Communicates with: ${comms}` : ""}`;
  });

  const serviceMapContent = [
    `# Service Map`,
    "",
    "How the repositories in this system relate to each other.",
    "",
    ...(serviceMapRows.length > 0 ? serviceMapRows : [`*${repoNames.length} repos — run a scan with Claude API connected for detailed service map.*`]),
    "",
    "---",
    "",
    `> See also: [System Overview](./system-overview.md) | [Data Flows](./data-flows.md)`,
    "",
    `*Generated: ${new Date().toISOString()}*`,
  ].join("\n");

  pages.push({ title: "Service Map", path: `${dir}/service-map.md`, content: serviceMapContent });

  // Data flows
  const dataFlowSections = (synthesis?.dataFlows ?? []).map((df) => {
    const steps = df.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    return `## ${df.name}\n\n${df.description}\n\n${steps}`;
  });

  const dataFlowContent = [
    `# Data Flows`,
    "",
    "Major end-to-end data flows through the system.",
    "",
    ...(dataFlowSections.length > 0 ? dataFlowSections : ["*No data flows identified yet. Re-scan with Claude API for detailed analysis.*"]),
    "",
    "---",
    "",
    `> See also: [System Overview](./system-overview.md) | [Service Map](./service-map.md)`,
    "",
    `*Generated: ${new Date().toISOString()}*`,
  ].join("\n");

  pages.push({ title: "Data Flows", path: `${dir}/data-flows.md`, content: dataFlowContent });

  // Architecture patterns
  const patternSections = (synthesis?.architecturePatterns ?? []).map((p) => {
    const repos = p.repos.map((r) => `[${r}](../repos/${slug(r)}.md)`).join(", ");
    return `## ${p.pattern}\n\n${p.description}\n\n**Used in:** ${repos}`;
  });

  const patternsContent = [
    `# Architecture Patterns`,
    "",
    "Shared architectural patterns across the system.",
    "",
    ...(patternSections.length > 0 ? patternSections : ["*No patterns identified yet.*"]),
    "",
    "---",
    "",
    `> See also: [System Overview](./system-overview.md)`,
    "",
    `*Generated: ${new Date().toISOString()}*`,
  ].join("\n");

  pages.push({ title: "Architecture Patterns", path: `${dir}/patterns.md`, content: patternsContent });

  return pages;
}

// ─── Flow pages (primary navigation) ────────────────────────────

function generateFlowPages(flows: BusinessFlowAnalysis[], synthesis: SystemSynthesis | null): WikiPage[] {
  const pages: WikiPage[] = [];

  if (flows.length === 0) {
    // Fallback: generate from synthesis features if no flow analyses exist
    return pages;
  }

  for (const flow of flows) {
    const flowSlug = slug(flow.flowName);
    const repoLinks = flow.repos.map((r) => `[${r}](../repos/${slug(r)}.md)`).join(", ");
    const entityLinks = flow.entities.map((e) => `[${e}](../data-model/entities.md)`).join(", ");

    const steps = flow.steps.length > 0
      ? flow.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
      : "*No steps documented.*";

    const content = [
      `# ${flow.flowName}`,
      "",
      flow.description || "*No description available.*",
      "",
      "## Steps",
      "",
      steps,
      "",
      "## Repos Involved",
      "",
      repoLinks,
      "",
      ...(flow.entities.length > 0 ? ["## Data Entities", "", entityLinks, ""] : []),
      ...(flow.externalSystems.length > 0 ? ["## External Systems", "", ...flow.externalSystems.map((s) => `- ${s}`), ""] : []),
      ...(flow.ambiguities.length > 0 ? ["## Open Questions", "", ...flow.ambiguities.map((a) => `- ${a}`), ""] : []),
      "---",
      "",
      `> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)`,
      "",
      `*Generated: ${new Date().toISOString()}*`,
    ].join("\n");

    pages.push({ title: flow.flowName, path: `flows/${flowSlug}.md`, content });
  }

  return pages;
}

// ─── Cluster pages ──────────────────────────────────────────────

function generateClusterPages(clusters: ClusterAnalysis[]): WikiPage[] {
  const pages: WikiPage[] = [];

  for (const cluster of clusters) {
    const clusterSlug = slug(cluster.clusterName);

    const entitySections = cluster.sharedEntities.map((e) => {
      const repos = e.repos.map((r) => `[${r}](../repos/${slug(r)}.md)`).join(", ");
      return `- **${e.entity}** — ${e.description} (${repos})`;
    });

    const flowSections = cluster.dataFlows.map((f) => {
      const steps = f.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n");
      return `### ${f.name}\n\n${f.description}\n\n${steps}`;
    });

    const integrationSections = cluster.integrationPoints.map((ip) =>
      `- **[${ip.from}](../repos/${slug(ip.from)}.md)** → **[${ip.to}](../repos/${slug(ip.to)}.md)** via ${ip.mechanism}: ${ip.description}`
    );

    const content = [
      `# ${cluster.clusterName}`,
      "",
      ...(entitySections.length > 0 ? ["## Shared Entities", "", ...entitySections, ""] : []),
      ...(flowSections.length > 0 ? ["## Data Flows", "", ...flowSections, ""] : []),
      ...(integrationSections.length > 0 ? ["## Integration Points", "", ...integrationSections, ""] : []),
      ...(cluster.patterns.length > 0 ? [
        "## Patterns",
        "",
        ...cluster.patterns.map((p) => {
          const repos = p.repos.map((r) => `[${r}](../repos/${slug(r)}.md)`).join(", ");
          return `- **${p.pattern}** — ${p.description} (${repos})`;
        }),
        "",
      ] : []),
      ...(cluster.ambiguities.length > 0 ? ["## Open Questions", "", ...cluster.ambiguities.map((a) => `- ${a}`), ""] : []),
      "---",
      "",
      `> See also: [System Overview](../architecture/system-overview.md)`,
      "",
      `*Generated: ${new Date().toISOString()}*`,
    ].join("\n");

    pages.push({ title: cluster.clusterName, path: `clusters/${clusterSlug}.md`, content });
  }

  return pages;
}

// ─── Feature pages ───────────────────────────────────────────────

async function generateFeaturePages(
  synthesis: SystemSynthesis | null,
  repoAnalyses: Map<string, DeepRepoAnalysis>,
  flowAnalyses?: BusinessFlowAnalysis[],
): Promise<WikiPage[]> {
  const features = synthesis?.features ?? [];
  if (features.length === 0) {
    // Fallback: collect features from individual repo analyses
    const seen = new Set<string>();
    for (const [repoName, analysis] of repoAnalyses) {
      for (const feat of analysis.businessFeatures) {
        if (!seen.has(feat.toLowerCase())) {
          seen.add(feat.toLowerCase());
          features.push({ name: feat, description: "", repos: [repoName], dataFlow: "" });
        }
      }
    }
  }

  const pages: WikiPage[] = [];

  let featureIndex = 0;
  for (const feature of features) {
    const featureSlug = slug(feature.name);
    const pagePath = `features/${featureSlug}.md`;

    let content: string;

    // Delay between Claude calls to avoid rate limits
    if (featureIndex > 0 && isAIAvailable()) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    featureIndex++;

    // Try Claude-generated feature doc
    if (isAIAvailable() && feature.repos.length > 0) {
      try {
        const repoContexts = feature.repos
          .filter((r) => repoAnalyses.has(r))
          .map((r) => {
            const a = repoAnalyses.get(r)!;
            return `**${r}**: ${a.purpose}\nAPIs: ${a.apis.map((api) => `${api.method} ${api.endpoint}`).join(", ") || "none"}\nEntities: ${a.dataEntities.map((e) => e.name).join(", ") || "none"}`;
          })
          .join("\n\n");

        const raw = await complete(
          [
            {
              role: "user",
              content: `Write a comprehensive wiki page for the "${feature.name}" feature of this system.

Feature description: ${feature.description || "See repo context below."}
Data flow: ${feature.dataFlow || "Not yet documented."}

Repos involved:
${repoContexts}

System overview: ${synthesis?.systemOverview?.slice(0, 500) || "N/A"}

Write in markdown with these sections:
1. Overview — what the feature does and why it exists
2. How It Works — technical description of the data flow and logic
3. Repos Involved — which repos implement what part (use links like [RepoName](../repos/repo-slug.md))
4. Key APIs — endpoints involved
5. Data Entities — entities involved (use links like [EntityName](../data-model/entities.md))

Keep it concise but thorough. Write for an engineer joining the team.`,
            },
          ],
          {
            system: "You are documenting a software system's features. Write clear, technical wiki pages in markdown. Use the relative link format provided for cross-references.",
            maxTokens: 2048,
            stubResponse: `# ${feature.name}\n\n## Overview\n${feature.description || "Feature documentation pending."}\n\n## Repos Involved\n${feature.repos.map((r) => `- [${r}](../repos/${r.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md)`).join("\n")}\n\n*Auto-generated stub — re-run scan with AI available for full documentation.*`,
          }
        );
        content = raw;
      } catch {
        content = generateFeaturePageStub(feature);
      }
    } else {
      content = generateFeaturePageStub(feature);
    }

    // Append cross-references footer
    const repoLinks = feature.repos.map((r) => `[${r}](../repos/${slug(r)}.md)`).join(" | ");
    content += `\n\n---\n\n> **Repos:** ${repoLinks}\n> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)\n\n*Generated: ${new Date().toISOString()}*`;

    pages.push({ title: feature.name, path: pagePath, content });
  }

  return pages;
}

function generateFeaturePageStub(feature: { name: string; description: string; repos: string[]; dataFlow: string }): string {
  return [
    `# ${feature.name}`,
    "",
    feature.description || "*No description available yet.*",
    "",
    "## Data Flow",
    "",
    feature.dataFlow || "*Not yet documented.*",
    "",
    "## Repos Involved",
    "",
    ...feature.repos.map((r) => `- [${r}](../repos/${slug(r)}.md)`),
  ].join("\n");
}

// ─── Integration pages ───────────────────────────────────────────

function generateIntegrationPages(
  synthesis: SystemSynthesis | null,
  repoAnalyses: Map<string, DeepRepoAnalysis>
): WikiPage[] {
  const integrations = synthesis?.integrations ?? [];

  // Fallback: collect from repos
  if (integrations.length === 0) {
    for (const [repoName, analysis] of repoAnalyses) {
      for (const integ of analysis.integrations) {
        integrations.push({ ...integ, repos: [repoName] });
      }
    }
  }

  const rows = integrations.map((i) => {
    const repos = i.repos.map((r) => `[${r}](../repos/${slug(r)}.md)`).join(", ");
    return `| **${i.system}** | ${i.direction} | ${i.protocol} | ${repos} |`;
  });

  const content = [
    `# External Integrations`,
    "",
    "All external systems that this system communicates with.",
    "",
    "| System | Direction | Protocol | Repos |",
    "|--------|-----------|----------|-------|",
    ...(rows.length > 0 ? rows : ["| *None identified* | — | — | — |"]),
    "",
    "---",
    "",
    `> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)`,
    "",
    `*Generated: ${new Date().toISOString()}*`,
  ].join("\n");

  return [{ title: "External Integrations", path: "integrations/overview.md", content }];
}

// ─── Data model pages ────────────────────────────────────────────

function generateDataModelPages(
  synthesis: SystemSynthesis | null,
  repoAnalyses: Map<string, DeepRepoAnalysis>,
  clusterAnalyses?: ClusterAnalysis[],
): WikiPage[] {
  const entities = synthesis?.dataModel ?? [];

  // Enrich from cluster shared entities
  if (clusterAnalyses && clusterAnalyses.length > 0) {
    const seen = new Set(entities.map((e) => e.entity.toLowerCase()));
    for (const cluster of clusterAnalyses) {
      for (const e of cluster.sharedEntities) {
        if (!seen.has(e.entity.toLowerCase())) {
          seen.add(e.entity.toLowerCase());
          entities.push({ entity: e.entity, description: e.description, repos: e.repos });
        }
      }
    }
  }

  // Fallback: collect from repos
  if (entities.length === 0) {
    for (const [repoName, analysis] of repoAnalyses) {
      for (const entity of analysis.dataEntities) {
        entities.push({ entity: entity.name, description: entity.description, repos: [repoName] });
      }
    }
  }

  const entitySections = entities.map((e) => {
    const repos = e.repos.map((r) => `[${r}](../repos/${slug(r)}.md)`).join(", ");
    return `### ${e.entity}\n\n${e.description}\n\n**Defined in:** ${repos}`;
  });

  const content = [
    `# Data Model`,
    "",
    "Consolidated data entities across the system.",
    "",
    ...(entitySections.length > 0 ? entitySections : ["*No entities identified yet. Re-scan with Claude API for detailed analysis.*"]),
    "",
    "---",
    "",
    `> See also: [System Overview](../architecture/system-overview.md)`,
    "",
    `*Generated: ${new Date().toISOString()}*`,
  ].join("\n");

  return [{ title: "Data Model", path: "data-model/entities.md", content }];
}

// ─── Per-repo reference pages ────────────────────────────────────

function generateRepoPages(
  repoAnalyses: Map<string, DeepRepoAnalysis>,
  synthesis: SystemSynthesis | null
): WikiPage[] {
  const pages: WikiPage[] = [];

  for (const [repoName, analysis] of repoAnalyses) {
    const repoSlug = slug(repoName);

    // Find which features this repo implements
    const repoFeatures = (synthesis?.features ?? [])
      .filter((f) => f.repos.includes(repoName))
      .map((f) => `[${f.name}](../features/${slug(f.name)}.md)`);

    // Find service map entry
    const serviceEntry = (synthesis?.serviceMap ?? []).find((s) => s.repo === repoName);

    const sections: string[] = [
      `# ${repoName}`,
      "",
      `## Purpose`,
      "",
      analysis.purpose,
      "",
    ];

    if (serviceEntry) {
      const comms = serviceEntry.communicatesWith.map((c) => `[${c}](../repos/${slug(c)}.md)`).join(", ");
      if (comms) {
        sections.push(`## Communicates With`, "", comms, "");
      }
    }

    if (repoFeatures.length > 0) {
      sections.push(`## Features Implemented`, "", ...repoFeatures.map((f) => `- ${f}`), "");
    }

    if (analysis.businessFeatures.length > 0) {
      sections.push(`## Business Features`, "", ...analysis.businessFeatures.map((f) => `- ${f}`), "");
    }

    if (analysis.apis.length > 0) {
      sections.push(
        `## APIs`,
        "",
        "| Method | Endpoint | Purpose |",
        "|--------|----------|---------|",
        ...analysis.apis.map((a) => `| ${a.method} | \`${a.endpoint}\` | ${a.purpose} |`),
        ""
      );
    }

    if (analysis.dependencies.length > 0) {
      sections.push(
        `## Dependencies`,
        "",
        ...analysis.dependencies.map((d) => {
          const targetLink = repoAnalyses.has(d.target)
            ? `[${d.target}](../repos/${slug(d.target)}.md)`
            : `**${d.target}**`;
          return `- ${targetLink} (${d.type})`;
        }),
        ""
      );
    }

    if (analysis.dataEntities.length > 0) {
      sections.push(
        `## Data Entities`,
        "",
        ...analysis.dataEntities.map((e) => `- **${e.name}** — ${e.description}`),
        "",
        `> See also: [Data Model](../data-model/entities.md)`,
        ""
      );
    }

    if (analysis.messagingPatterns.length > 0) {
      sections.push(
        `## Messaging Patterns`,
        "",
        ...analysis.messagingPatterns.map((m) => `- **${m.name}** (${m.type}) — ${m.description}`),
        ""
      );
    }

    if (analysis.integrations.length > 0) {
      sections.push(
        `## External Integrations`,
        "",
        ...analysis.integrations.map((i) => `- **${i.system}** — ${i.direction} via ${i.protocol}`),
        "",
        `> See also: [Integrations Overview](../integrations/overview.md)`,
        ""
      );
    }

    if (analysis.architecturePatterns.length > 0) {
      sections.push(`## Architecture Patterns`, "", ...analysis.architecturePatterns.map((p) => `- ${p}`), "");
    }

    sections.push(`## Tech Stack`, "", ...analysis.techStack.map((t) => `- ${t}`), "");

    const validFindings = analysis.findings.filter((f: { severity?: string; category?: string; title?: string }) => f.severity && f.category && f.title);
    if (validFindings.length > 0) {
      sections.push(
        `## Findings`,
        "",
        ...validFindings.map(
          (f: { severity: string; category: string; title: string; description: string; files?: string[] }) => `### [${f.severity.toUpperCase()}] ${f.title}\n\n**Category:** ${f.category}  \n**Files:** ${f.files?.join(", ") || "N/A"}\n\n${f.description}`
        ),
        ""
      );
    }

    sections.push(
      "---",
      "",
      `> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)`,
      "",
      `*Generated: ${new Date().toISOString()}*`
    );

    pages.push({
      title: repoName,
      path: `repos/${repoSlug}.md`,
      content: sections.join("\n"),
    });
  }

  return pages;
}

// ─── Index & CLAUDE.md ───────────────────────────────────────────

function writeIndex(pages: WikiPage[], WIKI_DIR: string): void {
  const bySection: Record<string, WikiPage[]> = {};
  for (const page of pages) {
    const section = page.path.split("/")[0];
    if (!bySection[section]) bySection[section] = [];
    bySection[section].push(page);
  }

  const sectionLabels: Record<string, string> = {
    architecture: "Architecture",
    flows: "Business Flows",
    clusters: "Functional Clusters",
    features: "Features",
    integrations: "Integrations",
    "data-model": "Data Model",
    repos: "Repositories",
  };

  const lines = [
    "# Knowledge Base — Index",
    "",
    `${pages.length} pages across ${Object.keys(bySection).length} sections.`,
    "",
  ];

  for (const [section, label] of Object.entries(sectionLabels)) {
    const sectionPages = bySection[section] ?? [];
    if (sectionPages.length === 0) continue;
    lines.push(`## ${label}`, "");
    for (const page of sectionPages) {
      lines.push(`- [${page.title}](${page.path})`);
    }
    lines.push("");
  }

  lines.push(`*Generated: ${new Date().toISOString()}*`);
  fs.writeFileSync(path.join(WIKI_DIR, "INDEX.md"), lines.join("\n"), "utf8");
}

function writeClaudeMd(
  synthesis: SystemSynthesis | null,
  repoNames: string[],
  pages: WikiPage[],
  KB_ROOT: string,
): void {
  const lines = [
    "# DevCycle Knowledge Base",
    "",
    synthesis?.systemOverview || `System with ${repoNames.length} repositories.`,
    "",
    "## Wiki Sections",
    "",
    "- [Architecture](wiki/architecture/system-overview.md) — system overview, service map, data flows, patterns",
    "- [Business Flows](wiki/flows/) — end-to-end business flow documentation",
    "- [Functional Clusters](wiki/clusters/) — cross-repo cluster analysis",
    "- [Features](wiki/features/) — business feature documentation",
    "- [Integrations](wiki/integrations/overview.md) — external system integrations",
    "- [Data Model](wiki/data-model/entities.md) — consolidated entity documentation",
    "- [Repositories](wiki/repos/) — deep per-repo reference pages",
    "",
    `## Repositories (${repoNames.length})`,
    "",
    ...repoNames.map((r) => `- [${r}](wiki/repos/${slug(r)}.md)`),
    "",
    `Total wiki pages: ${pages.length}`,
    "",
    `*Generated: ${new Date().toISOString()}*`,
  ];

  fs.writeFileSync(path.join(KB_ROOT, "CLAUDE.md"), lines.join("\n"), "utf8");
}
