import { db, schema } from "@truehire/db";
import { and, eq, desc } from "drizzle-orm";
import type { HiringRole, HiringPipeline, PipelineCandidate, CandidateEvaluation } from "@truehire/db";

export async function createHiringRole(params: {
  name: string;
  description: string;
  requirementsJson: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(schema.hiringRoles).values({
    id,
    name: params.name,
    description: params.description,
    requirementsJson: params.requirementsJson,
  });
  return id;
}

export async function getHiringRoles() {
  return db.select().from(schema.hiringRoles).orderBy(desc(schema.hiringRoles.createdAt));
}

export async function getHiringRole(id: string) {
  const rows = await db.select().from(schema.hiringRoles).where(eq(schema.hiringRoles.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createHiringPipeline(params: {
  roleId: string;
  name: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(schema.hiringPipelines).values({
    id,
    roleId: params.roleId,
    name: params.name,
    status: "active",
  });
  return id;
}

export async function getHiringPipelines() {
  return db
    .select({
      pipeline: schema.hiringPipelines,
      role: schema.hiringRoles,
    })
    .from(schema.hiringPipelines)
    .innerJoin(schema.hiringRoles, eq(schema.hiringPipelines.roleId, schema.hiringRoles.id))
    .orderBy(desc(schema.hiringPipelines.createdAt));
}

export async function getHiringPipeline(id: string) {
  const rows = await db
    .select({
      pipeline: schema.hiringPipelines,
      role: schema.hiringRoles,
    })
    .from(schema.hiringPipelines)
    .innerJoin(schema.hiringRoles, eq(schema.hiringPipelines.roleId, schema.hiringRoles.id))
    .where(eq(schema.hiringPipelines.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function addCandidateToPipeline(params: {
  pipelineId: string;
  userId: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(schema.pipelineCandidates).values({
    id,
    pipelineId: params.pipelineId,
    userId: params.userId,
    stage: "shortlist",
  });
  return id;
}

export async function getPipelineCandidates(pipelineId: string) {
  return db
    .select({
      candidate: schema.pipelineCandidates,
      user: schema.users,
    })
    .from(schema.pipelineCandidates)
    .innerJoin(schema.users, eq(schema.pipelineCandidates.userId, schema.users.id))
    .where(eq(schema.pipelineCandidates.pipelineId, pipelineId))
    .orderBy(desc(schema.pipelineCandidates.createdAt));
}

export async function updateCandidateStage(params: {
  candidateId: string;
  stage: PipelineCandidate["stage"];
  notes?: string;
}) {
  const patch: { stage: PipelineCandidate["stage"]; notes?: string } = {
    stage: params.stage,
  };
  if (params.notes !== undefined) patch.notes = params.notes;
  await db
    .update(schema.pipelineCandidates)
    .set(patch)
    .where(eq(schema.pipelineCandidates.id, params.candidateId));
}

export async function updateCandidateNotes(params: {
  candidateId: string;
  notes: string;
}) {
  await db
    .update(schema.pipelineCandidates)
    .set({ notes: params.notes })
    .where(eq(schema.pipelineCandidates.id, params.candidateId));
}

export async function createEvaluation(params: {
  pipelineCandidateId: string;
  stage: string;
  scoresJson: string;
  overallRecommendation: CandidateEvaluation["overallRecommendation"];
  evaluatorId: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(schema.candidateEvaluations).values({
    id,
    pipelineCandidateId: params.pipelineCandidateId,
    stage: params.stage,
    scoresJson: params.scoresJson,
    overallRecommendation: params.overallRecommendation,
    evaluatorId: params.evaluatorId,
  });
  return id;
}

export async function getCandidateEvaluations(pipelineCandidateId: string) {
  return db
    .select()
    .from(schema.candidateEvaluations)
    .where(eq(schema.candidateEvaluations.pipelineCandidateId, pipelineCandidateId))
    .orderBy(desc(schema.candidateEvaluations.createdAt));
}
