"use client";

import Image from "next/image";
import Link from "next/link";

export function WorkspaceIcon({ kind, className = "" }: { kind: "spark" | "document" | "arrow" | "back" | "download"; className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "document" || kind === "spark" ? <><path d="M14 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" /><path d="M14 3v5h5M8 11h7M8 15h5" />{kind === "spark" ? <path d="m19 13 1.2 3.8L24 18l-3.8 1.2L19 23l-1.2-3.8L14 18l3.8-1.2z" /> : null}</> : null}
      {kind === "arrow" ? <path d="m9 5 7 7-7 7" /> : null}
      {kind === "back" ? <path d="m15 5-7 7 7 7" /> : null}
      {kind === "download" ? <><path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4" /></> : null}
    </svg>
  );
}

export function WorkspaceHeader({ saveStatus, hasWorkspace, onExport }: { saveStatus: string; hasWorkspace: boolean; onExport: () => void }) {
  return (
    <header className="workspace-header">
      <Link className="workspace-brand" href="/" aria-label="SIMTAC AI Scenario Builder">
        <span className="workspace-monogram" aria-hidden="true">S</span>
        <span><strong>SIMTAC</strong><span>Scenario Builder</span></span>
      </Link>
      <div className="workspace-header-actions">
        <span className="save-status" role="status" aria-live="polite">{saveStatus}</span>
        <a className="ui-button help-link" href="/help" target="_blank" rel="noreferrer">Help</a>
        {hasWorkspace ? <button className="ui-button ui-button-primary" type="button" onClick={onExport}>Export DOCX</button> : null}
        <Image src="/images/ttsh-logo.jpg" alt="Tan Tock Seng Hospital logo" width={496} height={308} className="institution-logo" unoptimized priority />
      </div>
    </header>
  );
}

export function StartScreen({ onChoose, onImport, hasDraft }: { onChoose: (mode: "ai_prompt" | "worksheet_assist") => void; onImport: () => void; hasDraft: boolean }) {
  return (
    <main className="start-screen">
      <div className="start-intro">
        <h1>Build your next simulation.</h1>
        <p>Create a complete SIMTAC worksheet, refine the scenario, and export it for your teaching team.</p>
      </div>
      <div className="start-options">
        <article className="start-option">
          <WorkspaceIcon kind="spark" className="start-icon" />
          <h2>Create with AI</h2>
          <p>Describe the clinical situation, learners, and teaching goals. Start with a complete scenario you can review and refine.</p>
          <button type="button" className="ui-button ui-button-primary" onClick={() => onChoose("ai_prompt")}>Create with AI</button>
        </article>
        <article className="start-option">
          <WorkspaceIcon kind="document" className="start-icon" />
          <h2>Fill Worksheet</h2>
          <p>Start with your own course and patient details. Use AI to fill the gaps while keeping your existing content.</p>
          <button type="button" className="ui-button" onClick={() => onChoose("worksheet_assist")}>Fill Worksheet</button>
        </article>
      </div>
      <div className="start-backup"><p>{hasDraft ? "Your existing draft will be kept when you choose either mode." : "Your draft stays on this device. Download a backup to keep a separate copy."}</p><button type="button" className="ui-text-button" onClick={onImport}>Import backup</button></div>
      <p className="clinical-note">Review clinical content before teaching.</p>
    </main>
  );
}
