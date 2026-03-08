export default function HelpPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7fbff_0%,#f8f6f1_45%,#f3f3f0_100%)] px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">SIMTAC AI Scenario Builder: Getting Started</h1>
          <p className="mt-2 text-sm text-slate-700">
            Welcome. This guide helps you build high-quality, Singapore-context simulation scenarios quickly and confidently, from first draft to export-ready DOCX.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">1. Quick Start (5 Minutes)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-800">
            <li>Log in with the site password.</li>
            <li>Choose `Create with AI` or `Fill Worksheet`.</li>
            <li>Set `Thinking depth` (`0`, `1`, or `2`) in the right panel.</li>
            <li>Generate or fill content, then edit directly in the worksheet.</li>
            <li>Lock anything you want to preserve before re-running AI.</li>
            <li>Run `Validate` and review warnings.</li>
            <li>Click `Export DOCX` for a Word file you can continue editing.</li>
          </ol>
          <p className="mt-3 text-sm text-slate-700">
            Note: date fields such as `Date Scenario Developed` and `Date Scenario Updated` use `DD/MM/YYYY`.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">2. Workspace Layout</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Left panel: navigation across Sections `1` to `15`, plus this `Getting Started / How To Use` page.</li>
            <li>Center panel: the editable SIMTAC worksheet with dynamic rows.</li>
            <li>Right panel: AI controls, section locks, field locks, state locks, warnings, and source grounding.</li>
            <li>Use `Hide/Show Left Sidebar` and `Hide/Show Right Sidebar` in the workspace to maximize center editing space.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">3. Singapore Context Defaults</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Scenario generation defaults to Singapore healthcare settings (ward, ED, ICU, OT).</li>
            <li>Language and workflows are aligned to local team structures and escalation practice (for example ISBAR/SBAR).</li>
            <li>Clinical values and documentation style are generated in practical hospital simulation format.</li>
            <li>Image generation is also grounded to Singapore simulation context by default.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">4. Mode A: Create with AI</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-800">
            <li>Use `Scenario Prompt` to describe diagnosis, progression, expected learner actions, and debrief goals.</li>
            <li>Click `Generate Scenario` at the bottom of the prompt box.</li>
            <li>Review and adjust any fields manually.</li>
            <li>Use `Update Unlocked with AI` to regenerate only unlocked content.</li>
            <li>When prompted, add specific instructions so updates target exactly what you want to improve.</li>
          </ol>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">5. Mode B: Fill Worksheet</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-800">
            <li>Fill key fields first, such as scenario title, patient profile, and learning focus.</li>
            <li>Use `Fill Missing (Whole Form)` to complete blank areas.</li>
            <li>Use `AI Fill Section` when you want targeted completion of one section only.</li>
          </ol>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">6. Locks and Safe Regeneration</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Section locks are controlled from the right `Section Locks` panel.</li>
            <li>Field lock: click any field, then use `Lock selected` in `Field Locks`.</li>
            <li>Scenario flow states can be locked individually using `Lock state` on each state card.</li>
            <li>Locked fields and locked states are shaded for quick visual confirmation.</li>
            <li>All locks are respected during `Generate`, `Fill`, and `Update Unlocked with AI` operations.</li>
            <li>`Update Unlocked with AI` opens a popup for extra instructions before running.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">7. Scenario Flow and Clinical Logic</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Use `+ Add state` / `Remove` to build scenario progression.</li>
            <li>Each state includes vital signs, investigations, expected actions, remarks, instructor control, and transition rule.</li>
            <li>Scenario Flow long-text fields wrap and auto-expand so full content remains visible while editing.</li>
            <li>`Physical exam (Displayed on SimMan only)` is for simulator-rendered findings aligned to SimMan capabilities.</li>
            <li>`Physical exam (Volunteered by instructor)` is for findings/history provided verbally by facilitator or confederates.</li>
            <li>This split is used in both validation and DOCX export.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">8. AI Controls</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>`Thinking depth` controls reasoning effort and generation time.</li>
            <li>`0`: fastest drafting.</li>
            <li>`1`: balanced speed and detail.</li>
            <li>`2`: deeper reasoning for complex scenarios and richer progression logic.</li>
            <li>Model selection is fixed by app configuration and not editable in the UI.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">9. Validation and Safety Guardrails</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Use `Validate` to run SimMan compatibility checks.</li>
            <li>Warnings cover unsupported monitor parameters, sound tags, and capability tags.</li>
            <li>If unsupported features are requested, warnings include suggested alternatives.</li>
            <li>`Source Grounding` shows citations from reference materials used during generation.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">10. Simulation Images (Section 15)</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Enter a prompt, choose `Size` and `Quality`, then click `Generate New Image`.</li>
            <li>Use `Refine Latest Image` or `Refine This` to iterate from current outputs.</li>
            <li>Click `Save to Scenario` to attach selected images to this scenario.</li>
            <li>Edit captions and click `Save Caption` to commit each caption.</li>
            <li>`Discard Edit` reverts unsaved caption changes.</li>
            <li>Click any saved image to open a full-size preview popup.</li>
            <li>Saved images are included automatically in the DOCX export image section.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">11. Export and Output</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>`Export DOCX` creates an editable Word file.</li>
            <li>Scenario Flow and Equipment tables automatically expand/shrink to current row counts.</li>
            <li>Generated images are included in an appendix section.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">12. Session, Storage, and Security</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Site access is password-protected.</li>
            <li>Scenario drafts autosave in browser local storage.</li>
            <li>There is no user database and no backend draft database.</li>
            <li>Reference retrieval is managed server-side; library administration is not exposed in the user interface.</li>
            <li>`Reset All` clears the workspace after confirmation.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">13. Troubleshooting and Practical Tips</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>If output is too generic, add explicit constraints and rerun `Update Unlocked with AI`.</li>
            <li>If any content must remain unchanged, lock that section, state, or field first.</li>
            <li>If warnings persist, use alternatives shown in warning cards and validate again.</li>
            <li>If you need non-Singapore context for a specific case, state it explicitly in your prompt.</li>
            <li>If login fails, verify the deployment password configuration.</li>
          </ul>
          <p className="mt-3 text-sm text-slate-700">
            For best results, start with a clear clinical objective, lock what you want to keep, and iterate with short focused update prompts.
          </p>
        </section>
      </div>
    </main>
  );
}
