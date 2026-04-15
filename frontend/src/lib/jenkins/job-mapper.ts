// Jenkins Job Mapper
//
// Parses DSL groovy files from the jenkins-pipelines repo and pipeline.yaml
// from each application repo to build a mapping from DevCycle repo → Jenkins job.
//
// Job discovery strategy:
// 1. Parse DSL files for: relativeJobName, git remote URL, folder path, trigger token
// 2. Parse pipeline.yaml for: buildTrigger IDs, environments, AWS accounts
// 3. Determine Jenkins host by probing API (cached in DB)
//
// The jenkins-pipelines repo must be cloned locally.

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { db } from "../db";
import { jenkinsJobMappings, repos } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { JenkinsClient, getJenkinsHosts, createJenkinsClient } from "./client";

// ─── Types ───────────────────────────────────────────────────────

export interface DslJobInfo {
  /** Directory name under dsl_jobs/jobs/ */
  dslFolder: string;
  /** e.g. "COS.Lending.Selling__COS.Lending.Selling.WebApi__pullRequest" */
  relativeJobName: string;
  /** "pullRequest" | "autoDeploy" */
  pipelineType: string;
  /** ADO git URL, e.g. "git@ssh.dev.azure.com:v3/crossriverbank/COS.Lending.Selling/COS.Lending.Selling.WebApi" */
  gitUrl: string;
  /** Extracted repo name from git URL, e.g. "COS.Lending.Selling.WebApi" */
  repoName: string;
  /** GenericTrigger token, e.g. "COS.Lending.Selling-2181-TOKEN" */
  triggerToken: string | null;
  /** Jenkins folder path, e.g. "cos-lending-selling" */
  jenkinsFolder: string;
  /** Full Jenkins job path, e.g. "job/cos-lending-selling/job/COS.Lending.Selling__COS.Lending.Selling.WebApi__pullRequest" */
  jenkinsJobPath: string;
}

export interface PipelineYamlInfo {
  repoName: string;
  pipelineType: string;
  buildTriggerId: number | null;
  environments: {
    name: string;
    awsAccount: string;
    deploy: boolean;
    runTests: boolean;
    approvalRequired: boolean;
  }[];
}

export interface JobMapping {
  repoName: string;
  pipelineType: string;
  jenkinsHost: string;
  jenkinsJobPath: string;
  buildTriggerId: string | null;
}

// ─── DSL Parser ──────────────────────────────────────────────────

/**
 * Parse a single DSL groovy file to extract job info.
 */
function parseDslFile(filePath: string, dslFolder: string): DslJobInfo | null {
  const content = fs.readFileSync(filePath, "utf-8");

  // Extract relativeJobName
  const jobNameMatch = content.match(
    /relativeJobName\s*=\s*"([^"]+)"/
  );
  if (!jobNameMatch) return null;
  const relativeJobName = jobNameMatch[1];

  // Determine pipeline type from the job name suffix
  let pipelineType: string | null = null;
  if (relativeJobName.endsWith("__pullRequest")) pipelineType = "pullRequest";
  else if (relativeJobName.endsWith("__autoDeploy")) pipelineType = "autoDeploy";
  else if (relativeJobName.endsWith("__local")) pipelineType = "local";
  if (!pipelineType || pipelineType === "local") return null;

  // Extract git URL
  const gitUrlMatch = content.match(/url\('(git@ssh\.dev\.azure\.com[^']+)'\)/);
  if (!gitUrlMatch) return null;
  const gitUrl = gitUrlMatch[1];

  // Extract repo name from git URL: last segment
  const repoName = gitUrl.split("/").pop() || "";

  // Extract trigger token
  const tokenMatch = content.match(/token\("([^"]+)"\)/);
  const triggerToken = tokenMatch ? tokenMatch[1] : null;

  // Jenkins folder path = dslFolder (the directory name maps to the Jenkins folder)
  const jenkinsFolder = dslFolder;

  // Full job path for Jenkins API
  const jenkinsJobPath = `job/${jenkinsFolder}/job/${relativeJobName}`;

  return {
    dslFolder,
    relativeJobName,
    pipelineType,
    gitUrl,
    repoName,
    triggerToken,
    jenkinsFolder,
    jenkinsJobPath,
  };
}

/**
 * Scan all DSL files in the jenkins-pipelines repo.
 */
export function parseDslJobs(jenkinsPipelinesRepoPath: string): DslJobInfo[] {
  const jobsDir = path.join(jenkinsPipelinesRepoPath, "dsl_jobs", "jobs");
  if (!fs.existsSync(jobsDir)) {
    console.warn(`[job-mapper] DSL jobs directory not found: ${jobsDir}`);
    return [];
  }

  const results: DslJobInfo[] = [];
  const folders = fs.readdirSync(jobsDir, { withFileTypes: true });

  for (const folder of folders) {
    if (!folder.isDirectory() || folder.name.startsWith("_")) continue;

    const folderPath = path.join(jobsDir, folder.name);
    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".groovy"));

    for (const file of files) {
      const info = parseDslFile(path.join(folderPath, file), folder.name);
      if (info) results.push(info);
    }
  }

  return results;
}

// ─── Pipeline YAML Parser ────────────────────────────────────────

/**
 * Parse pipeline.yaml from a cloned application repo.
 */
export function parsePipelineYaml(repoPath: string): PipelineYamlInfo[] {
  const yamlPath = path.join(repoPath, ".devops", "pipelines", "pipeline.yaml");
  if (!fs.existsSync(yamlPath)) return [];

  const content = fs.readFileSync(yamlPath, "utf-8");
  const doc = yaml.load(content) as {
    product?: {
      components?: {
        repoName?: string;
        pipelines?: {
          name: string;
          buildTrigger?: { id?: number };
          environment?: Record<
            string,
            {
              awsAccount?: string;
              deploy?: boolean;
              runTests?: boolean;
              approval?: { required?: boolean };
            }
          >;
        }[];
      }[];
    };
  };

  const results: PipelineYamlInfo[] = [];
  const components = doc?.product?.components ?? [];

  for (const comp of components) {
    const repoName = comp.repoName ?? "";
    for (const pipeline of comp.pipelines ?? []) {
      if (pipeline.name === "local") continue;

      const environments = Object.entries(pipeline.environment ?? {}).map(
        ([name, cfg]) => ({
          name,
          awsAccount: cfg.awsAccount ?? "",
          deploy: cfg.deploy ?? false,
          runTests: cfg.runTests ?? false,
          approvalRequired: cfg.approval?.required ?? false,
        })
      );

      results.push({
        repoName,
        pipelineType: pipeline.name,
        buildTriggerId: pipeline.buildTrigger?.id ?? null,
        environments,
      });
    }
  }

  return results;
}

// ─── Host Discovery ──────────────────────────────────────────────

// Known platform repos that run on the platform Jenkins host
const PLATFORM_REPOS = new Set([
  "COS.Lending.Selling.UI",
  "Cos.Lending.Selling.Contracts",
]);

/**
 * Determine which Jenkins host a job runs on.
 * Strategy:
 *  - autoDeploy → always sharedservices (prod)
 *  - Platform repos → platform host
 *  - pullRequest → try sharedservices first, then sharedservices-dev, cache result
 */
async function discoverHost(
  jobPath: string,
  repoName: string,
  pipelineType: string
): Promise<string> {
  const hosts = getJenkinsHosts();

  // autoDeploy always runs on prod (sharedservices)
  if (pipelineType === "autoDeploy") {
    // Platform repos use platform host even for autoDeploy
    if (PLATFORM_REPOS.has(repoName)) {
      return hosts.platform.url;
    }
    return hosts.sharedservices.url;
  }

  // Platform repos
  if (PLATFORM_REPOS.has(repoName)) {
    return hosts.platform.url;
  }

  // pullRequest: probe both sharedservices hosts (prefer prod — most PR builds run there)
  const hostsToTry = [hosts.sharedservices, hosts.sharedservicesDev];
  for (const host of hostsToTry) {
    if (!host.url || !host.token) continue;
    try {
      const client = createJenkinsClient(host);
      await client.getJob(jobPath);
      return host.url;
    } catch {
      // Job not found on this host, try next
    }
  }

  // Fallback to sharedservices (prod)
  console.warn(`[job-mapper] Could not discover host for ${jobPath}, defaulting to sharedservices`);
  return hosts.sharedservices.url;
}

// ─── Build & Persist Mappings ────────────────────────────────────

/**
 * Scan DSL files and pipeline.yaml files, discover hosts, and persist mappings to DB.
 * Call this during repo scan or on demand.
 */
export async function buildJobMappings(
  jenkinsPipelinesRepoPath: string,
  kbReposPath: string,
  repoIdByName: Map<string, number>
): Promise<JobMapping[]> {
  const dslJobs = parseDslJobs(jenkinsPipelinesRepoPath);
  const mappings: JobMapping[] = [];

  for (const dsl of dslJobs) {
    const repoId = repoIdByName.get(dsl.repoName);
    if (repoId === undefined) {
      // This DSL job refers to a repo not tracked in DevCycle — skip
      continue;
    }

    // Try to get build trigger ID from pipeline.yaml
    let buildTriggerId: string | null = null;
    const repoPath = path.join(kbReposPath, dsl.repoName);
    if (fs.existsSync(repoPath)) {
      const pipelineInfos = parsePipelineYaml(repoPath);
      const match = pipelineInfos.find((p) => p.pipelineType === dsl.pipelineType);
      if (match?.buildTriggerId) {
        buildTriggerId = String(match.buildTriggerId);
      }
    }

    // Discover host
    const jenkinsHost = await discoverHost(
      dsl.jenkinsJobPath,
      dsl.repoName,
      dsl.pipelineType
    );

    const mapping: JobMapping = {
      repoName: dsl.repoName,
      pipelineType: dsl.pipelineType,
      jenkinsHost,
      jenkinsJobPath: dsl.jenkinsJobPath,
      buildTriggerId,
    };
    mappings.push(mapping);

    // Persist to DB
    const now = Date.now();
    const existing = db
      .select()
      .from(jenkinsJobMappings)
      .where(
        and(
          eq(jenkinsJobMappings.repoId, repoId),
          eq(jenkinsJobMappings.pipelineType, dsl.pipelineType)
        )
      )
      .get();

    if (existing) {
      db.update(jenkinsJobMappings)
        .set({
          jenkinsHost,
          jenkinsJobPath: dsl.jenkinsJobPath,
          buildTriggerId,
          repoName: dsl.repoName,
        })
        .where(eq(jenkinsJobMappings.id, existing.id))
        .run();
    } else {
      db.insert(jenkinsJobMappings)
        .values({
          repoId,
          repoName: dsl.repoName,
          pipelineType: dsl.pipelineType,
          jenkinsHost,
          jenkinsJobPath: dsl.jenkinsJobPath,
          buildTriggerId,
          createdAt: now,
        })
        .run();
    }
  }

  return mappings;
}

/**
 * Get the Jenkins job mapping for a repo and pipeline type from DB.
 */
export function getJobMapping(
  repoId: number,
  pipelineType: string
): typeof jenkinsJobMappings.$inferSelect | null {
  return (
    db
      .select()
      .from(jenkinsJobMappings)
      .where(
        and(
          eq(jenkinsJobMappings.repoId, repoId),
          eq(jenkinsJobMappings.pipelineType, pipelineType)
        )
      )
      .get() ?? null
  );
}

/**
 * Get all job mappings for a repo from DB.
 */
export function getJobMappingsForRepo(
  repoId: number
): (typeof jenkinsJobMappings.$inferSelect)[] {
  return db
    .select()
    .from(jenkinsJobMappings)
    .where(eq(jenkinsJobMappings.repoId, repoId))
    .all();
}

// ─── API-based Discovery ─────────────────────────────────────────

/**
 * Discover Jenkins jobs for a repo by scanning the Jenkins API directly.
 * Used for repos not covered by DSL files (e.g. platform Jenkins).
 */
export async function discoverJobsFromApi(
  repoName: string,
  repoId: number
): Promise<JobMapping[]> {
  const hosts = getJenkinsHosts();
  const allHosts = [
    { config: hosts.platform, name: "platform" },
    { config: hosts.sharedservicesDev, name: "sharedservicesDev" },
    { config: hosts.sharedservices, name: "sharedservices" },
  ];

  const mappings: JobMapping[] = [];

  for (const { config } of allHosts) {
    if (!config.url || !config.token) continue;

    const client = createJenkinsClient(config);

    // Try common folder patterns for this repo
    const folderPatterns = generateFolderPatterns(repoName);

    for (const { folder, jobPrefix } of folderPatterns) {
      for (const pipelineType of ["pullRequest", "autoDeploy"] as const) {
        const jobName = `${jobPrefix}__${pipelineType}`;
        const jobPath = `job/${folder}/job/${jobName}`;

        try {
          await client.getJob(jobPath);
          // Job exists on this host!
          const mapping: JobMapping = {
            repoName,
            pipelineType,
            jenkinsHost: config.url,
            jenkinsJobPath: jobPath,
            buildTriggerId: null,
          };
          mappings.push(mapping);

          // Persist to DB
          const now = Date.now();
          const existing = db
            .select()
            .from(jenkinsJobMappings)
            .where(
              and(
                eq(jenkinsJobMappings.repoId, repoId),
                eq(jenkinsJobMappings.pipelineType, pipelineType)
              )
            )
            .get();

          if (!existing) {
            db.insert(jenkinsJobMappings)
              .values({
                repoId,
                repoName,
                pipelineType,
                jenkinsHost: config.url,
                jenkinsJobPath: jobPath,
                createdAt: now,
              })
              .run();
          }
        } catch {
          // Job not found on this host/path — try next
        }
      }

      if (mappings.length > 0) break; // Found jobs, stop trying patterns
    }

    if (mappings.length > 0) break; // Found jobs, stop trying hosts
  }

  return mappings;
}

/**
 * Generate possible Jenkins folder/job patterns for a repo name.
 * Handles the naming conventions we've observed.
 */
function generateFolderPatterns(
  repoName: string
): { folder: string; jobPrefix: string }[] {
  const patterns: { folder: string; jobPrefix: string }[] = [];

  // Pattern 1: Direct DSL style — folder/COS.Lending.Selling__RepoName
  // e.g., cos-lending-selling/COS.Lending.Selling__COS.Lending.Selling.WebApi
  patterns.push({
    folder: "cos-lending-selling",
    jobPrefix: `COS.Lending.Selling__${repoName}`,
  });

  // Pattern 2: Nested folder — folder/sub-folder/COS.Lending.Selling__RepoName
  // e.g., cos-lending-selling/cos-lending-selling-ui/COS.Lending.Selling__COS.Lending.Selling.UI
  const kebab = repoName.replace(/\./g, "-").toLowerCase();
  patterns.push({
    folder: `cos-lending-selling/job/${kebab}`,
    jobPrefix: `COS.Lending.Selling__${repoName}`,
  });

  // Pattern 3: kebab-case folder
  patterns.push({
    folder: kebab,
    jobPrefix: `COS.Lending.Selling__${repoName}`,
  });

  return patterns;
}

// ─── Auto-populate ───────────────────────────────────────────────

let populatePromise: Promise<void> | null = null;

/**
 * Ensure job mappings are populated. Called lazily on first pipeline status request.
 * Tries DSL parsing first, then API discovery for unmapped repos.
 */
export async function ensureMappingsPopulated(): Promise<void> {
  // Only run once
  if (populatePromise) return populatePromise;

  populatePromise = (async () => {
    const existingCount = db.select().from(jenkinsJobMappings).all().length;
    if (existingCount > 0) return; // Already populated

    console.log("[job-mapper] Populating job mappings...");

    // Build repo name → id map
    const allRepos = db.select().from(repos).all();
    const repoIdByName = new Map(allRepos.map((r) => [r.name, r.id]));

    // Try DSL parsing first
    const jenkinsPipelinesPath = path.join(process.cwd(), "..", "kb", "repos", "jenkins-pipelines");
    const altPath = "/home/ukeselman/workspace/jenkins-pipelines";
    const dslPath = fs.existsSync(jenkinsPipelinesPath) ? jenkinsPipelinesPath : altPath;
    const kbReposPath = path.join(process.cwd(), "..", "kb", "repos");

    if (fs.existsSync(path.join(dslPath, "dsl_jobs"))) {
      await buildJobMappings(dslPath, kbReposPath, repoIdByName);
    }

    // For any repos without mappings, try API discovery
    for (const repo of allRepos) {
      const existing = db
        .select()
        .from(jenkinsJobMappings)
        .where(eq(jenkinsJobMappings.repoId, repo.id))
        .all();

      if (existing.length === 0) {
        console.log(`[job-mapper] Discovering jobs for ${repo.name} via API...`);
        await discoverJobsFromApi(repo.name, repo.id);
      }
    }

    const finalCount = db.select().from(jenkinsJobMappings).all().length;
    console.log(`[job-mapper] Populated ${finalCount} job mappings`);
  })();

  return populatePromise;
}

