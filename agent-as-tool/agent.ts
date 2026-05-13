import {
  LlmAgent,
  AgentTool,
  GOOGLE_SEARCH,
  URL_CONTEXT,
  setLogLevel,
  LogLevel,
} from "@google/adk";

setLogLevel(LogLevel.ERROR);

const researcher = new LlmAgent({
  name: "researcher",
  model: "gemini-3-flash-preview",
  description:
    "Researches a topic on the web. Accepts a brief and returns findings with sources. Can be re-called with a sharper brief to fill specific gaps.",
  instruction: `You are a researcher.

Given a brief, search the web and return findings.

Format:
- 4 to 8 bullet points covering the brief.
- Each bullet ends with a source URL.
- If the brief targets specific gaps (e.g. "find compliance deadlines"), focus only on those gaps. Do not repeat earlier ground.

Be concise. No preamble.`,
  tools: [GOOGLE_SEARCH, URL_CONTEXT],
});

const critic = new LlmAgent({
  name: "critic",
  model: "gemini-3-flash-preview",
  description:
    "Reviews research findings for completeness. Returns APPROVED or a list of specific gaps.",
  instruction: `You are a research critic.

Read the findings against the original user request. Check for:
- Missing facts directly implied by the request
- Vague claims without sources
- Outdated or generic information where specifics are needed

Return one of:
- "APPROVED" if the findings fully cover the request.
- "NEEDS_REVISION" followed by a numbered list of specific gaps. Each gap must be concrete enough that a researcher could act on it directly (e.g. "missing the compliance deadline for general-purpose AI" not "needs more detail").

Do not rewrite the findings. Only judge them.`,
});

export const rootAgent = new LlmAgent({
  name: "research_root",
  model: "gemini-3-flash-preview",
  description:
    "Iteratively researches a topic with a critic-driven refinement loop.",
  instruction: `You orchestrate research with a critic.

Process:
1. Call researcher with a brief derived from the user's request.
2. Call critic with the findings.
3. If critic returns APPROVED, write the final report and stop.
4. If critic returns NEEDS_REVISION, call researcher AGAIN with a brief targeting ONLY the listed gaps. Do not re-research what you already have.
5. Call critic again with the combined findings.
6. Repeat steps 4 and 5 until APPROVED.

Rules:
- Always start by calling researcher. Never answer from memory.
- When re-calling researcher, the brief must reference the specific gaps from the critic.
- The final report should integrate all research passes, not just the last one.
- Cite sources from the findings in the final report.`,
  tools: [
    new AgentTool({ agent: researcher }),
    new AgentTool({ agent: critic }),
  ],
});

//  or until you have called researcher 3 times total.
