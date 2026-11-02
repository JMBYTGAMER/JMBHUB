// Small public Help Centre enhancements. Videos stay usable with their transcripts if playback fails.
document.querySelectorAll(".guide-video-card video").forEach((video)=>{
  const card=video.closest(".guide-video-card");
  let shown=false;
  video.addEventListener("error",()=>{
    if(shown)return;shown=true;
    const note=document.createElement("p");
    note.className="guide-video-note";
    note.textContent="This video could not be loaded in this browser. Use the transcript and written guide below instead.";
    card.append(note);
  });
});
