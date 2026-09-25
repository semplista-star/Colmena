import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav>
        <div className="wrap">
          <Link href="/dashboard" className="logo"><span className="dot" />COLMENA · panel</Link>
          <div className="dash-nav">
            <Link href="/dashboard">Clientes</Link>
            <Link href="/dashboard/agentes">Agentes</Link>
            <Link href="/" className="hide-sm">Web pública</Link>
          </div>
        </div>
      </nav>
      <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80 }}>{children}</main>
    </>
  );
}
