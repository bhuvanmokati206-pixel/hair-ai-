// Quick diagnostic: send a real photo to the local analyze-hair endpoint
// and print the `source` field so we know which path served the result.

const imgUrl = "https://thispersondoesnotexist.com/";
const res = await fetch(imgUrl);
const buf = Buffer.from(await res.arrayBuffer());
const b64 = buf.toString("base64");
console.log("image bytes:", buf.length);

const photos = ["front", "left", "right", "back"].map((label) => ({
  base64: b64,
  mediaType: "image/jpeg",
  label,
}));

const r = await fetch("http://localhost:3000/api/analyze-hair", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ photos }),
});

const data = await r.json();
console.log("HTTP status:", r.status);
console.log("source:", data.source);
console.log("analysis:", JSON.stringify(data.analysis, null, 2));
