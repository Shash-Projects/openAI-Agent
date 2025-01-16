import { openai } from "@/app/openai";

export const runtime = "nodejs";

// Create a new thread
export async function POST() {
  
  const thread = await openai.beta.threads.create();
  console.log("creating htread haha \n", thread);
  return Response.json({ threadId: thread.id });
}
