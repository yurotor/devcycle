# Output Schemas

JSON schemas for all files the build-kb skill produces.

## Per-repo analysis (`raw/{repo}/analysis.json`)

```json
{
  "_headHash": "abc123...",
  "purpose": "string — 2-3 sentences",
  "businessFeatures": ["string"],
  "apis": [
    { "endpoint": "/path", "method": "GET|POST|PUT|DELETE|PATCH", "purpose": "string" }
  ],
  "dependencies": [
    { "target": "service-or-repo-name", "type": "http|messaging|shared-lib|database" }
  ],
  "dataEntities": [
    { "name": "EntityName", "description": "string" }
  ],
  "messagingPatterns": [
    { "type": "outbox|queue|topic|event", "name": "string", "description": "string" }
  ],
  "integrations": [
    { "system": "string", "direction": "upstream|downstream|bidirectional", "protocol": "REST|SOAP|messaging|file|AWS SDK|etc" }
  ],
  "architecturePatterns": ["string"],
  "techStack": ["string"],
  "findings": [
    {
      "severity": "critical|high",
      "category": "security|architecture|optimization|bug",
      "title": "string",
      "description": "string — detailed explanation and recommended fix",
      "files": ["path/to/file"]
    }
  ],
  "ambiguities": ["string — each must name a specific code reference"]
}
```

Notes:
- `_headHash` is the git HEAD hash at clone time, used for cache invalidation on re-runs.
- Only include `critical` and `high` severity findings. Don't pad with low-severity noise.
- `ambiguities` must be concrete and reference specific code. Bad: "How does pricing work?" Good: "Config key 'GROOMING_THRESHOLD' in batch_processor.py is used but its business meaning is unclear"

## Repo digests (`raw/repo-digests.json`)

```json
[
  {
    "repo": "string",
    "purpose": "string",
    "features": ["string"],
    "dependsOn": ["string"],
    "entities": ["string"],
    "externalSystems": ["string"],
    "messagePatterns": ["string"],
    "ambiguities": ["string"]
  }
]
```

## Cluster plan (`raw/cluster-plan.json`)

```json
{
  "clusters": [
    {
      "name": "string",
      "repos": ["repo1", "repo2"],
      "analysisGoal": "string — what to investigate about this cluster"
    }
  ],
  "businessFlows": [
    {
      "name": "string",
      "involvedRepos": ["repo1", "repo2", "repo3"]
    }
  ]
}
```

Rules:
- Each cluster has 2-3 repos that work closely together
- Every repo appears in exactly one cluster
- 3-5 business flows spanning multiple repos

## Cluster analysis (`raw/clusters/{slug}.json`)

```json
{
  "clusterName": "string",
  "sharedEntities": [
    { "entity": "string", "repos": ["string"], "description": "string — how it flows between repos" }
  ],
  "dataFlows": [
    { "name": "string", "description": "string", "steps": ["string"] }
  ],
  "integrationPoints": [
    { "from": "repo1", "to": "repo2", "mechanism": "HTTP|messaging|shared-db|etc", "description": "string" }
  ],
  "patterns": [
    { "pattern": "string", "description": "string", "repos": ["string"] }
  ],
  "ambiguities": ["string"]
}
```

## Business flow analysis (`raw/flows/{slug}.json`)

```json
{
  "flowName": "string",
  "description": "string — 2-3 paragraph end-to-end description",
  "steps": ["step1: description", "step2: description"],
  "repos": ["string"],
  "entities": ["string"],
  "externalSystems": ["string"],
  "ambiguities": ["string"]
}
```

## System synthesis (`raw/system-synthesis.json`)

```json
{
  "systemOverview": "string — 2-3 paragraphs",
  "serviceMap": [
    { "repo": "string", "role": "string", "communicatesWith": ["string"] }
  ],
  "features": [
    { "name": "string", "description": "string", "repos": ["string"], "dataFlow": "string" }
  ],
  "dataFlows": [
    { "name": "string", "description": "string", "steps": ["string"] }
  ],
  "integrations": [
    { "system": "string", "direction": "string", "protocol": "string", "repos": ["string"] }
  ],
  "dataModel": [
    { "entity": "string", "description": "string", "repos": ["string"] }
  ],
  "architecturePatterns": [
    { "pattern": "string", "description": "string", "repos": ["string"] }
  ],
  "ambiguities": ["string"]
}
```

## Interview notes (`raw/interview-notes.json`)

```json
{
  "transcript": "string — full readable transcript with **User:** and **AI:** markers",
  "messages": [
    { "role": "user|assistant", "content": "string" }
  ]
}
```

## Wiki manifest (`wiki/manifest.json`)

```json
{
  "Page Title": "section/filename.md",
  "Another Page": "repos/repo-slug.md"
}
```

Maps page titles to their wiki-relative paths. Used for resolving cross-page links.
