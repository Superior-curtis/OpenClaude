// Shared model-name filter: identifies models that are NOT chat/completions
// (embeddings, rerankers, speech, vision-OCR, image/video generation, biology,
// guardrails). Used by the renderer to clean up provider model lists — NVIDIA
// NIM in particular lists hundreds of non-chat models.
const NON_CHAT = /embed|\bbge\b|\be5\b|gte-|rerank|retriev|reranking|\bocr\b|paddleocr|parakeet|canary|riva|\basr\b|\btts\b|\bstt\b|speech|whisper|\bcodec\b|fastpitch|audio2face|maxine|nvclip|\bclip\b|dragon|table-structure|surya|deplot|\bsam[- ]?2?\b|segment|depth|\besm\b|diffdock|molmim|genmol|proteinmpnn|rfdiffusion|boltz|evo2|\bvad\b|imagen|\bveo\b|image-generation|text-to-image|stable-diffusion|sdxl|\bflux\b|cosmos|nemoretriever|\baqa\b|guard|safety|content-safety|topic-control|jailbreak/i;

function isChatModel(id) {
  return !NON_CHAT.test(id);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NON_CHAT, isChatModel };
}
