// One definition per Week 7 table. The generic page, forms and server actions
// all read from here, so validation on the server matches what the form shows.

export type FieldKind = 'text' | 'textarea' | 'integer' | 'decimal' | 'boolean' | 'choice' | 'ref' | 'email' | 'domain' | 'url' | 'envname' | 'picture';

export type Field = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  max?: number;          // character limit for text, upper bound for numbers
  min?: number;          // lower bound for numbers
  choices?: string[];    // for kind 'choice'
  ref?: { table: string; label: string }; // for kind 'ref'
  help?: string;
};

export type Row = Record<string, unknown>;

export type Column = { label: string; value: (row: Row, person: (id: unknown) => string) => string; mono?: boolean; wide?: boolean };

export type Resource = {
  key: string;
  table: string;
  title: string;
  singular: string;
  kicker: string;
  description: string;
  select: string;
  order: { column: string; ascending: boolean };
  search: string[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  fields: Field[];
  columns: Column[];
  usesPeople?: boolean;
  limitNote?: string;
};

const text = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));
const when = (v: unknown) => (v ? new Date(String(v)).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short' }) : '—');
const nested = (v: unknown, key: string) => (v && typeof v === 'object' ? text((v as Row)[key]) : '—');
const yesNo = (v: unknown) => (v ? 'Active' : 'Inactive');
const clip = (v: unknown, n = 160) => { const s = text(v); return s.length > n ? `${s.slice(0, n)}…` : s; };

export const RESOURCES: Resource[] = [
  {
    key: 'prompt-chains', table: 'prompt_chains', title: 'Prompt chains', singular: 'prompt chain',
    kicker: 'PIPELINE / READ ONLY', description: 'Each tone in the caption generator runs its own chain of steps.',
    select: 'id,name,tone,description,is_active,created_at,prompt_chain_steps(count),prompt_chain_mix(weight)',
    order: { column: 'id', ascending: true }, search: ['name', 'description'],
    canCreate: false, canUpdate: false, canDelete: false, fields: [],
    columns: [
      { label: 'ID', value: r => text(r.id), mono: true },
      { label: 'CHAIN', value: r => text(r.name) },
      { label: 'TONE', value: r => text(r.tone) },
      { label: 'DESCRIPTION', value: r => text(r.description), wide: true },
      { label: 'STEPS', value: r => Array.isArray(r.prompt_chain_steps) ? nested(r.prompt_chain_steps[0], 'count') : '0' },
      { label: 'MIX WEIGHT', value: r => nested(r.prompt_chain_mix, 'weight') },
      { label: 'STATUS', value: r => yesNo(r.is_active) },
    ],
  },
  {
    key: 'prompt-chain-steps', table: 'prompt_chain_steps', title: 'Chain steps', singular: 'step',
    kicker: 'PIPELINE / READ ONLY', description: 'The ordered steps inside every prompt chain, with the model each one calls.',
    select: 'id,step_order,title,instructions,prompt_chains(name),llm_models(name)',
    order: { column: 'prompt_chain_id', ascending: true }, search: ['title', 'instructions'],
    canCreate: false, canUpdate: false, canDelete: false, fields: [],
    columns: [
      { label: 'CHAIN', value: r => nested(r.prompt_chains, 'name') },
      { label: 'STEP', value: r => text(r.step_order) },
      { label: 'TITLE', value: r => text(r.title) },
      { label: 'MODEL', value: r => r.llm_models ? nested(r.llm_models, 'name') : 'No model call' },
      { label: 'INSTRUCTIONS', value: r => text(r.instructions), wide: true },
    ],
  },
  {
    key: 'terms', table: 'terms', title: 'Terms', singular: 'term',
    kicker: 'PIPELINE / GLOSSARY', description: 'Columbia places, institutions and slang the captions refer to.',
    select: 'id,term,definition,example,category,updated_at',
    order: { column: 'term', ascending: true }, search: ['term', 'definition', 'category'],
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { name: 'term', label: 'TERM', kind: 'text', required: true, max: 120 },
      { name: 'definition', label: 'DEFINITION', kind: 'textarea', required: true, max: 2000 },
      { name: 'example', label: 'EXAMPLE USAGE', kind: 'text', max: 500 },
      { name: 'category', label: 'CATEGORY', kind: 'text', max: 60, help: 'For example Places, Institutions or Campus life.' },
    ],
    columns: [
      { label: 'TERM', value: r => text(r.term) },
      { label: 'DEFINITION', value: r => text(r.definition), wide: true },
      { label: 'EXAMPLE', value: r => text(r.example) },
      { label: 'CATEGORY', value: r => text(r.category) },
    ],
  },
  {
    key: 'caption-examples', table: 'caption_examples', title: 'Generation examples', singular: 'example',
    kicker: 'PIPELINE / EXAMPLES', description: 'Reference captions that show the generator what a good joke for a scene looks like.',
    select: 'id,title,prompt_chain_id,image_description,caption_text,image_path,explanation,priority,prompt_chains(name)',
    order: { column: 'priority', ascending: false }, search: ['title', 'caption_text', 'image_description'],
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { name: 'title', label: 'TITLE', kind: 'text', required: true, max: 160 },
      { name: 'prompt_chain_id', label: 'PROMPT CHAIN', kind: 'ref', ref: { table: 'prompt_chains', label: 'name' }, help: 'Leave empty to apply to every tone.' },
      { name: 'image_description', label: 'SCENE', kind: 'textarea', required: true, max: 2000 },
      { name: 'caption_text', label: 'EXAMPLE CAPTION', kind: 'textarea', required: true, max: 500 },
      { name: 'image_path', label: 'PICTURE', kind: 'picture' },
      { name: 'explanation', label: 'WHY IT WORKS / SOURCE', kind: 'textarea', max: 2000 },
      { name: 'priority', label: 'PRIORITY (0–100)', kind: 'integer', min: 0, max: 100 },
    ],
    columns: [
      { label: 'TITLE', value: r => text(r.title) },
      { label: 'CAPTION', value: r => text(r.caption_text), wide: true },
      { label: 'SCENE', value: r => clip(r.image_description, 120) },
      { label: 'CHAIN', value: r => r.prompt_chains ? nested(r.prompt_chains, 'name') : 'All tones' },
      { label: 'PRIORITY', value: r => text(r.priority) },
    ],
  },
  {
    key: 'llm-providers', table: 'llm_providers', title: 'LLM providers', singular: 'provider',
    kicker: 'MODELS / PROVIDERS', description: 'Services the rating app can call. Credentials stay in server environment variables.',
    select: 'id,name,base_url,credential_env,notes,is_active,updated_at,llm_models(count)',
    order: { column: 'id', ascending: true }, search: ['name', 'notes'],
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { name: 'name', label: 'NAME', kind: 'text', required: true, max: 80 },
      { name: 'base_url', label: 'BASE URL', kind: 'url', max: 300 },
      { name: 'credential_env', label: 'CREDENTIAL VARIABLE NAME', kind: 'envname', help: 'Only the variable name, such as GEMINI_API_KEY. Never paste a secret.' },
      { name: 'notes', label: 'NOTES', kind: 'textarea', max: 1000 },
      { name: 'is_active', label: 'ACTIVE', kind: 'boolean' },
    ],
    columns: [
      { label: 'PROVIDER', value: r => text(r.name) },
      { label: 'BASE URL', value: r => text(r.base_url), mono: true },
      { label: 'CREDENTIAL', value: r => text(r.credential_env), mono: true },
      { label: 'MODELS', value: r => Array.isArray(r.llm_models) ? nested(r.llm_models[0], 'count') : '0' },
      { label: 'NOTES', value: r => text(r.notes), wide: true },
      { label: 'STATUS', value: r => yesNo(r.is_active) },
    ],
  },
  {
    key: 'llm-models', table: 'llm_models', title: 'LLM models', singular: 'model',
    kicker: 'MODELS / REGISTRY', description: 'Models available to prompt chain steps, grouped by provider.',
    select: 'id,provider_id,name,model_identifier,max_output_tokens,temperature,is_active,updated_at,llm_providers(name)',
    order: { column: 'id', ascending: true }, search: ['name', 'model_identifier'],
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { name: 'provider_id', label: 'PROVIDER', kind: 'ref', required: true, ref: { table: 'llm_providers', label: 'name' } },
      { name: 'name', label: 'DISPLAY NAME', kind: 'text', required: true, max: 120 },
      { name: 'model_identifier', label: 'MODEL IDENTIFIER', kind: 'text', required: true, max: 120, help: 'Exactly as stored on captions, such as google/gemini-3.5-flash-lite.' },
      { name: 'max_output_tokens', label: 'MAX OUTPUT TOKENS', kind: 'integer', min: 1, max: 65536 },
      { name: 'temperature', label: 'TEMPERATURE (0–2)', kind: 'decimal', min: 0, max: 2 },
      { name: 'is_active', label: 'ACTIVE', kind: 'boolean' },
    ],
    columns: [
      { label: 'MODEL', value: r => text(r.name) },
      { label: 'IDENTIFIER', value: r => text(r.model_identifier), mono: true },
      { label: 'PROVIDER', value: r => nested(r.llm_providers, 'name') },
      { label: 'MAX TOKENS', value: r => text(r.max_output_tokens) },
      { label: 'TEMP.', value: r => text(r.temperature) },
      { label: 'STATUS', value: r => yesNo(r.is_active) },
    ],
  },
  {
    key: 'generation-requests', table: 'generation_requests', title: 'Generation requests', singular: 'request',
    kicker: 'OBSERVABILITY / READ ONLY', description: 'Every generation attempt a member reserved, including ones that never produced a caption.',
    select: 'id,user_id,prompt,model,created_at,llm_responses(status,caption_id)',
    order: { column: 'created_at', ascending: false }, search: ['prompt', 'model'],
    canCreate: false, canUpdate: false, canDelete: false, fields: [], usesPeople: true,
    columns: [
      { label: 'WHEN', value: r => when(r.created_at) },
      { label: 'MEMBER', value: (r, person) => person(r.user_id) },
      { label: 'MODEL', value: r => text(r.model), mono: true },
      { label: 'OUTCOME', value: r => { const x = Array.isArray(r.llm_responses) ? r.llm_responses[0] : r.llm_responses; return x ? `${nested(x, 'status')}${(x as Row).caption_id ? ` · caption #${(x as Row).caption_id}` : ''}` : 'No response logged'; } },
      { label: 'PROMPT', value: r => clip(r.prompt, 220), wide: true },
    ],
  },
  {
    key: 'llm-responses', table: 'llm_responses', title: 'LLM responses', singular: 'response',
    kicker: 'OBSERVABILITY / READ ONLY', description: 'What the model returned for each generation, with timing, token use and failures.',
    select: 'id,user_id,caption_id,model,tone,status,response_text,finish_reason,input_tokens,output_tokens,latency_ms,error_status,created_at,llm_models(name),prompt_chains(name)',
    order: { column: 'created_at', ascending: false }, search: ['response_text', 'model', 'status'],
    canCreate: false, canUpdate: false, canDelete: false, fields: [], usesPeople: true,
    columns: [
      { label: 'WHEN', value: r => when(r.created_at) },
      { label: 'MEMBER', value: (r, person) => person(r.user_id) },
      { label: 'STATUS', value: r => `${text(r.status)}${r.error_status ? ` (${r.error_status})` : ''}` },
      { label: 'RESPONSE', value: r => text(r.response_text), wide: true },
      { label: 'CHAIN', value: r => nested(r.prompt_chains, 'name') },
      { label: 'MODEL', value: r => r.llm_models ? nested(r.llm_models, 'name') : text(r.model) },
      { label: 'TOKENS IN/OUT', value: r => (r.input_tokens ?? r.output_tokens) != null ? `${text(r.input_tokens)} / ${text(r.output_tokens)}` : '—' },
      { label: 'LATENCY', value: r => r.latency_ms != null ? `${r.latency_ms} ms` : '—' },
      { label: 'CAPTION', value: r => r.caption_id ? `#${r.caption_id}` : '—' },
    ],
  },
  {
    key: 'signup-domains', table: 'allowed_signup_domains', title: 'Allowed signup domains', singular: 'domain',
    kicker: 'ACCESS / DOMAINS', description: 'Email domains approved for new member accounts.',
    select: 'id,domain,note,created_at', order: { column: 'domain', ascending: true }, search: ['domain', 'note'],
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { name: 'domain', label: 'DOMAIN', kind: 'domain', required: true, help: 'For example columbia.edu, without the @.' },
      { name: 'note', label: 'NOTE', kind: 'text', max: 500 },
    ],
    columns: [
      { label: 'DOMAIN', value: r => text(r.domain), mono: true },
      { label: 'NOTE', value: r => text(r.note), wide: true },
      { label: 'ADDED', value: r => when(r.created_at) },
    ],
  },
  {
    key: 'whitelisted-emails', table: 'whitelisted_email_addresses', title: 'Whitelisted emails', singular: 'email address',
    kicker: 'ACCESS / EMAILS', description: 'Individual addresses approved regardless of their domain.',
    select: 'id,email,note,created_at', order: { column: 'email', ascending: true }, search: ['email', 'note'],
    canCreate: true, canUpdate: true, canDelete: true,
    fields: [
      { name: 'email', label: 'EMAIL ADDRESS', kind: 'email', required: true },
      { name: 'note', label: 'NOTE', kind: 'text', max: 500 },
    ],
    columns: [
      { label: 'EMAIL', value: r => text(r.email), mono: true },
      { label: 'NOTE', value: r => text(r.note), wide: true },
      { label: 'ADDED', value: r => when(r.created_at) },
    ],
  },
];

export const findResource = (key: string) => RESOURCES.find(r => r.key === key);

export const NAV_GROUPS: { label: string; links: [string, string][] }[] = [
  { label: 'WORKSPACE', links: [['/', 'Overview'], ['/media', 'AI Media'], ['/users', 'Users & Profiles'], ['/ratings', 'Ratings & Votes']] },
  { label: 'PIPELINE', links: [['/prompt-chains', 'Prompt chains'], ['/prompt-chain-steps', 'Chain steps'], ['/prompt-chain-mix', 'Chain mix'], ['/terms', 'Terms'], ['/caption-examples', 'Generation examples']] },
  { label: 'MODELS', links: [['/llm-providers', 'LLM providers'], ['/llm-models', 'LLM models']] },
  { label: 'OBSERVABILITY', links: [['/generation-requests', 'Generation requests'], ['/llm-responses', 'LLM responses']] },
  { label: 'ACCESS', links: [['/signup-domains', 'Signup domains'], ['/whitelisted-emails', 'Whitelisted emails']] },
];

// PostgREST reports a missing table before sql/004 is applied.
export const isMissingTable = (error: { code?: string } | null) => error?.code === 'PGRST205' || error?.code === '42P01';
