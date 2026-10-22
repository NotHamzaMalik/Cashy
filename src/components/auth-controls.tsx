'use client';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
export default function AuthControls() {
  return <div className="auth-controls">
    <Show when="signed-out"><SignInButton mode="redirect"><button className="button secondary small">Sign in</button></SignInButton></Show>
    <Show when="signed-in"><UserButton /></Show>
  </div>;
}
