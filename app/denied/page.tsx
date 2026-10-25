import {logout} from '@/app/actions';
export const dynamic='force-dynamic';
export default function Denied(){return <main className="auth"><section className="authcard"><p className="kicker">ACCESS DENIED</p><h1>Not authorized<span className="accent">.</span></h1><p>Your Google account does not have administrator access. Sign out to choose another account.</p><form action={logout}><button className="primary">Sign out →</button></form></section></main>}
