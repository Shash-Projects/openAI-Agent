export let assistantId = "asst_DnXsPcUhHsqMcbHoJL8X8t41"; // set your assistant ID here

if (assistantId === "") {
  assistantId = process.env.OPENAI_ASSISTANT_ID;
}
