export let assistantId = "asst_KYxjkhJKs5Fy5Stl5DRD3RvQ"; // set your assistant ID here asst_DnXsPcUhHsqMcbHoJL8X8t41

if (assistantId === "") {
  assistantId = process.env.OPENAI_ASSISTANT_ID;
}
