 'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="auth"><section className="authcard"><p className="kicker">CAPTION ARCHIVE</p><h1>Unable to load.</h1><p>The request could not be completed. Please try again.</p><button className="primary" onClick={reset}>Try again</button></section></main>}
