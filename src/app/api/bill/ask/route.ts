// POST /api/bill/ask — { question, extraction } -> { answer }
// The answer is grounded in the already-extracted bill data (the image is not re-sent).
import { AskRequestSchema } from "@/features/bill/schema";
import { answerQuestions } from "@/features/bill/server/answer";
import { aiErrorResponse } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = AskRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  try {
    const answers = await answerQuestions(parsed.data.extraction, [{ question_id: "Q", question: parsed.data.question }]);
    return Response.json({ answer: answers.get("Q") ?? "Sorry, I couldn't answer that from this bill." });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
