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
            <li>Choose Quick, Balanced, or Thorough in the AI assistant.</li>
            <li>Generate or fill content, then edit directly in the worksheet.</li>
            <li>Use section locks or scenario-flow state locks to preserve content before re-running AI.</li>
            <li>Click `Export DOCX`, choose the Scenario Flow columns you want, then download the Word file.</li>
          </ol>
          <p className="mt-3 text-sm text-slate-700">
            Note: date fields such as `Date Scenario Developed` and `Date Scenario Updated` use `DD/MM/YYYY`.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">2. Workspace Layout</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Use the section navigation to work through all 15 sections. On a phone, use the Section menu.</li>
            <li>Center panel: the editable SIMTAC worksheet with dynamic rows.</li>
            <li>Right panel: AI controls, section locks, and scenario-flow state locks.</li>
            <li>Use View all sections to review the whole worksheet, or focus on one section at a time.</li>
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
            <li>Use Fill missing fields to complete blank areas.</li>
            <li>Use Fill with AI when you want targeted completion of one section only.</li>
          </ol>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">6. Locks and Safe Regeneration</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Section locks are controlled from the AI assistant’s Section protection panel.</li>
            <li>Scenario-flow states can be locked individually using `Lock state` on each state card.</li>
            <li>Locked sections and locked states are clearly shown for quick visual confirmation.</li>
            <li>These locks are respected during `Generate`, `Fill`, and `Update Unlocked with AI` operations.</li>
            <li>`Update Unlocked with AI` opens a popup for extra instructions before running.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">7. Scenario Flow and Clinical Logic</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Use `+ Add state` / `Remove` to build scenario progression.</li>
            <li>Use the up/down arrows on each state card to reorder the scenario flow.</li>
            <li>Each state includes vital signs, investigations, expected actions, remarks, instructor control, and transition rule.</li>
            <li>Scenario Flow long-text fields wrap and auto-expand so full content remains visible while editing.</li>
            <li>`Physical exam (Displayed on SimMan only)` is for simulator-rendered findings aligned to SimMan capabilities.</li>
            <li>`Physical exam (Volunteered by instructor)` is for findings/history provided verbally by facilitator or confederates.</li>
            <li>This split is preserved in the DOCX export.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">8. AI Controls</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Quick uses the least reasoning. Balanced is a good starting point. Thorough spends more time on complex scenarios.</li>
            <li>Model selection is fixed by app configuration and not editable in the UI.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">9. Scenario Flow Export Options</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>When you click `Export DOCX`, a popup lets you choose which Scenario Flow columns to include.</li>
            <li>Use `Select all` or `Unselect all` for faster export setup.</li>
            <li>Section `9. Scenario Flow` and Section `10. Equipment` export in landscape for better table readability.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">10. Simulation Images (Section 15)</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Enter a prompt, choose `Size` and `Quality`, then click `Generate New Image`.</li>
            <li>Use `Refine Latest Image` or `Refine This` to iterate from current outputs.</li>
            <li>Do not use image generation for XRs or ECGs.</li>
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
            <li>You can choose which Scenario Flow columns to include before download.</li>
            <li>Scenario Flow and Equipment tables automatically expand/shrink to current row counts.</li>
            <li>Scenario Flow table entries export with proper paragraph breaks inside table cells.</li>
            <li>Generated images are included in an appendix section.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">12. Session, Storage, and Security</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
            <li>Site access is password-protected.</li>
            <li>Drafts save on this device. Check the save status in the header; download a backup if storage is full.</li>
            <li>Download backup saves a JSON copy including images and protection settings. Import backup checks the file before asking to replace your draft.</li>
            <li>Changing creation mode keeps your draft. Reset All clears it after confirmation.</li>
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
