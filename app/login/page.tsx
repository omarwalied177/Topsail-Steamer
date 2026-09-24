"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter(); const params = useSearchParams();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState<string|null>(null); const [loading,setLoading]=useState(false); const [showPassword,setShowPassword]=useState(false);
  async function handleSubmit(e:React.FormEvent){e.preventDefault();setError(null);setLoading(true);const result=await signIn("credentials",{email,password,redirect:false});setLoading(false);if(result?.error){setError("That email or password isn't right. Try again.");return;}router.push(params.get("callbackUrl")||"/dashboard/leads");}
  return <div className="login-page"><div className="login-card"><img src="/topsail-logo.jpeg" alt="Topsail Steamer" className="login-logo"/><p className="login-eyebrow">Operations Dashboard</p><h1 className="font-display login-title">Staff Sign In</h1><p className="login-copy">Access the Topsail Steamer operations dashboard.</p><form onSubmit={handleSubmit} className="login-form"><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<div className="password-wrap"><input type={showPassword?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="password-icon" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?"Hide password":"Show password"}>◉</button></div></label>{error&&<p className="login-error">{error}</p>}<button type="submit" disabled={loading} className="login-submit">{loading?"Signing in…":"Sign In"}</button></form><p className="login-signup">Need an account? <a href="/signup">Sign up</a></p></div></div>;
}
export default function LoginPage(){return <Suspense fallback={null}><LoginForm/></Suspense>}
