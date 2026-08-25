import { recommendFromMenu } from "@/lib/menuRecommender";
const analysis: any = { hairLength:"medium", hairDensity:"thin", hairTexture:"frizzy wavy", hairColor:"black with some greys", faceShape:"oval", currentStyle:"long layers grown out", bestMatch:"long bob", feasibleStyles:[], bestMatchReason:"", stylingTips:"", gender:"female" };
const health: any = { concern:["Dandruff","Hair fall","Frizz"], scalpCondition:["Flaky / Dandruff"], washFrequency:"", waterType:"", diet:"", stressLevel:"", currentProducts:"" };
const r = recommendFromMenu(analysis, health, undefined, { maxTreatments: 3 });
r.treatments.forEach((t)=>console.log("TREATMENT:", t.service.name, "Rs"+t.variant.price, "-", t.reason));
console.log("TOTAL Rs"+r.total, "| MEMBER Rs"+r.memberTotal);
