import './globals.css';
// VERCEL_URL is this deployment's own commit-specific address, used for submissions.
export const metadata={title:'Caption Archive | Control Room',description:'Private content and engagement operations',other:{'deployment-url':process.env.VERCEL_URL??'local'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
