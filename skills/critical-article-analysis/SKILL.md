---
name: critical-article-analysis
description: >
  Critically analyze articles, blog posts, essays, opinion pieces, and long-form content. Use this skill whenever the user shares a URL or article text and wants deep, thoughtful analysis — not just a summary. Triggers include: "analyze this article", "what do you think about this piece", "read this critically", "break down this article", "what's missing from this argument", sharing a URL with a request for thoughts/insights/takeaways, or asking for action items after reading something. Also use when the user asks Claude to challenge their thinking about something they've read, or wants to understand both sides of an argument presented in an article. This skill goes beyond summarization — it produces structured critical thinking that helps the user extract maximum value and develop their own informed perspective.
---

# Critical Article Analysis

This skill produces deep, structured critical analysis of articles and long-form content. The goal is twofold: help the user extract genuine insight from what they read, AND challenge them to think independently rather than passively absorbing the author's framing.

## Core Philosophy

Good critical analysis isn't about being contrarian — it's about being *thorough*. The best analyses:
- Steel-man the author's arguments before questioning them
- Identify what's genuinely novel vs. what's repackaged conventional wisdom
- Surface the invisible frames and assumptions the author operates within
- Connect the content to the reader's actual life and decisions
- Leave the reader thinking harder, not just feeling informed

## When to Use This Skill

Activate whenever:
- A user shares a URL or article text and asks for analysis, insights, takeaways, or critique
- A user asks "what should I think about this" or "what's your take on this article"
- A user wants to understand what's missing from an argument
- A user asks for actionable advice after reading something
- A user wants to be challenged to think critically about something they've read

## Workflow

### Step 1: Read the Article Thoroughly

If the user provides a URL, use `web_fetch` to retrieve the full article text. Read the entire piece before beginning analysis — don't start writing after skimming the opening.

### Step 2: Identify the Analytical Dimensions

Before writing, mentally map out:
- **The author's core thesis** — what is the single strongest claim being made?
- **The author's identity and incentives** — who are they, what do they gain from this narrative?
- **The evidence structure** — what's based on data, what's anecdotal, what's speculative?
- **The emotional architecture** — what feelings is the piece designed to produce, and how?
- **The audience** — who is this written for, and how does that shape what's included/excluded?

### Step 3: Produce the Five-Part Analysis

Structure the response around these five questions, using markdown headers (##) for each section:

---

#### 1. Important Insights ("What are the important insights you learned from this article?")

Identify 3-5 genuinely important insights — not a summary of the article, but the *ideas that matter most*. Prioritize:
- Claims backed by concrete evidence or data
- Novel framings that recontextualize a familiar topic
- Connections the author draws that aren't obvious
- Information asymmetries the author reveals (things insiders know that outsiders don't)

For each insight, briefly explain *why* it matters — don't just restate what the author said. The user should understand the significance, not just the content.

Avoid restating the author's rhetoric or emotional appeals as "insights." An insight is a piece of knowledge or framing that changes how you think, not just something that sounds compelling.

#### 2. Valid Alternative Points ("What are the valid alternative points which are missing from this article?")

This is the most important section for developing the reader's critical thinking. Surface 4-6 perspectives, counterarguments, or considerations the article omits or underweights. Categories to consider:

- **Structural omissions**: What evidence or data would complicate the narrative? What relevant research or expert opinion is absent?
- **Incentive analysis**: How does the author's position, profession, or financial interest shape the framing? This isn't about dismissing them — it's about calibrating how much weight to give the argument.
- **Selection and survivorship bias**: Whose experiences are centered? Whose are missing? Are the examples representative or cherry-picked?
- **Mechanism gaps**: Does the article explain *that* something is happening but not *how* or *why*? Does it conflate capability with deployment, possibility with probability?
- **Historical and comparative context**: Have similar predictions been made before? What happened? What does the relevant academic or empirical literature say?
- **Unstated assumptions**: What does the author take as given that a reasonable person might question?

Be specific. "The article is one-sided" is not useful. "The article claims X will happen within Y years, but doesn't address Z constraint which has historically slowed similar transitions" is useful.

Always steel-man the author: acknowledge what they get right even while identifying what's missing.

#### 3. Biggest Takeaways ("What are the biggest takeaways from this article?")

Distill 3-4 takeaways that synthesize the article's strongest points WITH the critical analysis from section 2. These should represent what a thoughtful reader should actually *carry away* — not just what the author wants them to believe, but a balanced, calibrated understanding.

Good takeaways often look like: "The directional claim [X] is probably right, but the timeline/magnitude is uncertain because [Y]. The key variable to watch is [Z]."

Distinguish between:
- What's almost certainly true
- What's plausible but uncertain
- What's speculative or aspirational

#### 4. Actionable Advice ("What action should I take, or what advice would you give me after reading this article?")

This section should be **personalized to the user** whenever possible. If Claude has context about the user's profession, interests, goals, or situation (from memory or the conversation), tailor the advice specifically to them.

Provide 4-6 concrete, actionable recommendations. Good advice is:
- **Specific**: "Spend 1 hour this week trying X" beats "consider exploring X"
- **Calibrated**: Distinguish between "do this immediately" and "keep this on your radar"
- **Honest about uncertainty**: If the article's predictions are speculative, the advice should hedge accordingly — don't tell someone to upend their career based on one person's blog post
- **Balanced between offense and defense**: Both "how to take advantage of this" and "how to protect yourself if this is right"

If there's not enough context to personalize, provide general advice organized by reader profile (e.g., "If you're in [field]..." or "If you're early in your career...").

#### 5. Questions for Critical Reflection ("What should I be reflecting on or asking questions to think critically about it?")

Provide 5-7 provocative questions designed to push the reader's thinking further. These should NOT be generic ("what do you think?") but specific to the article's claims and blind spots.

Good reflection questions:
- Challenge the reader to test the article's claims against their own experience
- Ask about the author's incentives and framing choices
- Probe the boundary conditions ("Under what circumstances would this argument break down?")
- Invite the reader to define their own evidence thresholds ("What would change your mind?")
- Connect the article's themes to the reader's own decisions and situation
- Ask what the article would look like if written by someone with the opposite incentive

End with a brief (2-3 sentence) synthesis that captures the overall analytical verdict — is this article broadly reliable, directionally correct but overstated, thought-provoking but one-sided, etc.

---

## Style and Tone Guidelines

### Non-Negotiable Principles

- **Be pragmatic and grounded.** Every insight, takeaway, and piece of advice should connect to reality. Avoid abstract theorizing or grand pronouncements that sound smart but don't help the reader make better decisions. Ask yourself: "Would this be useful to someone making real choices about their career, finances, or life?" If not, cut it.
- **Be candid and clear, not long-winded.** Say what you mean directly. Don't pad analysis with hedging language, throat-clearing, or filler to seem more thorough. A sharp two-sentence insight beats a bloated paragraph that circles the same point. If a section only needs three bullet points, write three — don't stretch to six for the sake of looking comprehensive.
- **Be honest. Never hallucinate or fabricate.** If you don't know something, say so plainly. If you're uncertain about a claim, flag the uncertainty rather than presenting it with false confidence. "I'm not sure about this, but..." is always better than making something up. Don't invent statistics, misattribute quotes, or speculate about facts you can't verify. It's fine — and often more valuable — to say "I don't have enough context to assess this claim" than to bluff.

### General Style

- Write in a direct, conversational tone — this is a smart friend helping you think, not an academic paper
- Use horizontal rules (---) to visually separate the five sections
- Bold key phrases sparingly for scannability, but don't over-format
- Keep each section substantive but focused — aim for quality of insight over volume
- Don't be sycophantic toward the article OR reflexively contrarian — be genuinely balanced
- Use concrete examples and specifics, not vague generalities
- If the article is about a domain Claude has deep knowledge in, bring that knowledge to bear — don't just analyze the rhetoric, engage with the substance
- If the article references data, studies, or claims that can be verified, note which are verifiable vs. which are assertions

## Personalization

When Claude has context about the user (from memory, conversation history, or stated details), actively weave that into the analysis — especially in sections 4 (Advice) and 5 (Reflection Questions). The analysis should feel like it was written *for this specific person*, not for a generic reader.

## Edge Cases

- **If the article is behind a paywall**: Acknowledge this and work with whatever content is available. Don't fabricate content.
- **If the article is very short** (< 500 words): Compress the analysis proportionally. Not every piece warrants a 2000-word breakdown.
- **If the article is satire or humor**: Note this and analyze the underlying argument being made through the comedic frame.
- **If the article has obvious factual errors**: Flag them clearly in section 2, with corrections if Claude can provide them.
- **If the user shares multiple articles**: Analyze each separately unless they ask for a comparative analysis, in which case add a synthesis section.
