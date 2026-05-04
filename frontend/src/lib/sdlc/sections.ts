export interface SectionDef {
  key: string;
  title: string;
  order: number;
  guidance: string;
}

export const DESIGN_DOC_SECTIONS: SectionDef[] = [
  { key: "ownership", title: "Ownership", order: 0,
    guidance: "Fill in: Status (DRAFT), Author, Team, Sponsor, Key Stakeholders, Review by Date. Use the epic assignee and any info from the description." },
  { key: "background", title: "Background", order: 1,
    guidance: "What problem does this solve? What is the business need? How does it align with platform direction? What is in scope vs out of scope? Link to related designs if mentioned." },
  { key: "definition_of_success", title: "Definition of Success", order: 2,
    guidance: "How do we know this was successful? What business metrics or system telemetry should we track? Be specific and measurable." },
  { key: "proposal", title: "Proposal", order: 3,
    guidance: "Describe the recommended approach. Include options with pros/cons if applicable. What are the main components? How do they interact? What is new vs existing? Keep at architecture level — no code-level implementation details." },
  { key: "impacted_teams", title: "Impacted Teams / Systems", order: 4,
    guidance: "Which upstream/downstream teams or systems are affected? Who needs to be consulted? What is the expected impact on each?" },
  { key: "risks", title: "Risks & Mitigations", order: 5,
    guidance: "Where are we least confident? What would be expensive to change later? What happens if a dependency fails? For each risk, suggest a mitigation." },
  { key: "open_questions", title: "Open Questions", order: 6,
    guidance: "What decisions remain? What needs stakeholder input? What unknowns could change the approach?" },
];

export const TEST_PLAN_SECTIONS: SectionDef[] = [
  { key: "scope", title: "Scope", order: 0,
    guidance: "What does this epic change? What areas of the system are affected? What is in scope for testing vs out of scope?" },
  { key: "unit_tests", title: "Unit Test Coverage", order: 1,
    guidance: "Which components/services need new unit tests? Suggest specific test cases for the key logic." },
  { key: "functional_tests", title: "Functional Test Scenarios", order: 2,
    guidance: "Derive from acceptance criteria. Use Given/When/Then format. Cover happy path and error cases." },
  { key: "regression_scope", title: "Regression Scope", order: 3,
    guidance: "Which existing features could break? Identify areas to regression test based on system dependencies." },
  { key: "uat_scenarios", title: "UAT Scenarios", order: 4,
    guidance: "Write business-language scenarios stakeholders can validate. Focus on user-visible behavior." },
  { key: "security", title: "Security Considerations", order: 5,
    guidance: "Any new attack surface? Data handling changes? Compliance concerns? PII implications?" },
  { key: "performance", title: "Performance Considerations", order: 6,
    guidance: "Is load testing needed? What are the expected traffic patterns? Any SLA implications?" },
];

export function getSectionDefs(type: string): SectionDef[] {
  return type === "design_doc" ? DESIGN_DOC_SECTIONS : TEST_PLAN_SECTIONS;
}

export function findSectionDef(type: string, key: string): SectionDef | undefined {
  return getSectionDefs(type).find((s) => s.key === key);
}
