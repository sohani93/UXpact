// Embedded verbatim from docs/ARCHETYPE_FRAMEWORK.md — edge functions can't
// read arbitrary repo files at runtime, so this is the deployable copy. Keep
// both in sync: if the framework doc changes, update this constant too.
export const ARCHETYPE_FRAMEWORK = `
NARRATIVE QUALITY BAR — applies to every diagnosis, every archetype, no exceptions.

A generated narrative verdict must:
1. Name at least one real, specific detail from the actual audited page — a phrase close to
   the site's real copy, a specific repeated element, a specific named section. Not a category
   description ("repeated quotes create friction") — the actual thing ("the same Mindbody
   testimonial appears four times").
2. Avoid hedge language — no "may," "could," "consequently," "as they look for." State what is
   happening, plainly, as fact.
3. Stay to 2-3 sentences, current-archetype-to-target-archetype framing.

Reference pair — what passes vs. what doesn't:
- PASSES (approved mockup, Northlane): "northlane.io currently tells a Ruler story: the hero
  opens with a feature list — 'run your whole team from one screen' — presented like an
  authority's pitch instead of a result being handed to you." Specific quoted phrase, no
  hedging, names the mechanism.
- FAILS (real Stripe test output): "the journey quickly stalls under abstract messaging and
  repetitive content... repeated quotes and unclear cost structures create friction rather than
  confidence." No quoted detail, no named specific, all hedge/summary language.

THE SIX ARCHETYPES — pattern and detection signals for each:

Hero — Pattern: Leads with an outcome. Proves itself through results and speed. The visitor is
told what they'll achieve, not what the product contains. Detect: Headline names a concrete
result or outcome, not a category or feature. CTA language is action/achievement-oriented.
Proof comes via speed/results metrics, not scale.

Sage — Pattern: Leads with expertise. Teaches before it sells. The visitor is offered
understanding or insight as the hook. Detect: Headline poses a question or promises
clarity/insight. Content-heavy above the fold. Thought-leadership or advisory tone rather than
a direct pitch.

Outlaw — Pattern: Leads by rejecting the status quo. Positions itself against an incumbent or a
broken norm. Detect: Headline names what's wrong with the old way before naming the product.
Irreverent or challenger tone. Explicit or implicit comparison to a status quo.

Caregiver — Pattern: Leads with protection and support. Reduces the visitor's risk or worry
rather than exciting them. Detect: Headline emphasizes safety, support, or being taken care of.
Softer, reassuring tone. Risk-reduction language (guarantees, no-commitment, support-first).

Creator — Pattern: Leads with possibility. Invites the visitor to build, customize, or make
something, rather than consume a fixed offering. Detect: Headline emphasizes creation,
customization, or craft. Tool/canvas/building language. Visitor is positioned as the maker,
product as the material.

Ruler — Pattern: Leads with authority and scale. Proves itself through exclusivity, polish, and
category leadership. Detect: Headline names scale, infrastructure, or category leadership.
Polished, formal tone. Enterprise/authority language, proof via prestige rather than speed or
outcome.
`.trim();
