'use client';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
export default function AuthControls() {
  return <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:12,padding:'8px 24px',position:'relative',zIndex:45,background:'var(--surface)',borderBottom:'1px solid var(--line)'}}>
    <span style={{fontSize:11,color:'var(--muted)'}}>Cashy account · demo data remains browser-local</span>
    <Show when="signed-out"><SignInButton mode="redirect"><button className="button secondary small">Sign in</button></SignInButton></Show>
    <Show when="signed-in"><UserButton /></Show>
  </div>;
}
