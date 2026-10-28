// AI layer: Anthropic API (vision + explanation) grounded by openFDA drug labels.
const KEY = () => process.env.ANTHROPIC_API_KEY;
exports.enabled = () => !!KEY();

const DISCLAIMER = 'Informational only - not a substitute for advice from your doctor or pharmacist.';

async function ask(content, system) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 900, system,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!r.ok) throw new Error(`AI service error ${r.status}`);
  const d = await r.json();
  const text = d.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// Pull the "drug_interactions" label section from openFDA (factual grounding)
async function fdaLabel(name) {
  try {
    const q = encodeURIComponent(`openfda.generic_name:"${name}" OR openfda.brand_name:"${name}"`);
    const r = await fetch(`https://api.fda.gov/drug/label.json?search=${q}&limit=1`);
    if (!r.ok) return '';
    const d = await r.json();
    return (d.results?.[0]?.drug_interactions || []).join(' ').slice(0, 3000);
  } catch { return ''; }
}

exports.interactionCheck = async (existingMeds, newMed) => {
  const labels = await Promise.all([newMed, ...existingMeds].map(async (n) => ({ drug: n, label: await fdaLabel(n) })));
  const newLabel = labels[0].label.toLowerCase();

  if (!KEY()) { // fallback: plain keyword match against the FDA label text
    const hits = existingMeds.filter((m) => newLabel.includes(m.toLowerCase()));
    return {
      severity: hits.length ? 'moderate' : 'unknown',
      summary: hits.length
        ? `The FDA label for ${newMed} mentions: ${hits.join(', ')}. Please confirm with your doctor.`
        : `No direct mention found in the FDA label for ${newMed}. This is not a guarantee of safety.`,
      details: [], source: 'openFDA (keyword match)', disclaimer: DISCLAIMER,
    };
  }
  const system = 'You are a careful clinical-pharmacology assistant. Use ONLY the supplied FDA label text as evidence; ' +
    'if evidence is missing say so and use severity "unknown". Reply with JSON only: ' +
    '{"severity":"none|minor|moderate|major|unknown","summary":"<=2 plain-language sentences for an elderly patient","details":["one line per relevant clash"]}';
  const out = await ask(JSON.stringify({ existingMeds, newMed, fdaLabels: labels }), system);
  return { ...out, source: 'openFDA + AI explanation', disclaimer: DISCLAIMER };
};

const imgPart = (buf, mime) => ({ type: 'image', source: { type: 'base64', media_type: mime || 'image/jpeg', data: buf.toString('base64') } });

exports.identifyPill = async (buf, mime, prescribed) => {
  const system = 'You identify pills from photos. Never guess beyond what is visible. Reply JSON only: ' +
    '{"description":"color/shape/imprint","likelyDrug":"name or null","matchesPrescription":true|false|null,"confidence":"low|medium|high"}';
  const out = await ask([imgPart(buf, mime), { type: 'text', text: `Prescribed drugs: ${prescribed.join(', ') || 'none listed'}. Identify the pill.` }], system);
  return { ...out, disclaimer: DISCLAIMER };
};

exports.verifyBlister = async (buf, mime, drugName) => {
  const system = 'You verify medication blister-pack photos. Reply JSON only: {"verified":true|false,"note":"short reason"}. ' +
    'verified=true only if a blister pack is clearly visible and at least one tablet slot looks emptied.';
  return ask([imgPart(buf, mime), { type: 'text', text: `Expected medication: ${drugName}` }], system);
};
