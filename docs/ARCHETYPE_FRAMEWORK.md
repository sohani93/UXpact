# UXpact — Six Story Archetypes Framework

This is a reference document, not a contract or a spec. The diagnosis prompt (`run-audit`'s
journey/narrative generation call) must load or embed this file's content directly — not
paraphrase it from memory — so every generated narrative is grounded in the same definitions,
not reinvented per call.

---

## Why this file exists

The Stripe test audit produced a narrative that was structurally correct (real archetype
identified, real journey stages referenced) but stylistically weak — hedgy, generic, no
concrete quoted detail from the actual page. That's not random model variance. Nobody had
written down what each archetype actually sounds like, or what "good" versus "bad" output
looks like. This file is that definition.

---

## Narrative quality bar — applies to every diagnosis, every archetype, no exceptions

A generated narrative verdict must:

1. **Name at least one real, specific detail from the actual audited page** — a phrase close
   to the site's real copy, a specific repeated element, a specific named section. Not a
   category description ("repeated quotes create friction") — the actual thing ("the same
   Mindbody testimonial appears four times").
2. **Avoid hedge language** — no "may," "could," "consequently," "as they look for." State
   what is happening, plainly, as fact.
3. **Stay to 2–3 sentences**, current-archetype-to-target-archetype framing.

**Reference pair — what passes vs. what doesn't:**

- ✅ *Passes* (approved mockup, Northlane): "northlane.io currently tells a Ruler story: the
  hero opens with a feature list — 'run your whole team from one screen' — presented like an
  authority's pitch instead of a result being handed to you." — Specific quoted phrase, no
  hedging, names the mechanism.
- ❌ *Fails* (real Stripe test output): "the journey quickly stalls under abstract messaging
  and repetitive content... repeated quotes and unclear cost structures create friction rather
  than confidence." — No quoted detail, no named specific, all hedge/summary language.

Tester verification for the Diagnosis checkpoint must check generated narratives against this
bar directly — not just check that a narrative exists and is non-empty.

---

## The six archetypes

Each entry: the story pattern in messaging terms, and the concrete signals that indicate a
site is currently telling that story.

### Hero
**Pattern:** Leads with an outcome. Proves itself through results and speed. The visitor is
told what they'll achieve, not what the product contains.
**Detect:** Headline names a concrete result or outcome, not a category or feature. CTA
language is action/achievement-oriented. Proof comes via speed/results metrics, not scale.

### Sage
**Pattern:** Leads with expertise. Teaches before it sells. The visitor is offered
understanding or insight as the hook.
**Detect:** Headline poses a question or promises clarity/insight. Content-heavy above the
fold. Thought-leadership or advisory tone rather than a direct pitch.

### Outlaw
**Pattern:** Leads by rejecting the status quo. Positions itself against an incumbent or a
broken norm.
**Detect:** Headline names what's wrong with the old way before naming the product. Irreverent
or challenger tone. Explicit or implicit comparison to a status quo.

### Caregiver
**Pattern:** Leads with protection and support. Reduces the visitor's risk or worry rather
than exciting them.
**Detect:** Headline emphasizes safety, support, or being taken care of. Softer, reassuring
tone. Risk-reduction language (guarantees, no-commitment, support-first).

### Creator
**Pattern:** Leads with possibility. Invites the visitor to build, customize, or make
something, rather than consume a fixed offering.
**Detect:** Headline emphasizes creation, customization, or craft. Tool/canvas/building
language. Visitor is positioned as the maker, product as the material.

### Ruler
**Pattern:** Leads with authority and scale. Proves itself through exclusivity, polish, and
category leadership.
**Detect:** Headline names scale, infrastructure, or category leadership. Polished, formal
tone. Enterprise/authority language, proof via prestige rather than speed or outcome.

---

## How this gets used

The diagnosis prompt must include this file's archetype definitions and the quality bar
verbatim as part of its system context — not a paraphrase, not "the AI already knows what
archetypes are." Regenerate the Stripe test audit after this is wired in and compare the new
narrative against the pass/fail reference pair above before marking Diagnosis's Tester
verification complete.
