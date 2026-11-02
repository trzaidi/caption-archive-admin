import Link from 'next/link';
import {logout} from '@/app/actions';
import {NAV_GROUPS} from '@/lib/resources';
export function Shell({children,active,email}:{children:React.ReactNode;active:string;email:string}){
 const crumb=active==='/'?'OVERVIEW':active.slice(1).replaceAll('-',' ').toUpperCase();
 return <div className="layout"><a className="skiplink" href="#main">Skip to content</a><aside className="sidebar"><div className="brand"><div><b>CAPTION ARCHIVE</b><small>ADMINISTRATION</small></div></div><nav aria-label="Admin sections">{NAV_GROUPS.map(g=><div className="navgroup" key={g.label}><div className="navlabel">{g.label}</div>{g.links.map(([href,name])=><Link key={href} href={href} className={active===href?'selected':''} aria-current={active===href?'page':undefined}>{name}<span>↗</span></Link>)}</div>)}</nav><div className="sidebarbottom"><small>AUTHENTICATED ADMIN</small><div className="email">{email}</div><form action={logout}><button className="signout">Sign out ↗</button></form></div></aside><div className="content"><header className="topbar"><span>ARCHIVE / {crumb}</span><span className="pill"><i/> SECURE ACCESS</span></header><main id="main">{children}</main><footer>CAPTION ARCHIVE · ADMIN OPERATIONS <span>CONTENT & COMMUNITY</span></footer></div></div>
}
